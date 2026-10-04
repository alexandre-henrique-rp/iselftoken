import {
  BadRequestException,
  NotFoundException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SessionService } from 'src/auth/session/session.service';
import { AuditService } from 'src/common/audit/audit.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from 'src/api/config/config.service';
import {
  validateCategoryAreaCoherence,
  validateCategoryAreasCoherence,
} from '../../../common/validators/category-area-coherence.validator';
import { validateSocialUrls } from '../../../common/validators/social-url.validator';
import { CreateStartupOnboardingDto } from '../dto/create-startup-onboarding.dto';
import { RequestVerificationDto } from '../dto/request-verification.dto';
import { UpdateComplementaryDto } from '../dto/update-complementary.dto';
import { UpdateStartupDto } from '../dto/update-startup.dto';
import { ValidateFundador } from './validate.fundador';
import { S3Service } from 'src/s3/s3.service';

/** Sócio da startup (JSON `socios` na tabela Startup). */
export interface SocioDto {
  nome: string;
  cargo: string;
  percentual?: number;
  fotoUrl?: string;
}

/** Membro do time fundador (JSON `teams` na tabela Startup). */
export interface TeamDto {
  nome: string;
  cargo: string;
  fotoUrl?: string;
}

/**
 * Serviço de CRUD para startups.
 * Responsável por create, update, updateComplementary, requestVerification,
 * findOne, findOneAdmin e remove.
 */
