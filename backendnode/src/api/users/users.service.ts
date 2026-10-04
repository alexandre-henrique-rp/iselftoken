import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { BackupService } from 'src/backup/backup.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  pickPublicMePayload,
  pickPublicProfilePayload,
  publicSessionProfileSelect,
} from '../../auth/session/public-payload';
import { SessionService } from '../../auth/session/session.service';
import { AuditService } from '../../common/audit/audit.service';
import { IObjectStorageProvider } from '../../common/storage/object-storage.interface';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { UpdateUserDto } from './dto/update-user.dto';

const userCountrySelect = {
  id: true,
  name: true,
  iso3: true,
  emoji: true,
} as const;

/**
 * Serviço de Usuários (Application Layer)
 *
 * Responsabilidade:
 * - Orquestrar operações CRUD de usuários
 * - Gerenciar consultas paginadas
 * - Retornar dados do usuário autenticado
 *
 * Arquitetura:
 * - Camada de Aplicação (Use Cases)
 * - Utiliza PrismaService para acesso aos dados
 * - Retorna respostas padronizadas via ResponseDto
 *
 * Dependências:
 * - PrismaService: Acesso ao banco de dados
 * - ResponseDto: Padronização de respostas
 * - PayloadEntity: Entidade do usuário autenticado
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly backup: BackupService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly storageProvider: IObjectStorageProvider,
  ) {}

  /**
   * Parse uma presigned URL para extrair bucket e key, e gera uma nova URL.
   *
   * Presigned URLs do S3 seguem o formato:
   * https://{bucket}.s3.{region}.amazonaws.com/{key}?X-Amz-...
   *
   * IMPORTANTE: O bucket na URL já contém o prefixo (ex: iselftoken-prod-image).
   * O storageProvider.bucketName() adiciona prefixo novamente, então precisamos
   * remover o prefixo antes de chamar getPresignedUrl.
   *
   * @param presignedUrl URL presigned existente (pode estar expirada)
   * @returns Nova presigned URL ou null se o parsing falhar
   */
  private async regeneratePresignedUrl(
    presignedUrl: string,
  ): Promise<string | null> {
    try {
      const url = new URL(presignedUrl);
      const hostParts = url.hostname.split('.');
      if (hostParts.length < 3) return null;

      // Bucket completo da URL (pode incluir prefixo, ex: iselftoken-prod-image)
      const fullBucket = hostParts[0];
      const key = url.pathname.startsWith('/')
        ? url.pathname.slice(1)
        : url.pathname;

      if (!fullBucket || !key) return null;

      // Remove o prefixo do bucket para passar ao storageProvider
      // O storageProvider.bucketName() vai adicionar o prefixo de volta
      const prefix = this.storageProvider.getBucketPrefix();
      const bucket =
        prefix && fullBucket.startsWith(prefix + '-')
          ? fullBucket.slice(prefix.length + 1)
          : fullBucket;

      return this.storageProvider.getPresignedUrl(bucket, key, 604800);
    } catch (error) {
      this.logger.warn(
        `Falha ao regenerar presigned URL: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  private async getCountryForUser(
    countryId: number | null | undefined,
  ): Promise<{
    id: number;
    name: string;
    iso3: string;
    emoji: string | null;
  } | null> {
    if (countryId == null) return null;
    return this.prisma.country.findUnique({
      where: { id: countryId },
      select: userCountrySelect,
    });
  }

  private async resolveCountryFields(
    fields: Record<string, unknown>,
  ): Promise<{ valid: boolean; data: Record<string, unknown> }> {
    if (!Object.prototype.hasOwnProperty.call(fields, 'pais')) {
      return { valid: true, data: {} };
    }

    const countryId = fields.pais;
    if (countryId === null) {
      return { valid: true, data: { pais: null, bandeira: null } };
    }

    if (
      typeof countryId !== 'number' ||
      !Number.isInteger(countryId) ||
      countryId <= 0
    ) {
      return { valid: false, data: {} };
    }

    const country = await this.getCountryForUser(countryId);
    if (!country) return { valid: false, data: {} };

    return {
      valid: true,
      data: { pais: country.id, bandeira: country.emoji ?? null },
    };
  }

  private toPublicUser(user: any) {
    const {
      paisCountry: _paisCountry,
      pais_legacy: _paisLegacy,
      ...safeUser
    } = user;
    return {
      ...safeUser,
      ...pickPublicProfilePayload(user),
    };
  }

  /**
   * Retorna os dados do usuário autenticado (payload público).
   *
   * Fonte única de verdade: `req.user` carregado pelo `AuthGuard` a partir
   * de `session:{sessionId}` no Redis. `pickPublicMePayload` projeta para
   * o shape público e descarta explicitamente campos sensíveis.
   *
   * Migração (one-shot): apaga o cache legado em `user:{userId}` populado
   * por versões anteriores do `updateMe`. É idempotente — após a primeira
   * chamada por usuário, a chave some e o delete vira no-op.
   *
   * @param user Entidade do usuário autenticado (vem do AuthGuard)
   */
  async getMe(user: PayloadEntity) {
    try {
      if (!user?.id) {
        return ResponseDto.error('ID do usuário não encontrado no token', 400);
      }

      const userId = user.id.toString();

      // Migração one-shot: remove cache legado em `user:{userId}` que
      // continha o payload gordo (pré-deploy). Idempotente.
      // A partir daqui, /users/me lê diretamente de `session:{sessionId}`
      // e não consulta mais `user:{userId}`.
      const legacyCacheKey = userId;
      const hasLegacyCache =
        await this.sessionService.getUserCache(legacyCacheKey);
      if (hasLegacyCache) {
        await this.sessionService.deleteUserCache(legacyCacheKey);
        this.logger.log(`Cache legado user:{${userId}} invalidado na migração`);
      }

      // Sessões criadas antes da ampliação do contrato não têm as chaves de
      // perfil. Hidrata somente esse caso a partir do banco e mantém a
      // projeção pública única; sessões novas continuam sendo source-of-truth
      // do GET, sem consulta duplicada ao usuário.
      let sessionUser: any = user;
      if (
        !Object.prototype.hasOwnProperty.call(user, 'telefone') ||
        !Object.prototype.hasOwnProperty.call(user, 'avatar') ||
        !Object.prototype.hasOwnProperty.call(user, 'bandeira')
      ) {
        const profile = await this.prisma.user.findUnique({
          where: { id: +userId },
          select: publicSessionProfileSelect,
        });
        if (profile) {
          sessionUser = { ...user, ...profile };
          await this.sessionService.refreshUserProfile(
            +userId,
            pickPublicProfilePayload(profile),
          );
        }
      }

      const publicPayload = pickPublicMePayload(sessionUser);

      const refreshDocumentUrl = async (url: string | null) => {
        if (!url) return url;

        // URLs públicas não possuem query X-Amz e não expiram. Só regenera
        // URLs presigned antigas para manter compatibilidade com registros
        // criados antes deste fluxo.
        const isPresigned =
          /[?&]X-Amz-(?:Algorithm|Signature|Credential|Date|Expires)=/i.test(
            url,
          );
        if (!isPresigned) return url;

        return (await this.regeneratePresignedUrl(url)) ?? url;
      };

      // Regenera apenas URLs presigned antigas; URLs públicas permanecem
      // estáveis e não são substituídas por uma URL temporária.
      const refreshDocumentUrls = async (
        doc: {
          url: string;
          url_sm: string | null;
          url_md: string | null;
          url_web: string | null;
          url_lg: string | null;
        } | null,
      ) => {
        if (!doc) return null;
        return {
          ...doc,
          url: await refreshDocumentUrl(doc.url),
          url_sm: await refreshDocumentUrl(doc.url_sm),
          url_md: await refreshDocumentUrl(doc.url_md),
          url_web: await refreshDocumentUrl(doc.url_web),
          url_lg: await refreshDocumentUrl(doc.url_lg),
        };
      };

      // Atualiza as URLs dos documentos de forma paralela
      const [avatar, comprovante, documento, biofacial] = await Promise.all([
        refreshDocumentUrls(publicPayload.avatar),
        refreshDocumentUrls(publicPayload.comprovante),
        refreshDocumentUrls(publicPayload.documento),
        refreshDocumentUrls(publicPayload.biofacial),
      ]);

      const refreshedPayload = {
        ...publicPayload,
        avatar,
        comprovante,
        documento,
        biofacial,
      };

      return ResponseDto.success(
        'Dados do usuário retornados com sucesso',
        200,
        refreshedPayload,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar dados do usuário', 500, error);
    }
  }

  /**
   * Converte um upload pertencente ao usuário em KYCProfile e vincula o
   * documento ao campo correspondente do perfil. O upload já foi persistido
   * no storage pelo POST; o processamento de variants continua em segundo
   * plano.
   */
  private async createKycProfileFromUpload(
    userId: number,
    uploadId: number,
  ): Promise<{
    data: {
      originalName: string;
      size: number;
      mineType: string;
      extension: string;
      url: string;
      url_sm: string | null;
      url_md: string | null;
      url_web: string | null;
      url_lg: string | null;
      status: 'PENDING';
    };
    mimeType: string;
  }> {
    const upload = await this.prisma.upload.findFirst({
      where: { id: uploadId, userId, deletedAt: null },
      select: {
        id: true,
        originalName: true,
        size: true,
        mimeType: true,
        extension: true,
        bucket: true,
        key: true,
        url: true,
        url_md: true,
        url_web: true,
        status: true,
      },
    });

    if (!upload || !upload.bucket || !upload.key || !upload.url) {
      throw new BadRequestException(
        'Upload não encontrado, sem URL pública ou não pertence ao usuário',
      );
    }

    if (!this.isRenderableUrl(upload.url)) {
      throw new BadRequestException(
        'O upload não possui uma URL pública segura para exibição.',
      );
    }

    const mimeType = upload.mimeType ?? 'application/octet-stream';
    const isDocument =
      mimeType === 'application/pdf' || mimeType.startsWith('application/');
    const urlMd = isDocument ? upload.url : upload.url_md;
    const urlWeb = isDocument ? upload.url : upload.url_web;

    return {
      data: {
        originalName: upload.originalName ?? 'upload',
        size: upload.size ?? 0,
        mineType: mimeType,
        extension: upload.extension ?? 'bin',
        url: upload.url,
        url_sm: isDocument ? upload.url : urlWeb,
        url_md: urlMd,
        url_web: urlWeb,
        url_lg: upload.url,
        status: 'PENDING',
      },
      mimeType,
    };
  }

  private isRenderableUrl(url: unknown): url is string {
    if (typeof url !== 'string' || !url.trim()) return false;

    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  private validateKycSlot(
    mimeType: string,
    slot: string,
    allowedPrefixes: Record<string, string[]>,
  ): boolean {
    const prefixes = allowedPrefixes[slot];
    if (!prefixes || prefixes.length === 0) return true;
    return prefixes.some((prefix) => mimeType.startsWith(prefix));
  }

  /**
   * Atualiza dados do usuário autenticado
   * @name updateMe
   * @description Atualiza os dados do usuário logado no banco de dados
   *
   * @param user Entidade do usuário autenticado (vem do AuthGuard)
   * @param updateUserDto Objeto com campos a serem atualizados
   * @param sessionId Identificador da sessão Redis que originou o PATCH
   */
  async updateMe(
    user: PayloadEntity,
    updateUserDto: UpdateUserDto,
    sessionId?: string,
  ) {
    try {
      const userId = user.id;
      if (!userId) {
        return ResponseDto.error('ID do usuário não encontrado no token', 400);
      }

      // snapshot antes da atualização (para diff de auditoria)
      const oldUser = await this.prisma.user.findUnique({
        where: { id: +userId },
        select: {
          nome: true,
          email: true,
          telefone: true,
          genero: true,
          endereco: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          uf: true,
          cep: true,
          pais: true,
          bandeira: true,
          data_nascimento: true,
        },
      });

      // backup do usuário antes de atualizar
      await this.backup.userBackup(+userId);

      // Campos que podem ser atualizados diretamente no Prisma
      const {
        avatar_id,
        comprovante_id,
        documento_id,
        biofacial_id,
        avatar_upload_id,
        comprovante_upload_id,
        documento_upload_id,
        biofacial_upload_id,
        data_nascimento,
        ...allowedFields
      } = updateUserDto;

      const countryFields = await this.resolveCountryFields(
        allowedFields as Record<string, unknown>,
      );
      if (!countryFields.valid) {
        return ResponseDto.error('País selecionado não foi encontrado', 400);
      }

      const SLOT_ALLOWED_MIME_PREFIXES: Record<string, string[]> = {
        avatar: ['image/'],
        comprovante: ['image/', 'application/pdf'],
        documento: ['image/', 'application/pdf'],
        biofacial: ['video/'],
      };

      const avatarProfile =
        avatar_upload_id !== undefined
          ? await this.createKycProfileFromUpload(+userId, avatar_upload_id)
          : null;
      if (
        avatarProfile &&
        !this.validateKycSlot(
          avatarProfile.mimeType,
          'avatar',
          SLOT_ALLOWED_MIME_PREFIXES,
        )
      ) {
        throw new BadRequestException(
          'Upload do avatar não contém um tipo de arquivo compatível (use JPG/PNG)',
        );
      }

      const comprovanteProfile =
        comprovante_upload_id !== undefined
          ? await this.createKycProfileFromUpload(
              +userId,
              comprovante_upload_id,
            )
          : null;
      if (
        comprovanteProfile &&
        !this.validateKycSlot(
          comprovanteProfile.mimeType,
          'comprovante',
          SLOT_ALLOWED_MIME_PREFIXES,
        )
      ) {
        throw new BadRequestException(
          'Upload do comprovante não contém um tipo de arquivo compatível (use JPG/PNG/PDF)',
        );
      }

      const documentoProfile =
        documento_upload_id !== undefined
          ? await this.createKycProfileFromUpload(+userId, documento_upload_id)
          : null;
      if (
        documentoProfile &&
        !this.validateKycSlot(
          documentoProfile.mimeType,
          'documento',
          SLOT_ALLOWED_MIME_PREFIXES,
        )
      ) {
        throw new BadRequestException(
          'Upload do documento não contém um tipo de arquivo compatível (use JPG/PNG/PDF)',
        );
      }

      const biofacialProfile =
        biofacial_upload_id !== undefined
          ? await this.createKycProfileFromUpload(+userId, biofacial_upload_id)
          : null;
      if (
        biofacialProfile &&
        !this.validateKycSlot(
          biofacialProfile.mimeType,
          'biofacial',
          SLOT_ALLOWED_MIME_PREFIXES,
        )
      ) {
        throw new BadRequestException(
          'Upload do biofacial não contém um tipo de arquivo compatível (use MP4/WebM)',
        );
      }

      // ── B1: ownership check para IDs legados de KYCProfile ───────────
      const legacyIds = [
        { slot: 'avatar', id: avatar_id },
        { slot: 'comprovante', id: comprovante_id },
        { slot: 'documento', id: documento_id },
        { slot: 'biofacial', id: biofacial_id },
      ].filter((e) => e.id != null) as { slot: string; id: number }[];

      if (legacyIds.length > 0) {
        const found = await this.prisma.kYCProfile.findMany({
          where: {
            id: { in: legacyIds.map((e) => e.id) },
          },
          select: { id: true, mineType: true },
        });
        const foundMap = new Map(found.map((p) => [p.id, p]));

        for (const { slot, id } of legacyIds) {
          const profile = foundMap.get(id);
          if (!profile) {
            throw new BadRequestException(
              `KYCProfile #${id} não encontrado para o slot "${slot}"`,
            );
          }

          // B2-A: valida que o tipo do arquivo é compatível com o slot
          const SLOT_ALLOWED_PREFIXES: Record<string, string[]> = {
            avatar: ['image/'],
            comprovante: ['image/', 'application/pdf'],
            documento: ['image/', 'application/pdf'],
            biofacial: ['video/'],
          };
          const allowed = SLOT_ALLOWED_PREFIXES[slot] ?? [];
          const mimeOk = allowed.some((p) =>
            (profile.mineType ?? '').startsWith(p),
          );
          if (!mimeOk) {
            throw new BadRequestException(
              `Tipo de arquivo incompatível com o slot "${slot}": ${profile.mineType}`,
            );
          }
        }
      }

      // Monta o objeto de atualização apenas com campos permitidos
      const prismaUpdateData: any = {
        ...allowedFields,
        ...countryFields.data,
        data_nascimento: data_nascimento
          ? new Date(data_nascimento)
          : undefined,
      };

      // A criação dos perfis KYC e o vínculo no User são uma única unidade de
      // escrita. Assim, um erro em qualquer slot não deixa KYCProfile órfão e
      // jamais atualiza o avatar antes de todas as validações READY/URL.
      const update = await this.prisma.$transaction(async (tx) => {
        const createdAvatarProfile = avatarProfile
          ? await tx.kYCProfile.create({
              data: avatarProfile.data,
              select: { id: true },
            })
          : null;
        const createdComprovanteProfile = comprovanteProfile
          ? await tx.kYCProfile.create({
              data: comprovanteProfile.data,
              select: { id: true },
            })
          : null;
        const createdDocumentoProfile = documentoProfile
          ? await tx.kYCProfile.create({
              data: documentoProfile.data,
              select: { id: true },
            })
          : null;
        const createdBiofacialProfile = biofacialProfile
          ? await tx.kYCProfile.create({
              data: biofacialProfile.data,
              select: { id: true },
            })
          : null;

        return tx.user.update({
          where: { id: +userId },
          data: {
            ...prismaUpdateData,
            ...(avatar_id && { avatar_id }),
            ...(comprovante_id && { comprovante_id }),
            ...(documento_id && { documento_id }),
            ...(biofacial_id && { biofacial_id }),
            ...(createdAvatarProfile && { avatar_id: createdAvatarProfile.id }),
            ...(createdComprovanteProfile && {
              comprovante_id: createdComprovanteProfile.id,
            }),
            ...(createdDocumentoProfile && {
              documento_id: createdDocumentoProfile.id,
            }),
            ...(createdBiofacialProfile && {
              biofacial_id: createdBiofacialProfile.id,
            }),
          },
          select: {
            id: true,
            publicId: true,
            email: true,
            nome: true,
            role: true,
            telefone: true,
            data_nascimento: true,
            genero: true,
            endereco: true,
            numero: true,
            complemento: true,
            bairro: true,
            cidade: true,
            uf: true,
            cep: true,
            pais: true,
            bandeira: true,
            paisCountry: {
              select: userCountrySelect,
            },
            termosAceitos: true,
            politicaAceita: true,
            tipo_documento: true,
            reg_documento: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            avatar: true,
            comprovante: true,
            documento: true,
            biofacial: true,
            wallet: true,
            payments: true,
            subscriptions: { include: { plan: true } },
          },
        });
      });

      const publicProfilePayload = pickPublicProfilePayload(update);
      let currentSessionUpdated = false;
      if (
        sessionId &&
        typeof this.sessionService.refreshUserProfileForSession === 'function'
      ) {
        currentSessionUpdated =
          await this.sessionService.refreshUserProfileForSession(
            sessionId,
            +userId,
            publicProfilePayload,
          );
      }

      // A sessão atual é atualizada diretamente. As demais sessões do mesmo
      // usuário continuam sendo sincronizadas sem sobrescrever a atual.
      // Se a escrita direta falhar, tenta o caminho legado por SCAN como
      // fallback. Assim uma falha transitória de leitura da chave atual não
      // deixa o Redis stale sem uma segunda tentativa.
      const otherSessionsUpdated = await this.sessionService.refreshUserProfile(
        +userId,
        publicProfilePayload,
        currentSessionUpdated ? sessionId : undefined,
      );

      if (sessionId && !currentSessionUpdated && otherSessionsUpdated === 0) {
        this.logger.error(
          `[UsersService] Perfil salvo no banco, mas nenhuma sessão foi atualizada: userId=${userId}, sessionId=${sessionId}`,
        );
      }

      // auditoria: diff dos campos alterados
      const auditFields = [
        'nome',
        'email',
        'telefone',
        'genero',
        'endereco',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'uf',
        'cep',
        'pais',
        'bandeira',
        'data_nascimento',
      ] as const;
      const oldValue: Record<string, unknown> = {};
      const newValue: Record<string, unknown> = {};
      for (const field of auditFields) {
        const oldVal = oldUser?.[field];
        const newVal = update[field as keyof typeof update];
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
          oldValue[field] = oldVal ?? null;
          newValue[field] = newVal ?? null;
        }
      }
      if (Object.keys(newValue).length > 0) {
        await this.auditService.log({
          userId: +userId,
          action: 'USER_PROFILE_UPDATED',
          entity: 'User',
          entityId: String(userId),
          oldValue: oldValue as any,
          newValue: newValue as any,
        });
      }

      return ResponseDto.success(
        'Usuário atualizado com sucesso',
        200,
        this.toPublicUser(update),
      );
    } catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const response = error.getResponse();
        const responseMessage =
          typeof response === 'string'
            ? response
            : (response as { message?: string | string[] })?.message;
        const message = Array.isArray(responseMessage)
          ? responseMessage.join(', ')
          : responseMessage || error.message;

        this.logger.warn(
          `[UsersService] PATCH /users/me rejeitado: userId=${user.id}, status=${status}, motivo=${message}`,
        );
        return ResponseDto.error(message, status);
      }

      this.logger.error(
        `[UsersService] Falha inesperada no PATCH /users/me: userId=${user.id}, motivo=${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      return ResponseDto.error('Erro ao atualizar usuário', 500);
    }
  }

  /**
   * Lista todos os usuários com paginação e busca
   * @name findAll
   * @description Busca todos os usuários do sistema com paginação, campos limitados e filtro de busca
   *
   * @param query Objeto com parâmetros de paginação e busca
   * @param query.page Número da página (padrão: 1)
   * @param query.limit Itens por página (padrão: 25)
   * @param query.search Termo de busca por nome, email, id ou documento
   */
  async findAll(query: { page?: number; limit?: number; search?: string }) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 25;

      const where: any = {};

      const search = query.search?.trim();
      if (search) {
        const searchNum = parseInt(search, 10);
        where.OR = [
          { nome: { contains: search } },
          { email: { contains: search } },
          ...(searchNum ? [{ id: searchNum }] : []),
          { reg_documento: { contains: search } },
        ];
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          take: limit,
          skip: (page - 1) * limit,
          select: {
            id: true,
            email: true,
            nome: true,
            subscriptions: true,
            createdAt: true,
            avatar: {
              select: {
                url_sm: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return ResponseDto.success(
        'Usuários retornados com sucesso',
        200,
        users,
        total,
        page,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar usuários', 500, error);
    }
  }

  /**
   * Busca um usuário específico por ID
   * @name findOne
   * @description Busca um usuário no banco com todas as relações incluídas
   *
   * @param id ID numérico do usuário
   */
  async findOne(id: number) {
    if (isNaN(id) || !Number.isInteger(id) || id <= 0) {
      return ResponseDto.error('ID deve ser um número inteiro positivo', 400);
    }
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          payments: true,
          subscriptions: true,
          tokens: true,
          tokenHistory: true,
          auditLogs: true,
          wallet: true,
          startups: true,
          investments: true,
          avatar: true,
          comprovante: true,
          documento: true,
          biofacial: true,
          paisCountry: {
            select: userCountrySelect,
          },
        },
      });

      if (!user) {
        return ResponseDto.error('Usuário não encontrado', 404);
      }

      return ResponseDto.success(
        'Usuário encontrado com sucesso',
        200,
        this.toPublicUser(user),
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar usuário', 500, error);
    }
  }

  /**
   * Atualiza dados de um usuário
   * @name update
   * @description Atualiza os dados de um usuário existente no sistema
   *
   * @param id ID numérico do usuário
   * @param updateUserDto Objeto com campos a serem atualizados
   */
  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      // snapshot antes da atualização
      const oldUser = await this.prisma.user.findUnique({
        where: { id },
        select: {
          nome: true,
          email: true,
          telefone: true,
          role: true,
          isActive: true,
          genero: true,
          endereco: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          uf: true,
          cep: true,
          pais: true,
          bandeira: true,
        },
      });

      // backup do usuário
      await this.backup.userBackup(id);
      // Campos que podem ser atualizados diretamente no Prisma
      const {
        avatar_id,
        comprovante_id,
        documento_id,
        biofacial_id,
        data_nascimento,
        ...allowedFields
      } = updateUserDto;

      const countryFields = await this.resolveCountryFields(
        allowedFields as Record<string, unknown>,
      );
      if (!countryFields.valid) {
        return ResponseDto.error('País selecionado não foi encontrado', 400);
      }

      // Monta o objeto de atualização apenas com campos permitidos
      const prismaUpdateData: any = {
        ...allowedFields,
        ...countryFields.data,
        data_nascimento: data_nascimento
          ? new Date(data_nascimento)
          : undefined,
      };

      // atualiza os dados do usuário no banco
      const update = await this.prisma.user.update({
        where: { id },
        data: {
          ...prismaUpdateData,
          ...(avatar_id && { avatar_id }),
          ...(comprovante_id && { comprovante_id }),
          ...(documento_id && { documento_id }),
          ...(biofacial_id && { biofacial_id }),
        },
        select: {
          id: true,
          publicId: true,
          email: true,
          nome: true,
          role: true,
          telefone: true,
          data_nascimento: true,
          genero: true,
          endereco: true,
          numero: true,
          complemento: true,
          bairro: true,
          cidade: true,
          uf: true,
          cep: true,
          pais: true,
          bandeira: true,
          paisCountry: {
            select: userCountrySelect,
          },
          termosAceitos: true,
          politicaAceita: true,
          tipo_documento: true,
          reg_documento: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          avatar: true,
          comprovante: true,
          documento: true,
          biofacial: true,
        },
      });

      await this.sessionService.refreshUserProfile(
        id,
        pickPublicProfilePayload(update),
      );

      // auditoria: diff dos campos alterados
      const auditFields = [
        'nome',
        'email',
        'telefone',
        'role',
        'isActive',
        'genero',
        'endereco',
        'numero',
        'complemento',
        'bairro',
        'cidade',
        'uf',
        'cep',
        'pais',
        'bandeira',
      ] as const;
      const oldValue: Record<string, unknown> = {};
      const newValue: Record<string, unknown> = {};
      for (const field of auditFields) {
        const oldVal = oldUser?.[field];
        const newVal = update[field as keyof typeof update];
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
          oldValue[field] = oldVal ?? null;
          newValue[field] = newVal ?? null;
        }
      }
      if (Object.keys(newValue).length > 0) {
        await this.auditService.log({
          userId: id,
          action: 'USER_UPDATED_BY_ADMIN',
          entity: 'User',
          entityId: String(id),
          oldValue: oldValue as any,
          newValue: newValue as any,
        });
      }

      return ResponseDto.success(
        'Usuário atualizado com sucesso',
        200,
        this.toPublicUser(update),
      );
    } catch (error) {
      // retorna erro
      return ResponseDto.error(
        'Erro ao atualizar usuário do id ' + id,
        500,
        error,
      );
    }
  }

  /**
   * Remove um usuário do sistema
   * @name remove
   * @description Remove um usuário do sistema permanentemente (hard delete)
   *
   * @param id ID numérico do usuário
   */
  async remove(id: number) {
    try {
      // snapshot antes da exclusão
      const oldUser = await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          nome: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      // backup do usuário
      await this.backup.userBackup(id);

      // auditoria ANTES do delete (registro imutável)
      if (oldUser) {
        await this.auditService.log({
          userId: id,
          action: 'USER_DELETED',
          entity: 'User',
          entityId: String(id),
          oldValue: {
            nome: oldUser.nome,
            email: oldUser.email,
            role: oldUser.role,
            createdAt: oldUser.createdAt?.toISOString(),
          },
        });
      }

      // remove o usuário do banco (hard delete)
      await this.prisma.user.delete({
        where: { id },
      });

      // retorna confirmação de remoção
      return ResponseDto.success('Usuário removido com sucesso', 200);
    } catch (error) {
      // retorna erro
      return ResponseDto.error(
        'Erro ao remover usuário do id ' + id,
        500,
        error,
      );
    }
  }
}
