import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { Response } from 'express';
import { MulterError } from 'multer';
import { ResponseDto } from '../dto/response.dto';

/**
 * Catálogo de tradução de erros conhecidos da EFI (gateway de pagamento).
 *
 * A EFI devolve payloads com shape próprio (code numérico + error string
 * + error_description). Sem este mapeamento, o backend propaga o JSON cru
 * no campo `detalhe` e o usuário vê mensagem ininteligível ("A propriedade
 * [payment_token] informada não existe" etc).
 *
 * Códigos cobertos aqui são os que aparecem no fluxo de produção
 * (PIX imediato + cartão one-step). Demais códigos caem no fallback
 * genérico com status 502 (Bad Gateway) — sinaliza que o problema é no
 * provedor externo, não na nossa API.
 *
 * Referência: https://dev.efipay.com.br/docs/erros/introducao
 */
const EFI_ERROR_CATALOG: ReadonlyArray<{
  match: (value: unknown) => boolean;
  httpStatus: number;
  message: string;
  logAs?: 'warn' | 'error';
}> = [
  {
    // PIX: devedor sem cpf/cnpj / validação de schema Joi da EFI
    match: (v) =>
      typeof v === 'object' &&
      v !== null &&
      (v as any).name === 'json_invalido',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    message:
      'Dados do pagador inválidos para a EFI. Verifique CPF/CNPJ e tente novamente.',
    logAs: 'warn',
  },
  {
    // Genérico: propriedade obrigatória vazia/ausente (ex.: payment_token)
    match: (v) =>
      typeof v === 'object' &&
      v !== null &&
      (v as any).code === 3500010 &&
      (v as any).error === 'property_does_not_exists',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    message:
      'Campo obrigatório ausente na cobrança de cartão. Verifique os dados e tente novamente.',
    logAs: 'warn',
  },
  {
    // Cartão: dados do cartão inválidos (sandbox: final 1)
    match: (v) =>
      typeof v === 'object' &&
      v !== null &&
      (v as any).code === 3500010 &&
      typeof (v as any).error_description === 'string' &&
      ((v as any).error_description as string).includes(
        'Dados do cartão inválidos',
      ),
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'Dados do cartão inválidos.',
    logAs: 'warn',
  },
  {
    // Genérico: validação de campo obrigatório (cpf, birth, etc) — 3500034
    match: (v) =>
      typeof v === 'object' &&
      v !== null &&
      (v as any).code === 3500034 &&
      (v as any).error === 'validation_error',
    httpStatus: HttpStatus.UNPROCESSABLE_ENTITY,
    message:
      'Dados do pagador inválidos. Complete seu perfil (CPF/CNPJ) e tente novamente.',
    logAs: 'warn',
  },
];

/**
 * Detecta se a exception é uma resposta crua da EFI (objeto Axios error.response.data
 * ou objeto com shape {code, error, error_description}) e a traduz para uma
 * HttpException amigável.
 */
function translateEfiError(raw: unknown): {
  status: number;
  message: string;
  detalhe: unknown;
  logAs: 'warn' | 'error';
} | null {
  if (raw === null || typeof raw !== 'object') return null;

  // Itera sobre o catálogo
  for (const entry of EFI_ERROR_CATALOG) {
    if (entry.match(raw)) {
      return {
        status: entry.httpStatus,
        message: entry.message,
        detalhe: raw,
        logAs: entry.logAs ?? 'error',
      };
    }
  }
  return null;
}

/**
 * Extrai o payload EFI de uma exception genérica.
 * Cobre: axios error.response.data, Error com `cause`, ou objeto direto.
 */
function unwrapEfiPayload(exception: unknown): unknown {
  if (exception === null || typeof exception !== 'object') return exception;

  const ex = exception as Record<string, unknown> & {
    response?: { data?: unknown };
    cause?: unknown;
  };

  if (ex.response && typeof ex.response === 'object' && ex.response.data) {
    return ex.response.data;
  }
  if (ex.cause) {
    return unwrapEfiPayload(ex.cause);
  }
  return exception;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ method?: string; originalUrl?: string }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let detalhe: any = undefined;

    const requestContext = `${request?.method ?? '?'} ${request?.originalUrl ?? '?'}`;

    // Tratamento de MulterError (ex: arquivo excede limite de tamanho)
    if (exception instanceof MulterError) {
      if (exception.code === 'LIMIT_FILE_SIZE') {
        status = 413; // REQUEST_ENTITY_TOO_LARGE
        message =
          'Arquivo excede o limite físico de 500MB. Reduza o tamanho e tente novamente.';
      } else {
        status = HttpStatus.BAD_REQUEST;
        message = `Erro no upload: ${exception.message}`;
      }
      const errorResponse = ResponseDto.error(message, status, detalhe);
      response.status(status).json(errorResponse);
      return;
    }

    // Tratamento de HttpException do NestJS (mantido primeiro)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || message;
        detalhe = responseObj.detalhe || responseObj.errors || responseObj;
      }
    } else if (exception instanceof Error) {
      // Tentar traduzir como erro da EFI antes de cair no fallback genérico.
      // O SDK axios normalmente joga o payload EFI em error.response.data;
      // o SDK EFI passa a Error direto (já normalizado pelo httpClient).
      const efiPayload = unwrapEfiPayload(exception);
      const translated = translateEfiError(efiPayload);

      if (translated) {
        status = translated.status;
        message = translated.message;
        detalhe = translated.detalhe;

        if (translated.logAs === 'warn') {
          this.logger.warn(
            `EFI gateway error (translated) [${requestContext}]: status=${status} message=${message}`,
          );
        } else {
          this.logger.error(
            `EFI gateway error [${requestContext}]: status=${status} message=${message}`,
          );
        }
      } else {
        message = exception.message;
        detalhe = exception.stack;
        this.logger.error(
          `Unexpected error: ${exception.message}`,
          exception.stack,
        );
      }
    } else {
      this.logger.error('Unknown exception type', exception);
    }

    if (exception instanceof Error) {
      Sentry.captureException(exception);
    }

    const errorResponse = ResponseDto.error(message, status, detalhe);

    response.status(status).json(errorResponse);
  }
}
