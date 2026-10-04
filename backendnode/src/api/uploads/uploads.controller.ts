import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { UploadStatus } from '@prisma/client';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import {
  CreateUploadResponseDto,
  DeleteUploadResponseDto,
  FindAllUploadsQueryDto,
  UploadResponseDto,
} from './dto/upload-response.dto';
import { UserPlanHelper } from './helpers/user-plan.helper';
import { QuotaService } from './services/quota.service';
import { UploadsService } from './uploads.service';

/**
 * MIME types permitidos por "kind" de upload (defesa em profundidade).
 *
 * Cada slot da UI passa o `kind` como query param, e o backend valida o
 * MIME dentro da allow-list especifica. Sem kind (backward compat), usa
 * `LEGACY_ALLOWED_MIMES` (matriz antiga).
 *
 * Adicao recente (P3-LOGO-RESTRICT): avatar/startup-logo/startup-cover
 * so aceitam JPG/PNG. documento/comprovante aceitam JPG/PNG/PDF (RG,
 * CNH, passaporte, conta de luz em PDF). pitch-deck so PDF.
 */
type UploadKind =
  | 'avatar'
  | 'documento'
  | 'comprovante'
  | 'biofacial'
  | 'startup-logo'
  | 'startup-cover'
  | 'startup-team-photo'
  | 'pitch-deck';

const MAX_PITCH_DECK_SIZE_BYTES = 15 * 1024 * 1024;

const KIND_ALLOWED_MIMES: Record<UploadKind, readonly string[]> = {
  avatar: ['image/jpeg', 'image/png'],
  documento: ['image/jpeg', 'image/png', 'application/pdf'],
  comprovante: ['image/jpeg', 'image/png', 'application/pdf'],
  biofacial: ['video/mp4', 'video/webm'],
  'startup-logo': ['image/jpeg', 'image/png'],
  'startup-cover': ['image/jpeg', 'image/png'],
  'startup-team-photo': ['image/jpeg', 'image/png'],
  'pitch-deck': ['application/pdf'],
};

/**
 * Matriz legacy para chamadas sem `?kind=`. Mantida para backward compat
 * (outros fluxos que podem usar /uploads com webp/gif/video/docs).
 */
const LEGACY_ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Valida se o MIME type eh permitido para o `kind` informado. Se `kind`
 * for vazio, cai para a matriz legacy (backward compat).
 *
 * @param mimeType - MIME type do arquivo
 * @param kind      - tipo de upload (avatar, documento, etc); opcional
 * @returns true se permitido
 */
function normalizeMimeType(mimeType: string): string {
  return mimeType.split(';', 1)[0].trim().toLowerCase();
}

type ProfileUploadField =
  | 'avatar_upload_id'
  | 'documento_upload_id'
  | 'comprovante_upload_id'
  | 'biofacial_upload_id';

const PROFILE_FIELD_BY_KIND: Partial<Record<UploadKind, ProfileUploadField>> = {
  avatar: 'avatar_upload_id',
  documento: 'documento_upload_id',
  comprovante: 'comprovante_upload_id',
  biofacial: 'biofacial_upload_id',
};

function isKnownUploadKind(kind: string): kind is UploadKind {
  return Object.prototype.hasOwnProperty.call(KIND_ALLOWED_MIMES, kind);
}

function isAllowedMime(mimeType: string, kind?: UploadKind): boolean {
  const normalizedMimeType = normalizeMimeType(mimeType);
  if (kind) {
    return KIND_ALLOWED_MIMES[kind].includes(normalizedMimeType);
  }
  return LEGACY_ALLOWED_MIMES.includes(normalizedMimeType);
}

/**
 * Lista de MIME types formatada para mensagem de erro.
 */
function getAllowedMimesForMessage(kind?: UploadKind): readonly string[] {
  return kind ? KIND_ALLOWED_MIMES[kind] : LEGACY_ALLOWED_MIMES;
}