@Injectable()
export class StartupCrudService {
  private readonly logger = new Logger(StartupCrudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validateFundador: ValidateFundador,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    @Optional() private readonly s3Service?: S3Service,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  private async getAreasPayload(
    raw: Prisma.JsonValue | null,
    legacyId?: number | null,
  ) {
    const ids = (Array.isArray(raw) ? raw : legacyId ? [legacyId] : []).filter(
      (id): id is number => typeof id === 'number' && Number.isInteger(id),
    );
    const areas = ids.length
      ? await this.prisma.areaAtuacao.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            slug: true,
            nome: true,
            descricao: true,
            ordem: true,
            categoryId: true,
          },
        })
      : [];
    const byId = new Map(areas.map((area) => [area.id, area]));
    return {
      areaAtuacaoIds: ids,
      areasAtuacao: ids.map((id) => byId.get(id)).filter(Boolean),
    };
  }

  private async resolvePitchDeckUrl(
    legacy: {
      url?: string | null;
      url_md?: string | null;
      url_web?: string | null;
    } | null,
    s3Key?: string | null,
  ): Promise<string | null> {
    if (s3Key && this.s3Service) {
      try {
        return await this.s3Service.getUrl('document', s3Key);
      } catch (error) {
        this.logger.warn(`Falha ao gerar URL do pitch deck: ${error}`);
      }
    }

    return legacy?.url_web ?? legacy?.url_md ?? legacy?.url ?? null;
  }

  /**
   * Invalida cache do usuário após mutação de startup.
   *
   * @param userId ID do usuário
   */
  private async invalidateUserCaches(userId: number): Promise<void> {
    try {
      await this.sessionService.deleteUserCache(userId.toString());
    } catch (error) {
      this.logger.warn(
        `Falha ao invalidar cache apos mutacao de startup (userId=${userId}): ${error}`,
      );
    }
  }

  /**
   * Sufixos empresariais comuns (razão social) removidos do slug para que
   * a URL pública fique limpa e fácil de divulgar.
   * Ex.: "Rocket Invite S.A." → "rocket-invite".
   */
  private static readonly COMPANY_SUFFIXES = [
    'sociedade anonima',
    'sociedade anônima',
    'limitada',
    'ltda',
    'microempresa',
    'micro empresa',
    'empresa de pequeno porte',
    'epp',
    'eireli',
    'individual',
    'inc',
    'incorporated',
    'corp',
    'corporation',
    'company',
    'co',
    'llc',
    'gmbh',
    's.a',
    's.a.',
    'sa',
    'me',
    'epp',
  ];

  /**
   * Stopwords (preposições/artigos) descartadas quando aparecem como
   * tokens isolados. Mantém palavras compostas (ex.: "InterState").
   *
   * Observação: NÃO incluímos "e/and" — em PT-BR o conector faz parte
   * da identidade de marca ("Rocket e Inova"). Removê-lo quebraria a
   * leitura do `nomeFantasia` na URL pública.
   */
  private static readonly SLUG_STOPWORDS = new Set([
    'a',
    'o',
    'as',
    'os',
    'de',
    'da',
    'do',
    'das',
    'dos',
    'em',
    'na',
    'no',
    'nas',
    'nos',
    'para',
    'por',
    'com',
  ]);

  /** Limite máximo do slug base antes do sufixo numérico de colisão. */
  private static readonly MAX_SLUG_LENGTH = 60;

  /**
   * Gera um slug limpo a partir do `nomeFantasia` da startup.
   *
   * Comportamento:
   * - Lowercase + remove acentos (NFD + combining marks)
   * - Decodifica `&` como `e`
   * - Remove sufixos empresariais (S.A., Ltda, ME, Inc, etc.)
   * - Remove stopwords isoladas (de, da, e, em, ...) — preserva compostos
   * - Substitui qualquer caractere não-alfanumérico por espaço
   * - Colapsa espaços/hífens múltiplos
   * - Trima hífens nas pontas
   * - Limita a `MAX_SLUG_LENGTH` caracteres
   *
   * @param nomeFantasia Nome fantasia da startup (fonte única do slug)
   * @returns Slug base (sem garantia de unicidade)
   */
  private generateSlug(nomeFantasia: string): string {
    if (!nomeFantasia || typeof nomeFantasia !== 'string') return '';

    const lowered = nomeFantasia
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Decodifica '&' como 'e' (sem espaços; o tokenizador cuida).
    const withAmpersand = lowered.replace(/&/g, 'e');

    // Remove sufixos empresariais quando aparecem como tokens isolados.
    let stripped = withAmpersand;
    for (const suffix of StartupCrudService.COMPANY_SUFFIXES) {
      const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      stripped = stripped.replace(
        new RegExp(`(^|\\s)${escaped}(?=\\s|$|[.,;])`, 'g'),
        ' ',
      );
    }

    // Remove stopwords isoladas.
    const tokens = stripped
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => !StartupCrudService.SLUG_STOPWORDS.has(token));

    const slug = tokens
      .join('-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, StartupCrudService.MAX_SLUG_LENGTH)
      .replace(/-+$/g, '');

    return slug;
  }

  /**
   * Garante unicidade do slug. Se a base já existir, acrescenta sufixo
   * numérico sequencial (`-1`, `-2`, ...). Como fallback extremo, gera
   * um slug aleatório curto (base36 do timestamp).
   *
   * Não usa `nanoid`/cuid — o objetivo é URL limpa e compartilhável.
   *
   * @param baseSlug Slug base (vazio cai no fallback)
   * @returns Slug único
   */
  private async generateUniqueSlug(baseSlug: string): Promise<string> {
    const base = baseSlug.trim();

    if (!base) {
      return `startup-${Date.now().toString(36)}`;
    }

    const exists = async (slug: string): Promise<boolean> => {
      const found = await this.prisma.startup.findUnique({
        where: { slug },
        select: { id: true },
      });
      return found !== null;
    };

    if (!(await exists(base))) {
      return base;
    }

    for (let counter = 1; counter <= 9999; counter++) {
      const candidate = `${base}-${counter}`;
      if (!(await exists(candidate))) {
        return candidate;
      }
    }

    // Fallback extremo: 9999 colisões é improvável, mas defendemos.
    return `${base}-${Date.now().toString(36)}`;
  }

  /**
   * Converte um id da tabela Upload (retornado por POST /uploads) em um
   * registro KYCProfile, que é a tabela referenciada pelas FKs
   * `logo_id`/`cover_id` da Startup.
   *
   * Sem esta conversão, o id do Upload colide com um KYCProfile qualquer
   * (ids autoincrement independentes) e a startup passa a exibir a imagem
   * de outro registro. Mesmo padrão usado na criação via pagamento
   * (payment.service.ts — logoFileId → KYCProfile → logo_id).
   *
   * Retorna null quando o id não resolve para Upload nem KYCProfile.
   */
  private async resolveMediaToKycProfileId(
    mediaId: number,
    userId?: number,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<number | null> {
    const upload = await db.upload.findFirst({
      where: { id: mediaId, type: 'image' },
    });

    if (upload) {
      if (upload.userId && userId && upload.userId !== userId) {
        return null;
      }
      const variants =
        (upload.variants as Record<string, { url?: string }> | null) ?? {};
      const publicUrl = upload.url || upload.url_web || '';
      const kycProfile = await db.kYCProfile.create({
        data: {
          originalName: upload.originalName || 'media',
          size: upload.size ?? 0,
          mineType: upload.mimeType || 'image/png',
          extension: upload.extension || 'png',
          url: publicUrl,
          url_sm: variants.sm?.url || upload.url_web || publicUrl || null,
          url_md: upload.url_md || variants.md?.url || publicUrl || null,
          url_web: upload.url_web || variants.sm?.url || publicUrl || null,
          url_lg: variants.lg?.url || publicUrl || null,
          status: 'APPROVED',
        },
      });
      return kycProfile.id;
    }

    // Retrocompat: aceita id de KYCProfile existente (seeds, fluxos admin).
    const kycProfile = await db.kYCProfile.findUnique({
      where: { id: mediaId },
      select: { id: true },
    });
    return kycProfile?.id ?? null;
  }

  /**
   * Mascara CNPJ para logs LGPD (formato 12.345.MASK-MASK-00).
   *
   * @param cnpj CNPJ em texto
   * @returns CNPJ mascarado
   */
  private maskCnpj(cnpj: string): string {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) return '***';
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.***-****-${digits.slice(12, 14)}`;
  }

  /**
   * Cria uma startup inicial com dados básicos (onboarding rápido).
   *
   * @param data Dados iniciais da startup
   * @param user Usuário autenticado (será o founder)
   * @returns ResponseDto com startup criada
   */
  async create(data: CreateStartupOnboardingDto, user: PayloadEntity) {
    try {
      const hasValidPlan =
        await this.validateFundador.validateFundadorPlan(user);
      if (!hasValidPlan) {
        return ResponseDto.error(
          'Você precisa ter um plano fundador ativo para criar uma startup',
          403,
        );
      }

      const areaAtuacaoIds =
        data.areaAtuacaoIds ??
        (data.areaAtuacaoId !== undefined ? [data.areaAtuacaoId] : []);
      try {
        if (data.areaAtuacaoIds !== undefined) {
          await validateCategoryAreasCoherence(
            data.categoryId,
            areaAtuacaoIds,
            this.prisma,
          );
        } else {
          await validateCategoryAreaCoherence(
            data.categoryId,
            areaAtuacaoIds[0],
            this.prisma,
          );
        }
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          return ResponseDto.error(error.message, error.getStatus());
        }
        throw error;
      }
      const socialErrors = validateSocialUrls({
        linkedin: data.linkedin,
        instagram: data.instagram,
        twitter: data.twitter,
      });
      if (socialErrors.length > 0) {
        return ResponseDto.error(socialErrors.join(' '), 400);
      }

      const cnpjLimpo = data.cnpj.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const baseSlug = this.generateSlug(data.nomeFantasia);
      const uniqueSlug = await this.generateUniqueSlug(baseSlug);
      const country = data.paisIso3
        ? await this.prisma.country.findUnique({
            where: { iso3: data.paisIso3 },
            select: { iso3: true, name: true, emoji: true },
          })
        : null;

      const startup = await this.prisma.$transaction(async (tx) => {
        // logoFileId é id da tabela Upload — converter para KYCProfile
        // (FK logo_id) antes de gravar, senão aponta para registro errado.
        const logoKycId = data.logoFileId
          ? await this.resolveMediaToKycProfileId(data.logoFileId, user.id, tx)
          : null;
        const created = await tx.startup.create({
          data: {
            founderId: user.id,
            nome: data.nomeFantasia,
            razao_social: data.razaoSocial,
            cnpj: cnpjLimpo,
            slug: uniqueSlug,
            categoryId: data.categoryId,
            areaAtuacaoId: areaAtuacaoIds[0],
            areas_atuacao: areaAtuacaoIds,
            estagio: data.estagio,
            descricao: data.descricao,
            youtube_url: data.videoPitch || null,
            redes_sociais: {
              website: data.website || null,
              linkedin: data.linkedin || null,
              instagram: data.instagram || null,
              twitter: data.twitter || null,
            },
            banco: data.banco,
            agencia: data.agencia,
            conta: data.conta || null,
            digito: data.digito || null,
            titular: data.titular,
            tipo_conta: data.tipoConta || null,
            pix_key: data.chavePix || null,
            documento_titular: data.documentoTitular || null,
            site: data.website || null,
            telefone: null,
            email: null,
            descritivo_basico: data.descricao,
            data_fundacao:
              data.dataAbertura.length === 4
                ? new Date(`${data.dataAbertura}-01-01`)
                : new Date(data.dataAbertura),
            pais: (country
              ? {
                  iso3: country.iso3,
                  nome: country.name,
                  emoji: country.emoji,
                }
              : data.paisIso3
                ? { iso3: data.paisIso3 }
                : null) as any,
            logo_id: logoKycId,
            status: 'PENDING_RESERVATION_PAYMENT',
          },
        });
        return created;
      });

      await this.invalidateUserCaches(user.id);

      await this.auditService.log({
        userId: user.id,
        action: 'STARTUP_CREATED',
        entity: 'Startup',
        entityId: String(startup.id),
        newValue: {
          nome: startup.nome,
          cnpj: startup.cnpj,
          status: startup.status,
          slug: startup.slug,
        },
      });

      return ResponseDto.success('Startup criada com sucesso', 201, startup);
    } catch (error) {
      return ResponseDto.error('Erro ao criar startup', 500, error);
    }
  }

  /**
   * Atualiza dados complementares da startup.
   *
   * @param startupId ID da startup
   * @param data Dados complementares
   * @param user Usuário autenticado
   * @returns ResponseDto com startup atualizada
   */
  async updateComplementary(
    startupId: number,
    data: UpdateComplementaryDto,
    user: PayloadEntity,
  ) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id: startupId },
      });

      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }

      if (startup.founderId !== user.id) {
        return ResponseDto.error('Acesso negado', 403);
      }

      const statusOrder = [
        'PENDING_RESERVATION_PAYMENT',
        'RESERVATION_PAID',
        'PENDING_CURATOR_REVIEW',
        'APPROVED',
        'LIVE',
      ];
      const currentStatusIndex = statusOrder.indexOf(startup.status);
      const requiredStatusIndex = statusOrder.indexOf('RESERVATION_PAID');

      if (currentStatusIndex < requiredStatusIndex) {
        return ResponseDto.error(
          'Status insuficiente. Pague a taxa de reserva primeiro.',
          400,
        );
      }

      if (data.recursosPercentuais && data.recursosPercentuais.length > 0) {
        const totalPercentual = data.recursosPercentuais.reduce(
          (sum, r) => sum + r.percentual,
          0,
        );
        if (totalPercentual !== 100) {
          return ResponseDto.error(
            `A soma dos percentuais deve ser exatamente 100%. Atual: ${totalPercentual}%`,
            400,
          );
        }
      }

      if (
        !data.aceiteTermosPlataforma ||
        !data.aceitePoliticaPrivacidade ||
        !data.declaracaoVeracidade
      ) {
        return ResponseDto.error(
          'Todos os aceites devem ser marcados como true',
          400,
        );
      }

      // logoFileId é id da tabela Upload — converter para KYCProfile.
      // Se o upload nao resolver, mantem o logo atual (undefined = nao altera).
      const logoKycId =
        data.logoFileId !== undefined
          ? ((await this.resolveMediaToKycProfileId(
              data.logoFileId,
              user.id,
            )) ?? undefined)
          : undefined;

      const currentPais =
        startup.pais && typeof startup.pais === 'object'
          ? (startup.pais as Record<string, unknown>)
          : {};
      const paisWithAddress = data.endereco
        ? {
            ...currentPais,
            logradouro: data.endereco.rua,
            numero: data.endereco.numero,
            complemento: data.endereco.complemento,
            bairro: data.endereco.bairro,
            cidade: data.endereco.cidade,
            uf: data.endereco.uf,
            cep: data.endereco.cep.replace(/\D/g, ''),
          }
        : undefined;

      const updatedStartup = await this.prisma.startup.update({
        where: { id: startupId },
        data: {
          logo_id: logoKycId,
          pais: paisWithAddress,
          descritivo_basico: data.descricaoBreve,
          uso_recursos: data.recursosPercentuais
            ? data.recursosPercentuais.map((r) => ({
                descricao: r.descricao,
                percentual: r.percentual,
              }))
            : undefined,
          problema: data.teseNegocios?.problema,
          solucao: data.teseNegocios?.solucao,
          modelo_receita: data.teseNegocios?.modeloReceita,
        },
      });

      // Redirecionar campos de captação para a Campaign ativa (se existir)
      const captacaoFields: Record<string, unknown> = {};
      if (data.problema !== undefined) captacaoFields.problema = data.problema;
      if (data.solucao !== undefined) captacaoFields.solucao = data.solucao;
      if (data.modeloReceita !== undefined)
        captacaoFields.modeloReceita = data.modeloReceita;
      if (data.diferencial !== undefined)
        captacaoFields.diferencial = data.diferencial;
      if (data.mercadoAlvo !== undefined)
        captacaoFields.mercadoAlvo = data.mercadoAlvo;
      if (data.sociosCount !== undefined)
        captacaoFields.sociosCount = data.sociosCount;
      if (data.dedicacao !== undefined)
        captacaoFields.dedicacao = data.dedicacao;
      if (data.compradores !== undefined)
        captacaoFields.compradores = data.compradores;
      if (data.investimentoPrevio !== undefined)
        captacaoFields.investimentoPrevio = data.investimentoPrevio;
      if (data.concorrencia !== undefined)
        captacaoFields.concorrencia = data.concorrencia;

      if (Object.keys(captacaoFields).length > 0) {
        const activeCampaign = await this.prisma.campaign.findFirst({
          where: { startupId, status: { in: ['DRAFT', 'OPEN'] } },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        if (activeCampaign) {
          await this.prisma.campaign.update({
            where: { id: activeCampaign.id },
            data: captacaoFields,
          });
          this.logger.log(
            `Campos de captação redirecionados para campaign ${activeCampaign.id} (startup ${startupId}).`,
          );
        }
      }

      await this.invalidateUserCaches(user.id);

      await this.auditService.log({
        userId: user.id,
        action: 'STARTUP_COMPLEMENTARY_UPDATED',
        entity: 'Startup',
        entityId: String(startupId),
        newValue: {
          descritivo_basico: data.descricaoBreve,
          uso_recursos: data.recursosPercentuais?.length ?? 0,
          problema: data.teseNegocios?.problema,
          solucao: data.teseNegocios?.solucao,
          modelo_receita: data.teseNegocios?.modeloReceita,
        },
      });

      return ResponseDto.success(
        'Dados complementares atualizados com sucesso',
        200,
        updatedStartup,
      );
    } catch (error) {
      return ResponseDto.error(
        'Erro ao atualizar dados complementares',
        500,
        error,
      );
    }
  }

  /**
   * Solicita o selo "Startup Verificada" gerando pagamento de R$ 890,00.
   *
   * @param startupId ID da startup
   * @param data IDs dos documentos
   * @param user Usuário autenticado
   * @returns ResponseDto com dados do pagamento
   */
  async requestVerification(
    startupId: number,
    data: RequestVerificationDto,
    user: PayloadEntity,
  ) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id: startupId },
      });

      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }

      if (startup.founderId !== user.id) {
        return ResponseDto.error('Acesso negado', 403);
      }

      if (startup.verificationStatus === 'VERIFIED') {
        return ResponseDto.error('Startup já verificada', 400);
      }

      const documents = await this.prisma.kYCProfile.findMany({
        where: { id: { in: data.documentIds } },
      });

      if (documents.length !== data.documentIds.length) {
        return ResponseDto.error(
          'Um ou mais documentos não foram encontrados',
          404,
        );
      }

      await this.prisma.startup.update({
        where: { id: startupId },
        data: { verificationStatus: 'PENDING' },
      });

      const payment = await this.prisma.payment.create({
        data: {
          userId: user.id,
          amount: 890,
          method: 'CREDIT_CARD',
          purpose: 'VERIFICATION_SEAL',
          status: 'PENDING',
        },
      });

      await this.invalidateUserCaches(user.id);
      return ResponseDto.success(
        'Solicitação de verificação criada. Aguarde pagamento.',
        201,
        {
          paymentId: payment.id,
          amount: payment.amount,
          status: payment.status,
          documentIds: data.documentIds,
        },
      );
    } catch (error) {
      return ResponseDto.error('Erro ao solicitar verificação', 500, error);
    }
  }

  /**
   * Retorna os dados públicos de uma startup aprovada com rodada aberta.
   * Aceita tanto o ID numérico quanto o slug usado na URL pública.
   *
   * @param slugOrId Identificador público da startup
   * @returns ResponseDto com o payload da página pública
   */
  async findPublic(slugOrId: string) {
    try {
      const numericId = Number(slugOrId);
      const startup = await this.prisma.startup.findFirst({
        where: {
          status: 'APPROVED',
          ...(Number.isInteger(numericId) && numericId > 0
            ? { id: numericId }
            : { slug: slugOrId }),
        },
        select: {
          id: true,
          slug: true,
          nome: true,
          site: true,
          redes_sociais: true,
          area_atuacao: true,
          areas_atuacao: true,
          areaAtuacaoId: true,
          category: true,
          categoryRel: { select: { nome: true } },
          areaAtuacaoRel: { select: { nome: true } },
          estagio: true,
          descricao: true,
          descritivo_basico: true,
          youtube_url: true,
          problema: true,
          solucao: true,
          modelo_receita: true,
          diferencial: true,
          mercado_alvo: true,
          espera_alcancar: true,
          dedicacao: true,
          compradores: true,
          investimento_previo: true,
          concorrencia: true,
          uso_recursos: true,
          /** Equipe (JSON [{ nome, cargo, percentual }]) — exibida no frontend. */
          socios: true,
          /** Time fundador (JSON [{ nome, cargo }]) — exibida no frontend. */
          teams: true,
          seals: {
            where: { seal: { active: true } },
            orderBy: { issuedAt: 'desc' },
            select: {
              issuedAt: true,
              seal: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  description: true,
                  imagePath: true,
                  category: true,
                },
              },
            },
          },
          pitch_deck: { select: { url: true, url_md: true, url_web: true } },
          documents: {
            where: { categoria: 'PITCH_DECK' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { s3Key: true },
          },
          logo: { select: { url: true } },
          cover: { select: { url: true } },
          campaigns: {
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              targetAmount: true,
              minInvestment: true,
              valuation: true,
              tokenPrice: true,
              tokenBaseValue: true,
              tokenSellPrice: true,
              totalTokens: true,
              tokensSold: true,
              deadline: true,
              affiliateCommissionPct: true,
              sociosCount: true,
              problema: true,
              solucao: true,
              modeloReceita: true,
              diferencial: true,
              mercadoAlvo: true,
              dedicacao: true,
              compradores: true,
              investimentoPrevio: true,
              concorrencia: true,
              objetivoCaptacao: true,
              oQueEsperaAlcancar: true,
              participacaoLucros: true,
              faturamentoMinimoLucros: true,
              politicaLucros: true,
              beneficiosAdicionais: true,
              beneficiosDescricao: true,
              resources: {
                select: { categoria: true, percentual: true },
              },
            },
          },
        },
      });

      const campaign = startup?.campaigns[0];
      if (!startup || !campaign) {
        return ResponseDto.error(
          'Startup não encontrada ou sem rodada disponível',
          404,
        );
      }

      const totalTokens = Number(campaign.totalTokens);
      const tokensSold = Number(campaign.tokensSold);
      const percentage =
        totalTokens > 0 ? Math.round((tokensSold / totalTokens) * 100) : 0;
      // Modelo B: o "captado" público é o repasse à startup (preço base),
      // não o valor de venda cobrado do investidor.
      const tokenBaseValue = Number(
        campaign.tokenBaseValue ?? campaign.tokenPrice,
      );

      return ResponseDto.success('Startup pública encontrada', 200, {
        slug: startup.slug,
        name: startup.nome,
        logo: startup.logo?.url || '',
        cover: startup.cover?.url || '',
        description: startup.descricao || '',
        category:
          startup.areaAtuacaoRel?.nome ??
          startup.area_atuacao ??
          startup.categoryRel?.nome ??
          startup.category ??
          'Outros',
        ...(await this.getAreasPayload(
          startup.areas_atuacao,
          startup.areaAtuacaoId,
        )),
        stage: startup.estagio || '',
        website: startup.site,
        socialLinks: startup.redes_sociais,
        youtubeUrl: startup.youtube_url,
        pitchVideoUrl: null,
        pitchDeckUrl: await this.resolvePitchDeckUrl(
          startup.pitch_deck,
          startup.documents?.[0]?.s3Key,
        ),
        problema: startup.problema ?? campaign.problema,
        solucao: startup.solucao ?? campaign.solucao,
        descritivoBasico: startup.descritivo_basico,
        modeloReceita: startup.modelo_receita ?? campaign.modeloReceita,
        diferencial: startup.diferencial ?? campaign.diferencial,
        mercadoAlvo: startup.mercado_alvo ?? campaign.mercadoAlvo,
        esperaAlcancar: startup.espera_alcancar ?? campaign.oQueEsperaAlcancar,
        dedicacao: startup.dedicacao ?? campaign.dedicacao,
        compradores: startup.compradores ?? campaign.compradores,
        investimentoPrevio:
          startup.investimento_previo ?? campaign.investimentoPrevio,
        concorrencia: startup.concorrencia ?? campaign.concorrencia,
        usoRecursos:
          Array.isArray(startup.uso_recursos) && startup.uso_recursos.length
            ? startup.uso_recursos
            : (campaign.resources ?? []).map((resource) => ({
                category: resource.categoria,
                percentual: resource.percentual,
              })),
        objetivoCaptacao: campaign.objetivoCaptacao,
        sociosCount: campaign.sociosCount,
        participacaoLucros: campaign.participacaoLucros,
        faturamentoMinimoLucros: campaign.faturamentoMinimoLucros,
        politicaLucros: campaign.politicaLucros,
        beneficiosAdicionais: campaign.beneficiosAdicionais,
        beneficiosDescricao: campaign.beneficiosDescricao,
        affiliateCommissionPct: campaign.affiliateCommissionPct,
        seals: startup.seals?.map(({ seal }) => seal) ?? [],
        /** Equipe para a página de detalhe (sócio + percentual, time fundador). */
        socios: (startup.socios as SocioDto[] | null) ?? [],
        teams: (startup.teams as TeamDto[] | null) ?? [],
        campaign: {
          raised: (tokensSold * tokenBaseValue) / 100,
          goal: Number(campaign.targetAmount) / 100,
          valuation: Number(campaign.valuation) / 100,
          percentage,
          equity:
            Number(campaign.valuation) > 0
              ? (Number(campaign.targetAmount) / Number(campaign.valuation)) *
                100
              : null,
        },
      });
    } catch (error) {
      return ResponseDto.error('Erro ao buscar startup pública', 500, error);
    }
  }

  /**
   * Retorna o detalhe autorizado para o marketplace autenticado.
   * A resolução canônica é por slug; o ID interno só aparece nos dados
   * necessários para criar a ordem de investimento.
   */
  async findPrivate(slug: string, user: PayloadEntity) {
    const isMarketplaceAdmin = ['ADMIN', 'FINANCEIRO', 'COMPLIANCE'].includes(
      user.role,
    );

    return this.findMarketplaceDetail(
      slug,
      isMarketplaceAdmin ? undefined : user.id,
      true,
    );
  }

  /** Retorna o preview do owner mesmo antes da campanha estar OPEN. */
  async findPreview(slug: string, user: PayloadEntity) {
    const isMarketplaceAdmin = ['ADMIN', 'FINANCEIRO', 'COMPLIANCE'].includes(
      user.role,
    );

    return this.findMarketplaceDetail(
      slug,
      isMarketplaceAdmin ? undefined : user.id,
      true,
      true,
    );
  }

  /**
   * Retorna somente o detalhe de oferta necessário para descoberta e checkout.
   * Diferentemente de findPrivate(), não expõe o ID interno da startup.
   */
  async findAuthenticatedMarketplace(slug: string) {
    return this.findMarketplaceDetail(slug, undefined, false);
  }

  private async findMarketplaceDetail(
    slug: string,
    founderId: number | undefined,
    includeInternalId: boolean,
    preview = false,
  ) {
    try {
      const startup = await this.prisma.startup.findFirst({
        where: {
          slug,
          ...(preview ? {} : { status: 'APPROVED' }),
          campaigns: preview ? { some: {} } : { some: { status: 'OPEN' } },
          ...(founderId === undefined ? {} : { founderId }),
        },
        select: {
          id: true,
          slug: true,
          nome: true,
          site: true,
          redes_sociais: true,
          area_atuacao: true,
          areas_atuacao: true,
          areaAtuacaoId: true,
          category: true,
          categoryRel: { select: { nome: true } },
          areaAtuacaoRel: { select: { nome: true } },
          estagio: true,
          descricao: true,
          descritivo_basico: true,
          youtube_url: true,
          problema: true,
          solucao: true,
          modelo_receita: true,
          diferencial: true,
          mercado_alvo: true,
          espera_alcancar: true,
          dedicacao: true,
          compradores: true,
          investimento_previo: true,
          concorrencia: true,
          uso_recursos: true,
          /** Equipe (sócios + percentual e time fundador). */
          socios: true,
          teams: true,
          seals: {
            where: { seal: { active: true } },
            orderBy: { issuedAt: 'desc' },
            select: {
              issuedAt: true,
              seal: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  description: true,
                  imagePath: true,
                  category: true,
                },
              },
            },
          },
          pitch_deck: { select: { url: true, url_md: true, url_web: true } },
          documents: {
            where: { categoria: 'PITCH_DECK' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { s3Key: true },
          },
          logo: { select: { url: true } },
          cover: { select: { url: true } },
          campaigns: {
            ...(preview ? {} : { where: { status: 'OPEN' } }),
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              title: true,
              targetAmount: true,
              minInvestment: true,
              valuation: true,
              tokenPrice: true,
              tokenBaseValue: true,
              tokenSellPrice: true,
              adminFeeValue: true,
              totalTokens: true,
              tokensSold: true,
              deadline: true,
              affiliateCommissionPct: true,
              sociosCount: true,
              problema: true,
              solucao: true,
              modeloReceita: true,
              diferencial: true,
              mercadoAlvo: true,
              dedicacao: true,
              compradores: true,
              investimentoPrevio: true,
              concorrencia: true,
              objetivoCaptacao: true,
              oQueEsperaAlcancar: true,
              participacaoLucros: true,
              faturamentoMinimoLucros: true,
              politicaLucros: true,
              beneficiosAdicionais: true,
              beneficiosDescricao: true,
              resources: {
                select: { categoria: true, percentual: true },
              },
            },
          },
        },
      });

      const campaign = startup?.campaigns[0];
      if (!startup || !campaign) {
        return ResponseDto.error(
          'Startup não encontrada ou sem rodada disponível',
          404,
        );
      }

      const [investors, repasseAgg, legacyRaised] = await Promise.all([
        this.prisma.investment.count({
          where: { campaignId: campaign.id, status: 'CONFIRMED' },
        }),
        // Captado para a startup = repasse (preco base x tokens vendidos),
        // nao o total cobrado do investidor.
        this.prisma.investment.aggregate({
          where: { campaignId: campaign.id, status: 'CONFIRMED' },
          _sum: { startupRepasseAmount: true },
        }),
        this.prisma.investment.aggregate({
          where: {
            campaignId: campaign.id,
            status: 'CONFIRMED',
            startupRepasseAmount: null,
          },
          _sum: { amount: true },
        }),
      ]);
      const raisedSum =
        Number(repasseAgg._sum.startupRepasseAmount ?? 0) +
        Number(legacyRaised._sum.amount ?? 0);

      const totalTokens = Number(campaign.totalTokens);
      const tokensSold = Number(campaign.tokensSold);
      const tokensAvailable = Math.max(0, totalTokens - tokensSold);
      const percentage =
        totalTokens > 0 ? Math.round((tokensSold / totalTokens) * 100) : 0;
      const remainingDays = Math.max(
        0,
        Math.ceil(
          (campaign.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        ),
      );
      const formatBrl = (value: number) =>
        value.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        });
      const equityPercent =
        Number(campaign.valuation) > 0
          ? (Number(campaign.targetAmount) / Number(campaign.valuation)) * 100
          : null;

      // Modelo B: preco de venda = tokenSellPrice (snapshot) com fallback
      // para tokenPrice legado; a taxa do investidor e a aliquota vigente
      // fundraising.platformFee — a MESMA que InvestmentsService.create
      // cobra. Nao derivar de adminFeeValue (fee sobre a captacao = 20%).
      const sellPrice = Number(campaign.tokenSellPrice ?? campaign.tokenPrice);
      const feePctRaw = this.configService
        ? await this.configService.getEffective('fundraising.platformFee')
        : null;
      const platformFeePct =
        typeof feePctRaw === 'number' && Number.isFinite(feePctRaw)
          ? feePctRaw
          : null;

      const detail = {
        slug: startup.slug,
        name: startup.nome,
        logo: startup.logo?.url || '',
        cover: startup.cover?.url || '',
        description: startup.descricao || '',
        category:
          startup.areaAtuacaoRel?.nome ??
          startup.area_atuacao ??
          startup.categoryRel?.nome ??
          startup.category ??
          'Outros',
        ...(await this.getAreasPayload(
          startup.areas_atuacao,
          startup.areaAtuacaoId,
        )),
        stage: startup.estagio || '',
        website: startup.site,
        socialLinks: startup.redes_sociais,
        youtubeUrl: startup.youtube_url,
        pitchVideoUrl: null,
        pitchDeckUrl: await this.resolvePitchDeckUrl(
          startup.pitch_deck,
          startup.documents?.[0]?.s3Key,
        ),
        problema: startup.problema ?? campaign.problema,
        solucao: startup.solucao ?? campaign.solucao,
        descritivoBasico: startup.descritivo_basico,
        modeloReceita: startup.modelo_receita ?? campaign.modeloReceita,
        diferencial: startup.diferencial ?? campaign.diferencial,
        mercadoAlvo: startup.mercado_alvo ?? campaign.mercadoAlvo,
        esperaAlcancar: startup.espera_alcancar ?? campaign.oQueEsperaAlcancar,
        dedicacao: startup.dedicacao ?? campaign.dedicacao,
        compradores: startup.compradores ?? campaign.compradores,
        investimentoPrevio:
          startup.investimento_previo ?? campaign.investimentoPrevio,
        concorrencia: startup.concorrencia ?? campaign.concorrencia,
        usoRecursos:
          Array.isArray(startup.uso_recursos) && startup.uso_recursos.length
            ? startup.uso_recursos
            : (campaign.resources ?? []).map((resource) => ({
                category: resource.categoria,
                percentual: resource.percentual,
              })),
        objetivoCaptacao: campaign.objetivoCaptacao,
        sociosCount: campaign.sociosCount,
        participacaoLucros: campaign.participacaoLucros,
        faturamentoMinimoLucros: campaign.faturamentoMinimoLucros,
        politicaLucros: campaign.politicaLucros,
        beneficiosAdicionais: campaign.beneficiosAdicionais,
        beneficiosDescricao: campaign.beneficiosDescricao,
        affiliateCommissionPct: campaign.affiliateCommissionPct,
        seals: startup.seals?.map(({ seal }) => seal) ?? [],
        /** Equipe vinda do JSON do banco — exibida em TeamSection. */
        socios: (startup.socios as SocioDto[] | null) ?? [],
        teams: (startup.teams as TeamDto[] | null) ?? [],
        metrics: {
          valuation: formatBrl(Number(campaign.valuation)),
          tokenPrice: formatBrl(sellPrice),
          tokensAvailable: tokensAvailable.toLocaleString('pt-BR'),
          investors: investors.toLocaleString('pt-BR'),
        },
        campaign: {
          title: campaign.title,
          raised: formatBrl(raisedSum),
          goal: formatBrl(Number(campaign.targetAmount)),
          percentage,
          equity:
            equityPercent == null
              ? '—'
              : `${equityPercent.toLocaleString('pt-BR', {
                  maximumFractionDigits: 2,
                })}%`,
          minInvestment: formatBrl(Number(campaign.minInvestment)),
          remainingDays,
          deadline: campaign.deadline.toISOString(),
        },
        investment: {
          campaignId: campaign.id,
          tokenPrice: sellPrice,
          tokenBasePrice:
            campaign.tokenBaseValue != null
              ? Number(campaign.tokenBaseValue)
              : null,
          // Aliquota cobrada do investidor no checkout (fundraising.platformFee).
          platformFeePct,
          minInvestment: Number(campaign.minInvestment),
          tokensAvailable,
        },
      };

      return ResponseDto.success(
        includeInternalId
          ? 'Detalhe privado da startup encontrado'
          : 'Oportunidade autenticada encontrada',
        200,
        includeInternalId ? { id: startup.id, ...detail } : detail,
      );
    } catch (error) {
      return ResponseDto.error(
        'Erro ao buscar detalhe privado da startup',
        500,
        error,
      );
    }
  }

  /**
   * Retorna startup por ID para visualização pública.
   *
   * @param id ID da startup
   * @returns ResponseDto com startup
   */
  async findOne(id: number) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id },
        include: {
          logo: { select: { url: true } },
          cover: { select: { url: true } },
          campaigns: {
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              totalTokens: true,
              tokensSold: true,
              tokenPrice: true,
              tokenBaseValue: true,
              tokenSellPrice: true,
              targetAmount: true,
              minInvestment: true,
              deadline: true,
            },
          },
          founder: {
            select: { id: true, nome: true },
          },
        },
      });

      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }

      const totalTokensSold = startup.campaigns.reduce(
        (sum, c) => sum + c.tokensSold,
        0,
      );
      const percentSold = startup.campaigns[0]
        ? Math.round((totalTokensSold / startup.campaigns[0].totalTokens) * 100)
        : 0;

      return ResponseDto.success('Startup encontrada com sucesso', 200, {
        ...startup,
        ...(await this.getAreasPayload(
          startup.areas_atuacao,
          startup.areaAtuacaoId,
        )),
        campaigns: undefined,
        campaignStatus: startup.campaigns[0]?.status ?? null,
        totalTokensSold,
        percentSold,
      });
    } catch (error) {
      return ResponseDto.error('Erro ao buscar startup', 500, error);
    }
  }

  /**
   * Retorna startup por ID para admin.
   *
   * @param id ID da startup
   * @returns ResponseDto com startup
   */
  async findOneAdmin(id: number) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id },
        include: {
          founder: { select: { id: true, nome: true, email: true } },
          logo: true,
          cover: true,
          pitch_deck: true,
          documents: {
            orderBy: { createdAt: 'desc' },
          },
          documentNAs: true,
          campaigns: {
            // D8: alocação de recursos por categoria — necessária para o admin
            // avaliar a destinação na Fase 3 (/admin/startups/:id/3).
            include: {
              resources: {
                select: {
                  categoria: true,
                  percentual: true,
                  descricaoCustomizada: true,
                },
              },
            },
          },
        },
      });

      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }

      return ResponseDto.success(
        'Startup encontrada com sucesso',
        200,
        startup,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao buscar startup', 500, error);
    }
  }

  /**
   * Reenvia uma startup rejeitada para nova análise da curadoria.
   */
  async resubmit(id: number, user: PayloadEntity) {
    const startup = await this.prisma.startup.findUnique({
      where: { id },
      select: { id: true, founderId: true, status: true },
    });

    if (!startup) return ResponseDto.error('Startup nao encontrada', 404);
    if (startup.founderId !== user.id && user.role !== 'ADMIN') {
      return ResponseDto.error('Acesso negado', 403);
    }
    if (startup.status !== 'REJECTED') {
      return ResponseDto.error(
        'Somente startups rejeitadas podem ser ressubmetidas.',
        400,
      );
    }

    const updated = await this.prisma.startup.update({
      where: { id },
      data: { status: 'PENDING_CURATOR_REVIEW' },
    });

    await this.auditService.log({
      userId: user.id,
      action: 'STARTUP_RESUBMITTED',
      entity: 'Startup',
      entityId: String(id),
      oldValue: { status: startup.status },
      newValue: { status: updated.status },
    });

    return ResponseDto.success(
      'Startup ressubmetida para nova analise.',
      200,
      updated,
    );
  }

  /**
   * Atualiza dados de uma startup (T034: bloqueio pós-rodada).
   *
   * @param id ID da startup
   * @param data Dados para atualização
   * @param user Usuário autenticado (opcional)
   * @returns ResponseDto ou resultado do Prisma
   */
  async update(id: number, data: UpdateStartupDto, user?: any) {
    const startup = await this.prisma.startup.findUnique({
      where: { id },
      select: { id: true, founderId: true, categoryId: true },
    });

    if (!startup) {
      return ResponseDto.error('Startup nao encontrada', 404);
    }

    if (user && startup.founderId !== user.id && user.role !== 'ADMIN') {
      return ResponseDto.error('Acesso negado', 403);
    }

    const criticalFields: Array<'cnpj' | 'razaoSocial' | 'pais'> = [
      'cnpj',
      'razaoSocial',
      'pais',
    ];
    const blockedFields = criticalFields.filter(
      (f) => (data as any)[f] !== undefined,
    );

    if (blockedFields.length > 0) {
      const closedCampaign = await this.prisma.campaign.findFirst({
        where: { startupId: id, status: { in: ['CLOSED', 'FUNDED'] } },
        select: { id: true },
      });
      if (closedCampaign) {
        return ResponseDto.error(
          'Campos criticos nao podem ser alterados apos rodada finalizada.',
          403,
          { code: 'CAMPO_BLOQUEADO_POS_RODADA', fields: blockedFields },
        );
      }
    }

    if (data.cnpj) {
      const masked = this.maskCnpj(data.cnpj);
      this.logger.log(`Update startup ${id} cnpj=${masked}`);
    }

    const areaAtuacaoIds =
      data.areaAtuacaoIds ??
      (data.areaAtuacaoId !== undefined ? [data.areaAtuacaoId] : undefined);
    if (areaAtuacaoIds !== undefined) {
      const categoryId = data.categoryId ?? startup.categoryId;
      if (categoryId === null || categoryId === undefined) {
        return ResponseDto.error(
          'A categoria é obrigatória ao atualizar as áreas de atuação.',
          400,
        );
      }
      try {
        await validateCategoryAreasCoherence(
          categoryId,
          areaAtuacaoIds,
          this.prisma,
        );
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          return ResponseDto.error(error.message, error.getStatus());
        }
        throw error;
      }
    }

    const socialValues = data.redes_sociais;
    if (socialValues) {
      const socialErrors = validateSocialUrls({
        linkedin: socialValues.linkedin,
        instagram: socialValues.instagram,
        twitter: socialValues.twitter,
      });
      if (socialErrors.length > 0) {
        return ResponseDto.error(socialErrors.join(' '), 400);
      }
    }

    const updateData: any = { ...data };
    delete updateData.areaAtuacaoIds;
    if (socialValues) {
      updateData.redes_sociais = Object.fromEntries(
        Object.entries(socialValues).filter(([, value]) => value !== undefined),
      );
    }
    if (areaAtuacaoIds !== undefined) {
      updateData.areas_atuacao = areaAtuacaoIds;
      updateData.areaAtuacaoId = areaAtuacaoIds[0] ?? null;
    }
    if (data.categoryId !== undefined && data.category !== undefined) {
      delete updateData.category;
    }

    // O formulário envia a data sem horário (YYYY-MM-DD), enquanto o Prisma
    // exige um DateTime ISO completo para a coluna data_fundacao.
    if (data.data_fundacao !== undefined) {
      const dateValue = new Date(`${data.data_fundacao}T00:00:00.000Z`);
      if (Number.isNaN(dateValue.getTime())) {
        return ResponseDto.error('Data de fundação inválida.', 400);
      }
      updateData.data_fundacao = dateValue;
    }

    // `pais` é JSON no SQLite. O ValidationPipe transforma o DTO aninhado
    // em uma instância de PaisDto; normalizar evita que o Prisma receba
    // protótipos de classe ou propriedades undefined no JSON.
    if (data.pais !== undefined) {
      const pais = data.pais;
      updateData.pais = Object.fromEntries(
        Object.entries({
          nome: pais.nome,
          codigo: pais.codigo,
          emoji: pais.emoji,
          cep: pais.cep,
          cidade: pais.cidade,
          uf: pais.uf,
          logradouro: pais.logradouro,
          numero: pais.numero,
          complemento: pais.complemento,
          bairro: pais.bairro,
        }).filter(([, value]) => value !== undefined),
      );
    }

    // logo_id/cover_id chegam como ids da tabela Upload (POST /uploads).
    // As FKs apontam para KYCProfile — converter aqui para evitar colisao
    // de ids entre as tabelas (imagem errada exibida na startup).
    for (const field of ['logo_id', 'cover_id'] as const) {
      const mediaId = data[field];
      if (mediaId === undefined || mediaId === null) continue;
      const resolved = await this.resolveMediaToKycProfileId(mediaId, user?.id);
      if (resolved === null) {
        return ResponseDto.error(
          field === 'logo_id'
            ? 'Logo enviado nao encontrado. Faca o upload novamente.'
            : 'Banner enviado nao encontrado. Faca o upload novamente.',
          400,
        );
      }
      updateData[field] = resolved;
    }

    const oldStartup = await this.prisma.startup.findUnique({
      where: { id },
      select: { nome: true, descricao: true, estagio: true, cnpj: true },
    });

    let result: Awaited<ReturnType<typeof this.prisma.startup.update>>;
    try {
      result = await this.prisma.startup.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao atualizar startup ${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return ResponseDto.error(
        'Não foi possível salvar os dados da startup.',
        500,
      );
    }

    // A quantidade exibida na fase de captação deve ser derivada dos sócios
    // detalhados da startup, evitando divergência entre as duas telas.
    if (data.socios !== undefined) {
      const activeCampaign = await this.prisma.campaign.findFirst({
        where: { startupId: id, status: { in: ['DRAFT', 'OPEN'] } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (activeCampaign) {
        await this.prisma.campaign.update({
          where: { id: activeCampaign.id },
          data: { sociosCount: data.socios.length },
        });
      }
    }

    await this.auditService.log({
      userId: user?.id ?? null,
      action: 'STARTUP_UPDATED',
      entity: 'Startup',
      entityId: String(id),
      oldValue: {
        nome: oldStartup?.nome,
        descricao: oldStartup?.descricao,
        estagio: oldStartup?.estagio,
      },
      newValue: {
        nome: data.nome ?? result.nome,
        descricao: data.descricao ?? result.descricao,
        estagio: data.estagio ?? result.estagio,
      },
    });

    return result;
  }

  /**
   * Remove uma startup.
   *
   * @param id ID da startup
   * @param user Usuário autenticado
   * @returns ResponseDto
   */
  async remove(id: number, user?: any) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id },
        select: { founderId: true },
      });

      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }

      if (user && startup.founderId !== user.id) {
        return ResponseDto.error('Apenas o fundador pode deletar', 403);
      }

      // snapshot antes do delete
      const snapshot = await this.prisma.startup.findUnique({
        where: { id },
        select: { nome: true, cnpj: true, status: true, slug: true },
      });

      await this.prisma.startup.delete({ where: { id } });
      await this.invalidateUserCaches(user.id);

      await this.auditService.log({
        userId: user?.id ?? null,
        action: 'STARTUP_DELETED',
        entity: 'Startup',
        entityId: String(id),
        oldValue: snapshot
          ? {
              nome: snapshot.nome,
              cnpj: snapshot.cnpj,
              status: snapshot.status,
              slug: snapshot.slug,
            }
          : undefined,
      });

      return ResponseDto.success('Startup removida com sucesso', 200);
    } catch (error) {
      return ResponseDto.error('Erro ao remover startup', 500, error);
    }
  }
}
