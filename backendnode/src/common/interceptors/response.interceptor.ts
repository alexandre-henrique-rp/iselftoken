import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseDto } from '../dto/response.dto';

/**
 * Interceptor global para padronizar todas as respostas da API usando ResponseDto.
 *
 * Aplica automaticamente o template para:
 * - Respostas de sucesso (status 2xx).
 * - Respostas de erro (via exception filter).
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ResponseDto<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseDto<T>> {
    return next.handle().pipe(
      map((value) => {
        // Se a resposta já for um ResponseDto, retorna como está
        if (
          value &&
          typeof value === 'object' &&
          'error' in value &&
          'message' in value &&
          'codigo' in value
        ) {
          return value;
        }

        // Detecta se é uma resposta paginada com { data, total, pagina }
        if (
          value &&
          typeof value === 'object' &&
          'data' in value &&
          Array.isArray(value.data)
        ) {
          const { data, total, pagina, ...rest } = value;
          return ResponseDto.success(
            rest.message ?? 'Operação realizada com sucesso.',
            context.switchToHttp().getResponse().statusCode || 200,
            data,
            total,
            pagina,
          );
        }

        // Resposta simples (sucesso)
        return ResponseDto.success(
          'Operação realizada com sucesso.',
          context.switchToHttp().getResponse().statusCode || 200,
          value,
        );
      }),
    );
  }
}