@ApiTags('Uploads')
@Controller('uploads')
// Pula o throttler nomeado "email" (5/h, herdado do AuthModule global).
// O throttler "email" foi desenhado para rotas de auth (validate-email etc)
// mas o @nestjs/throttler v5 aplica TODOS os throttlers do array forRoot
// globalmente. Sem este SkipThrottle, o "email" bloqueia /uploads apos
// 5 reqs/h mesmo sem auth. O "default" (100/min) continua ativo para DoS.
// @see scripts/PRD_UPLOAD_DE_ARQUIVOS.md §8 (Análise Técnica)
@SkipThrottle({ email: true })
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly uploadsService: UploadsService,
    private readonly quotaService: QuotaService,
    private readonly userPlanHelper: UserPlanHelper,
    private readonly cookiesService: CookiesService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Upload de arquivo multipart.
   *
   * Persiste o arquivo original, calcula SHA-256 para deduplicacao,
   * processa as variantes de forma síncrona e retorna 200 OK com status READY.
   *
   * @param file - Arquivo enviado via multipart/form-data
   * @returns 200 OK com id, status READY e URLs públicas das variantes
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  // O upload é público. Quando houver uma sessão válida, ela é usada apenas
  // para associar o arquivo ao usuário e preservar a validação de posse no
  // PATCH do perfil; visitantes continuam podendo enviar arquivos.
  @UseGuards(ThrottlerGuard)
  @ApiOperation({
    summary: 'Upload de arquivo (multipart)',
    description:
      'Recebe arquivo via multipart/form-data. Persiste o original, processa variantes de imagem de forma síncrona e retorna 200 OK com URLs públicas estáveis. ' +
      'Documentos repetem a URL original nas três colunas; vídeos só possuem variantes quando houver transcodificação real disponível. ' +
      'Limitado por QuotaService (FREE: 50/h, 500MB storage; PRO: 200/h, 5GB storage). ' +
      'Rate limit global NestJS Throttler (100 req/min por IP) cobre DoS.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Upload processado e pronto para uso.',
    type: CreateUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Arquivo invalido ou MIME nao permitido.',
  })
  @ApiResponse({
    status: 413,
    description: 'Arquivo excede limite de tamanho ou quota do plano.',
  })
  @ApiResponse({
    status: 429,
    description:
      'Rate limit global NestJS Throttler excedido (100 req/min por IP).',
  })
  @ApiResponse({
    status: 503,
    description:
      'Falha ao armazenar o arquivo no storage (S3 não confirmou o objeto).',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: string,
  ): Promise<{ success: boolean; data: CreateUploadResponseDto }> {
    if (!file) {
      throw new BadRequestException('Arquivo obrigatorio');
    }

    const normalizedKind = kind?.trim() || undefined;
    if (normalizedKind && !isKnownUploadKind(normalizedKind)) {
      throw new BadRequestException(
        `Tipo de upload inválido: ${normalizedKind}.`,
      );
    }

    const typedKind = normalizedKind as UploadKind | undefined;
    const normalizedMimeType = normalizeMimeType(file.mimetype);
    if (!isAllowedMime(normalizedMimeType, typedKind)) {
      const allowed = getAllowedMimesForMessage(typedKind);
      const kindLabel = typedKind ? ` para ${typedKind}` : '';
      throw new BadRequestException(
        `Tipo de arquivo nao permitido: ${normalizedMimeType}${kindLabel}. ` +
          `Tipos aceitos${kindLabel}: ${allowed.join(', ')}`,
      );
    }

    if (typedKind === 'pitch-deck' && file.size > MAX_PITCH_DECK_SIZE_BYTES) {
      throw new PayloadTooLargeException(
        'O Pitch Deck excede o tamanho máximo de 15MB.',
      );
    }

    // O browser pode enviar o codec no MIME (ex.: video/webm;codecs=vp9).
    // Persistimos apenas o MIME base para manter tipo, bucket e extensão
    // consistentes no UploadsService e nas URLs persistidas.
    file.mimetype = normalizedMimeType;

    // A sessão é opcional: não bloqueia a rota pública, mas permite que o
    // Profile associe o upload ao próprio usuário e passe na validação de posse.
    const userId = await this.resolveOptionalUserId(req);

    // T3: checar quota por plano (FREE/PRO) antes de persistir quando o
    // upload puder ser associado a um usuário autenticado.
    if (userId !== undefined) {
      const plan = await this.userPlanHelper.getPlan(userId);
      await this.quotaService.checkQuota(userId, undefined, file.size, plan);
    }

    const result = await this.uploadsService.create(file, userId);

    // A disponibilidade do objeto e o processamento síncrono já foram
    // concluídos em create(). Se o storage falhar, o registro FAILED é
    // convertido em erro HTTP para o cliente tratar.
    if (result.status === UploadStatus.FAILED) {
      throw new ServiceUnavailableException(
        result.rejectionReason ??
          'Falha ao armazenar o arquivo. Tente novamente.',
      );
    }

    return {
      success: true,
      data: {
        id: result.id,
        publicId: result.publicId,
        url: result.url,
        url_md: result.url_md,
        url_web: result.url_web,
        // O upload é genérico, mas o Profile recebe o campo exato para
        // enviar no PATCH somente após o upload alcançar READY.
        profileField: typedKind ? PROFILE_FIELD_BY_KIND[typedKind] : undefined,
      },
    };
  }

  /**
   * Lista uploads com paginacao.
   *
   * @param query - Parametros de paginacao e filtro
   * @returns Lista paginada de uploads
   */
  @Get()
  @ApiOperation({
    summary: 'Lista uploads (paginado)',
    description:
      'Retorna lista paginada de uploads com filtros opcionais por status e tipo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de uploads.',
  })
  async findAll(@Query() query: FindAllUploadsQueryDto): Promise<{
    success: boolean;
    data: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const result = await this.uploadsService.findAll({
      page,
      limit,
      status: query.status,
      type: query.type,
    });

    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Retorna status e URLs públicas persistidas; não gera URLs temporárias.
   */
  @Get(':id/status')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Status de processamento do upload autenticado',
    description:
      'Retorna status, motivo de rejeição e URLs públicas persistidas somente após READY.',
  })
  @ApiParam({ name: 'id', description: 'ID numerico do upload' })
  @ApiResponse({ status: 200, description: 'Status do upload retornado.' })
  @ApiResponse({ status: 404, description: 'Upload não encontrado.' })
  async getStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<{ success: boolean; data: unknown }> {
    const user = (req as any).user as { id?: number } | undefined;
    if (!user?.id) {
      throw new BadRequestException('Usuário não autenticado');
    }

    const upload = await this.uploadsService.getStatusForUser(id, user.id);
    if (!upload) {
      throw new NotFoundException('Upload não encontrado');
    }

    return { success: true, data: upload };
  }

  /**
   * Retorna detalhes de um upload pelo ID.
   *
   * @param id - ID numerico do upload
   * @returns Detalhes do upload incluindo variants
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Detalhes de upload por ID',
    description:
      'Retorna detalhes completos incluindo variantes e URLs públicas persistidas.',
  })
  @ApiParam({ name: 'id', description: 'ID numerico do upload' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes do upload.',
    type: UploadResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Upload nao encontrado.' })
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean; data: any }> {
    const upload = await this.uploadsService.findOne(id);

    if (!upload) {
      throw new BadRequestException('Upload nao encontrado');
    }

    return {
      success: true,
      data: upload,
    };
  }

  /**
   * Lista uploads de um usuario.
   *
   * @param userId - ID numerico do usuario
   * @returns Lista de uploads do usuario
   */
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Lista uploads por usuario',
    description: 'Retorna todos os uploads associados a um usuario.',
  })
  @ApiParam({ name: 'userId', description: 'ID numerico do usuario' })
  @ApiResponse({ status: 200, description: 'Lista de uploads do usuario.' })
  async findByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<{ success: boolean; data: any[] }> {
    const uploads = await this.uploadsService.findByUser(userId);

    return {
      success: true,
      data: uploads,
    };
  }

  /**
   * Lista uploads de uma startup.
   *
   * @param startupId - ID numerico da startup
   * @returns Lista de uploads da startup
   */
  @Get('startup/:startupId')
  @ApiOperation({
    summary: 'Lista uploads por startup',
    description: 'Retorna todos os uploads associados a uma startup.',
  })
  @ApiParam({ name: 'startupId', description: 'ID numerico da startup' })
  @ApiResponse({ status: 200, description: 'Lista de uploads da startup.' })
  async findByStartup(
    @Param('startupId', ParseIntPipe) startupId: number,
  ): Promise<{ success: boolean; data: any[] }> {
    const uploads = await this.uploadsService.findByStartup(startupId);

    return {
      success: true,
      data: uploads,
    };
  }

  private async resolveOptionalUserId(
    req: Request,
  ): Promise<number | undefined> {
    const sessionId = this.cookiesService.getSessionId(req);
    if (!sessionId) return undefined;

    try {
      const session = (await this.sessionService.getSession(sessionId)) as {
        id?: number;
      } | null;
      return typeof session?.id === 'number' && Number.isInteger(session.id)
        ? session.id
        : undefined;
    } catch (error) {
      // A indisponibilidade da sessão não deve transformar uma rota pública em
      // 401/5xx; o upload continua público e sem associação de usuário.
      this.logger.warn(
        `Não foi possível resolver a sessão opcional do upload: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return undefined;
    }
  }

  /**
   * Remove um upload.
   *
   * Requer role ADMIN ou COMPLIANCE. Remove logicamente (soft-delete)
   * e remove objetos do storage que nao tenham outras referencias.
   *
   * @param id - ID numerico do upload
   * @param req - Request com usuario autenticado
   * @returns Sucesso da operacao
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Remove upload (ADMIN/COMPLIANCE)',
    description:
      'Remove upload do banco e storage. Requer role ADMIN ou COMPLIANCE.',
  })
  @ApiParam({ name: 'id', description: 'ID numerico do upload' })
  @ApiResponse({
    status: 200,
    description: 'Upload removido.',
    type: DeleteUploadResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acesso negado.' })
  @ApiResponse({ status: 404, description: 'Upload nao encontrado.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<{ success: boolean }> {
    const user = (req as any).user as { id: number; role: string };

    if (!user || !['ADMIN', 'COMPLIANCE'].includes(user.role)) {
      throw new BadRequestException(
        'Acesso negado. Requer role ADMIN ou COMPLIANCE.',
      );
    }

    await this.uploadsService.remove(id, user);

    return { success: true };
  }
}
