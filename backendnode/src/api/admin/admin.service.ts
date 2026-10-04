import { Injectable, Logger, Optional } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { EmailService } from '../../email/email.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { S3Service } from 'src/s3/s3.service';
import { PayoutAuditService } from '../repasses/payout-audit.service';
import { NotificationType } from '../notifications/dto/query-notifications.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { SealsService } from '../seals/seals.service';
import { UploadsService } from '../uploads/uploads.service';
import {
  pickPublicProfilePayload,
  publicSessionProfileSelect,
} from 'src/auth/session/public-payload';
import { SessionService } from '../../auth/session/session.service';
import { AffiliateCommissionService } from '../affiliate/affiliate-commission.service';
import { FaceMatchService } from '../users/biometric/face-match.service';
import { KycEvents, KycUserDecidedEvent } from './events/kyc-events';
import {
  StartupDocumentEvents,
  StartupDocumentRejectedEvent,
} from './events/startup-document-events';

type KycCleanupOwner = {
  id: number;
  nome: string;
  email: string;
  avatar_id: number | null;
  comprovante_id: number | null;
  documento_id: number | null;
  biofacial_id: number | null;
};

type KycCleanupPreparation =
  | { ok: true; owner: KycCleanupOwner; uploadIds: number[] }
  | { ok: false; message: string };

/**
 * Admin Service - Camada de lógica de negócio para operações administrativas
 *
 * Responsabilidades:
 * - Dashboard KPIs (totalUsers, totalStartups, activeCampaigns, totalInvested)
 * - Gestão de startups (approve/reject, aplicação de selos)
 * - Gestão de usuários (filtros por role e KYC, enable/disable)
 * - KYC Compliance (aprovação/rejeição de documentos de users e startups)
 * - Emissão de selos (KYC_VERIFIED, STARTUP_VERIFIED, COMPLIANCE_APPROVED)
 */
/**
 * Delay padrão (em horas) entre a aprovação da Fase 3 e a publicação da startup
 * no marketplace. O founder pode torná-la imediata contratando "Publicação
 * Rápida" (FAST_DEPLOY). Mantido como constante por ora — pode ser promovido a
 * SystemConfig (`PUBLISH_DELAY_HOURS`) numa sprint dedicada sem alterar o fluxo.
 */
export const PUBLISH_DELAY_HOURS = 24;

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sealsService: SealsService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly sessionService: SessionService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
    @Optional()
    private readonly uploadsService?: UploadsService,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
    @Optional()
    private readonly s3Service?: S3Service,
    @Optional()
    private readonly payoutAudit?: PayoutAuditService,
    @Optional()
    private readonly affiliateCommissionService?: AffiliateCommissionService,
    @Optional()
    private readonly faceMatchService?: FaceMatchService,
  ) {}

  // =====================================================
  // DASHBOARD KPIs
  // =====================================================

  /**
   * Retorna KPIs do dashboard administrativo
   * @returns totalUsers, totalStartups, activeCampaigns, totalInvested
   */
  async getDashboardKPIs() {
    try {
      const [totalUsers, totalStartups, activeCampaigns, totalInvestedResult] =
        await Promise.all([
          this.prisma.user.count(),
          this.prisma.startup.count(),
          this.prisma.campaign.count({ where: { status: 'OPEN' } }),
          this.prisma.investment.aggregate({
            _sum: { amount: true },
            where: { status: 'CONFIRMED' },
          }),
        ]);

      const totalInvested = totalInvestedResult._sum.amount
        ? Number(totalInvestedResult._sum.amount)
        : 0;

      const kpis = {
        totalUsers,
        totalStartups,
        activeCampaigns,
        totalInvested,
      };

      this.logger.log(`Dashboard KPIs retrieved: ${JSON.stringify(kpis)}`);

      return ResponseDto.success(
        'KPIs do dashboard retrieved successfully',
        200,
        kpis,
      );
    } catch (error) {
      this.logger.error(`Error fetching dashboard KPIs: ${error.message}`);
      return ResponseDto.error('Error fetching dashboard KPIs', 500, error);
    }
  }

  // =====================================================
  // STARTUPS MANAGEMENT
  // =====================================================

  /**
   * Lista startups de forma paginada com filtros
   * @param query.page Número da página
   * @param query.limit Itens por página
   * @param query.status Filtro por status (PENDING, APPROVED, REJECTED)
   * @param query.search Busca por nome, área de atuação ou estágio
   */
  async listStartups(query: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    segmento?: string;
    cursor?: number;
  }) {
    try {
      const limit = Math.min(query.limit || 25, 100);
      const cursor = query.cursor;
      const useOffset = cursor === undefined;
      const page = query.page || 1;

      const where: any = {};

      if (query.segmento) {
        where.area_atuacao = query.segmento;
      }

      const search = query.search?.trim();
      if (search) {
        where.OR = [
          { nome: { contains: search } },
          { area_atuacao: { contains: search } },
          { estagio: { contains: search } },
        ];
      }

      const [startups, total] = await Promise.all([
        this.prisma.startup.findMany({
          where,
          take: limit + 1,
          ...(useOffset ? { skip: (page - 1) * limit } : {}),
          ...(cursor !== undefined ? { cursor: { id: cursor }, skip: 1 } : {}),
          orderBy: { id: 'desc' },
          include: {
            founder: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            logo: {
              select: {
                url_sm: true,
              },
            },
            campaigns: {
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                tokensSold: true,
                totalTokens: true,
                status: true,
                targetAmount: true,
              },
            },
          },
        }),
        useOffset ? this.prisma.startup.count({ where }) : Promise.resolve(0),
      ]);

      const hasMore = startups.length > limit;
      const items = hasMore ? startups.slice(0, limit) : startups;

      const formattedStartups = items.map((startup) => {
        const tokensSold = startup.campaigns.reduce(
          (sum, c) => sum + (c.tokensSold || 0),
          0,
        );
        const totalTokens = startup.campaigns.reduce(
          (sum, c) => sum + (c.totalTokens || 0),
          0,
        );

        return {
          id: startup.id,
          nome: startup.nome,
          slug: startup.slug,
          status: startup.status,
          area_atuacao: startup.area_atuacao,
          estagio: startup.estagio,
          founder: startup.founder,
          logo: startup.logo?.url_sm || null,
          campaigns: startup.campaigns,
          totalTokens,
          tokensSold,
          createdAt: startup.createdAt,
        };
      });

      const nextCursor =
        !useOffset && hasMore ? items[items.length - 1].id : null;

      const response = ResponseDto.success(
        'Startups retrieved successfully',
        200,
        formattedStartups,
        total,
        useOffset ? page : undefined,
      );
      if (nextCursor !== null) {
        (response as { nextCursor?: number }).nextCursor = nextCursor;
      }
      return response;
    } catch (error) {
      this.logger.error(`Error listing startups: ${error.message}`);
      return ResponseDto.error('Error listing startups', 500, error);
    }
  }

  /**
   * Atualiza status de uma startup (approve/reject)
   * @param id ID da startup
   * @param status Novo status (APPROVED, REJECTED)
   * @param justification Justificativa da decisão
   */
  /**
   * Grava uma decisão de auditoria (APPROVED/REJECTED) sobre uma startup.
   *
   * Quando `decision === 'REJECTED'`, persiste um snapshot dos campos da
   * startup no momento da rejeição em `rejectedSnapshot` (JSON). O frontend
   * admin compara esse snapshot com o estado atual para destacar
   * campo-a-campo o que o founder atualizou (fluxo §5.3).
   *
   * Para APPROVED, `rejectedSnapshot` fica null (não há diff para calcular).
   *
   * Desnormaliza `adminName`/`adminEmail` no momento da decisão — se o User
   * for deletado depois (LGPD), a UI ainda mostra "Aprovado por X".
   *
   * Idempotência: cada chamada gera uma nova linha (histórico completo).
   * A "última decisão" por fase é a `findFirst` mais recente.
   */
  async createReviewDecision(params: {
    startupId: number;
    phase: number;
    decision: 'APPROVED' | 'REJECTED';
    justification?: string;
    adminUserId?: number | null;
    adminName?: string | null;
    adminEmail?: string | null;
    ip?: string | null;
  }) {
    const { startupId, phase, decision, justification } = params;

    // Snapshot dos campos relevantes (apenas para REJECTED).
    // Serializa os campos textuais/editáveis do wizard — ignora binários
    // (logo, cover, documents[]) para manter o JSON pequeno.
    let rejectedSnapshot: Record<string, unknown> | null = null;
    if (decision === 'REJECTED') {
      const startup = await this.prisma.startup.findUnique({
        where: { id: startupId },
        select: {
          nome: true,
          razao_social: true,
          cnpj: true,
          telefone: true,
          email: true,
          site: true,
          area_atuacao: true,
          estagio: true,
          descricao: true,
          redes_sociais: true,
          // CVM Res. 88/2022 — campos do Material Informativo Essencial
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
          oferece_lucros: true,
          lucros_descricao: true,
          oferece_beneficios: true,
          beneficios_descricao: true,
          // Dados bancários
          banco: true,
          agencia: true,
          conta: true,
          digito: true,
          tipo_conta: true,
          pix_key: true,
          titular: true,
          documento_titular: true,
          // Estrutura
          socios: true,
          teams: true,
          updatedAt: true,
        },
      });
      rejectedSnapshot = startup
        ? { ...startup, _snapshotAt: new Date().toISOString() }
        : null;
    }

    return this.prisma.startupReviewDecision.create({
      data: {
        startupId,
        phase,
        decision,
        justification: justification ?? null,
        adminUserId: params.adminUserId ?? null,
        adminName: params.adminName ?? null,
        adminEmail: params.adminEmail ?? null,
        rejectedSnapshot: (rejectedSnapshot as any) ?? null,
        ip: params.ip ?? null,
      },
    });
  }

  /**
   * Última decisão de uma fase específica (ou null se nunca decidida).
   * Usado pela UI admin para mostrar "Aprovado por X em DD/MM" ou
   * "Rejeitado por X — Motivo: ...".
   *
   * Fallback legada: decisões gravadas antes do campo `phase` ter sido
   * enviado pelo frontend são salvas com `phase=0` (admin.service.ts:380).
   * Para não "esconder" essas decisões antigas da UI, fazemos um fallback:
   * se não há decisão para a fase específica (1/2/3), retornamos a
   * decisão com phase=0 (legado) como fallback. Decisões da fase
   * específica sempre têm prioridade.
   */
  async getLatestDecisionForPhase(startupId: number, phase: number) {
    const specific = await this.prisma.startupReviewDecision.findFirst({
      where: { startupId, phase },
      orderBy: { createdAt: 'desc' },
    });
    if (specific) return specific;
    if (phase === 0) return null; // já tentamos phase=0 acima
    return this.prisma.startupReviewDecision.findFirst({
      where: { startupId, phase: 0 },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Histórico completo de decisões da startup (todas as fases).
   * Ordenado do mais recente para o mais antigo.
   */
  async listDecisions(startupId: number) {
    return this.prisma.startupReviewDecision.findMany({
      where: { startupId },
      orderBy: [{ phase: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateStartupStatus(
    id: number,
    status: string,
    justification?: string,
    options?: {
      phase?: number;
      adminUserId?: number;
      adminName?: string;
      adminEmail?: string;
      ip?: string | null;
    },
  ) {
    try {
      const startup = await this.prisma.startup.findUnique({ where: { id } });

      if (!startup) {
        return ResponseDto.error('Startup not found', 404);
      }

      if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
        return ResponseDto.error(
          'Invalid status. Must be APPROVED, REJECTED, or PENDING',
          400,
        );
      }

      const updated = await this.prisma.startup.update({
        where: { id },
        data: { status: status as any },
        include: {
          founder: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
          logo: true,
          campaigns: true,
        },
      });

      this.logger.log(
        `Startup ${id} status updated to ${status} by admin. Justification: ${justification || 'N/A'}`,
      );

      await this.auditService.log({
        userId: null,
        action: 'STARTUP_STATUS_CHANGED',
        entity: 'Startup',
        entityId: String(id),
        oldValue: { status: startup.status },
        newValue: { status, justification: justification ?? null },
      });

      // Grava a decisão na tabela dedicada `startup_review_decisions`
      // (fluxo admin-startups-phases §5.3). Mantém o AuditLog como
      // trilha imutável e essa tabela como fonte da verdade da UI.
      if (status === 'APPROVED' || status === 'REJECTED') {
        await this.createReviewDecision({
          startupId: id,
          phase: options?.phase ?? 0, // 0 = decisão global (legado sem fase)
          decision: status as 'APPROVED' | 'REJECTED',
          justification,
          adminUserId: options?.adminUserId ?? null,
          adminName: options?.adminName ?? null,
          adminEmail: options?.adminEmail ?? null,
          ip: options?.ip ?? null,
        }).catch((e) =>
          this.logger.error(
            `Falha ao gravar StartupReviewDecision para startup ${id}: ${(e as Error).message}`,
          ),
        );
      }

      if (status === 'APPROVED') {
        await this.sealsService
          .autoAssignVerified(id)
          .catch((e) =>
            this.logger.warn(
              `Falha ao auto-atribuir startup_verificada: ${e?.message}`,
            ),
          );

        // BUG-FT-007: selo de estágio (STAGE) — auto-aplicado SÓ na Fase 3
        // (ou no caso legado sem `options.phase`). Fases 1/2 são auditoria
        // do cadastro/documentos; o founder pode mudar a startup.estagio
        // antes da Fase 3, então aplicar antes causaria trocas intermediárias.
        const phase = options?.phase;
        const applyStageSeal = phase === undefined || phase === 3;
        if (applyStageSeal) {
          await this.sealsService
            .autoAssignStage(id, updated.estagio ?? null)
            .catch((e) =>
              this.logger.warn(
                `Falha ao auto-atribuir selo de estágio: ${e?.message}`,
              ),
            );
        }

        // Gate de promoção da captação (DRAFT → OPEN) — SOMENTE na aprovação
        // da Fase 3 (Detalhes de Captação). Fases 1 e 2 são auditoria do
        // cadastro/documentos e não devem abrir a captação automaticamente.
        //
        // Caso legado (sem `options.phase`): mantém o comportamento anterior
        // (sempre tenta abrir), preservando compatibilidade com chamadas que
        // não diferenciam fase (admin-kyc decideStartup, etc.).
        const shouldOpenCampaign = phase === undefined || phase === 3;

        let campaignOpenResult:
          | {
              ok: boolean;
              reason?: string;
              campaignId?: number;
              scheduled?: boolean;
              scheduledPublishAt?: Date;
              fastDeploy?: boolean;
            }
          | undefined;

        if (shouldOpenCampaign) {
          try {
            campaignOpenResult = await this.openCampaignOnApproval(id);
            if (!campaignOpenResult.ok) {
              this.logger.warn(
                `Startup ${id} aprovada${phase ? ` (Fase ${phase})` : ''}, ` +
                  `mas campanha não foi aberta: ${campaignOpenResult.reason}. ` +
                  'Auditoria gravada normalmente; founder deve preencher os ' +
                  'parâmetros de captação ou pagar a taxa de compliance antes ' +
                  'da próxima tentativa.',
              );
            }
          } catch (e) {
            this.logger.error(
              `Falha ao abrir campanha da startup ${id} na aprovação: ${
                (e as Error).message
              }`,
            );
          }
        }

        // Notificações in-app + e-mail (best-effort) via listener de domínio.
        // Só dispara o startup.approved quando a campanha realmente abriu —
        // senao o founder recebe o e-mail "aprovada" antes de poder preencher
        // os parametros, o que causa confusao no fluxo (CASE.md
        // [Aprovacao por Fases]).
        if (campaignOpenResult?.ok === true) {
          // BUG-FT-007: selo "Lançamento" (slug `lancamento`) — só quando
          // a campanha abriu OPEN imediatamente (FAST_DEPLOY contratado).
          // Founder sem FAST_DEPLOY → publicação agendada +24h, sem selo.
          if (campaignOpenResult.fastDeploy === true) {
            await this.sealsService
              .autoAssignFastDeploy(id)
              .catch((e) =>
                this.logger.warn(
                  `Falha ao auto-atribuir Lançamento (FAST_DEPLOY): ${e?.message}`,
                ),
              );
          }

          this.eventEmitter?.emit('startup.approved', {
            startupId: id,
            // Publicação: imediata (FAST_DEPLOY) ou agendada (+24h). O listener
            // usa esses campos para o e-mail de conclusão mostrar o tempo de
            // publicação (CASE.md [Publicação]).
            fastDeploy: campaignOpenResult.fastDeploy === true,
            scheduled: campaignOpenResult.scheduled === true,
            scheduledPublishAt:
              campaignOpenResult.scheduledPublishAt?.toISOString() ?? null,
          });
        } else {
          this.eventEmitter?.emit('startup.phase_approved', {
            startupId: id,
            phase: phase ?? null,
            campaignOpened: false,
            reason: campaignOpenResult?.reason,
          });
        }
      } else if (status === 'REJECTED') {
        // Notificação da rejeição (in-app + e-mail) via
        // StartupNotificationService.onStartupRejected.
        // O listener usa a phase para que a UI do founder saiba qual etapa
        // foi rejeitada (mensagem "Etapa X rejeitada" vs "Startup rejeitada").
        // Best-effort: nunca quebra a resposta HTTP da decisão.
        this.eventEmitter?.emit('startup.rejected', {
          startupId: id,
          phase: options?.phase ?? null,
          reason: justification ?? undefined,
        });
      }

      return ResponseDto.success(
        `Startup ${status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'updated'} successfully`,
        200,
        updated,
      );
    } catch (error) {
      this.logger.error(`Error updating startup status: ${error.message}`);
      return ResponseDto.error('Error updating startup status', 500, error);
    }
  }

  /**
   * Abre a campanha da startup ao aprovar o gate final (Fase 3) — SOMENTE
   * quando todos os pré-requisitos de domínio estão atendidos.
   *
   * Pré-requisitos (todos obrigatórios):
   *  1. NÃO há campanha OPEN ainda (idempotência).
   *  2. Existe uma campanha DRAFT.
   *  3. A campanha DRAFT tem os parâmetros de captação preenchidos pelo founder
   *     (`targetAmount`, `valuation`, `tokenPrice`, `totalTokens > 0`).
   *     Sem isso, abrir a captação seria um bug grave (investidores veriam uma
   *     campanha sem meta/preço/quantidade definidos).
   *  4. O pagamento `COMPLIANCE_FEE` da startup está PAID — gate regulatório
   *     (CASE.md [Aprovação por Fases] — Fase 3).
   *
   * Quando algum pré-requisito falha, retorna `{ ok: false, reason }` sem
   * alterar estado. O caller (`updateStartupStatus`) decide se aborta a
   * aprovação ou segue só com a auditoria.
   */
  private async openCampaignOnApproval(startupId: number): Promise<{
    ok: boolean;
    reason?: string;
    campaignId?: number;
    scheduled?: boolean;
    scheduledPublishAt?: Date;
    fastDeploy?: boolean;
  }> {
    const alreadyOpen = await this.prisma.campaign.findFirst({
      where: { startupId, status: 'OPEN' },
      select: { id: true },
    });
    if (alreadyOpen) {
      this.logger.log(
        `Startup ${startupId}: já existe campanha OPEN (${alreadyOpen.id}); abertura ignorada (idempotente).`,
      );
      return { ok: true, reason: 'already_open', campaignId: alreadyOpen.id };
    }

    const draft = await this.prisma.campaign.findFirst({
      where: { startupId, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deadline: true,
        targetAmount: true,
        valuation: true,
        tokenPrice: true,
        totalTokens: true,
        fastDeploy: true,
      },
    });
    if (!draft) {
      const reason = 'no_draft_campaign';
      this.logger.warn(
        `Startup ${startupId}: nenhuma campanha DRAFT para abrir na aprovação (${reason}).`,
      );
      return { ok: false, reason };
    }

    // Gate 1 — parâmetros de captação preenchidos. Sem esses 4 campos a
    // campanha não tem sentido econômico (meta, valuation, preço, quantidade).
    const targetAmount = draft.targetAmount ? Number(draft.targetAmount) : 0;
    const valuation = draft.valuation ? Number(draft.valuation) : 0;
    const tokenPrice = draft.tokenPrice ? Number(draft.tokenPrice) : 0;
    const totalTokens = draft.totalTokens ?? 0;
    if (
      targetAmount <= 0 ||
      valuation <= 0 ||
      tokenPrice <= 0 ||
      totalTokens <= 0
    ) {
      const reason = 'draft_campaign_not_filled';
      this.logger.warn(
        `Startup ${startupId}: campanha DRAFT #${draft.id} sem parâmetros de captação ` +
          `(targetAmount=${targetAmount}, valuation=${valuation}, tokenPrice=${tokenPrice}, ` +
          `totalTokens=${totalTokens}). Abertura bloqueada — founder precisa preencher.`,
      );
      return { ok: false, reason, campaignId: draft.id };
    }

    // Gate 2 — Taxa de Compliance paga. Alinhado a CASE.md [Aprovação por
    // Fases] Backend: "Fase 3 só libera quando TOKEN_RESERVATION + TAXA_COMPLIANCE
    // + SERVICOS = PAID" (gate de pagamento da fase 3).
    const complianceFee = await this.prisma.payment.findFirst({
      where: {
        campaignId: draft.id,
        purpose: 'COMPLIANCE_FEE',
        status: 'PAID',
      },
      select: { id: true },
    });
    if (!complianceFee) {
      const reason = 'compliance_fee_not_paid';
      this.logger.warn(
        `Startup ${startupId}: campanha DRAFT #${draft.id} sem COMPLIANCE_FEE PAID. ` +
          'Abertura bloqueada — founder precisa pagar a taxa de compliance.',
      );
      return { ok: false, reason, campaignId: draft.id };
    }

    const now = new Date();
    const DEFAULT_DEADLINE_DAYS = 60;
    const hasFutureDeadline =
      draft.deadline != null &&
      new Date(draft.deadline).getTime() > now.getTime();
    const deadline = hasFutureDeadline
      ? new Date(draft.deadline as Date)
      : new Date(now.getTime() + DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);

    // Regra de publicação (CASE.md [Publicação]):
    //  - Por padrão, a startup só é publicada 24h APÓS a aprovação da Fase 3.
    //    Nesse caso a campanha permanece DRAFT com `scheduledPublishAt` setado;
    //    o cron `ScheduledPublishCron` a transiciona para OPEN quando a hora
    //    chegar.
    //  - Se o founder contratou "Publicação Rápida" (campaign.fastDeploy=true),
    //    a publicação é imediata: abre OPEN agora.
    if (!draft.fastDeploy) {
      const scheduledPublishAt = new Date(
        now.getTime() + PUBLISH_DELAY_HOURS * 60 * 60 * 1000,
      );
      await this.prisma.campaign.update({
        where: { id: draft.id },
        data: {
          // Mantém DRAFT; a publicação (OPEN) é feita pelo cron na hora alvo.
          scheduledPublishAt,
          // Pré-calcula o deadline para o cron reaproveitar.
          deadline,
        },
      });
      await this.auditService.log({
        userId: null,
        action: 'CAMPAIGN_PUBLISH_SCHEDULED_ON_APPROVAL',
        entity: 'Campaign',
        entityId: String(draft.id),
        oldValue: { status: 'DRAFT', scheduledPublishAt: null },
        newValue: {
          status: 'DRAFT',
          scheduledPublishAt: scheduledPublishAt.toISOString(),
        },
      });
      this.logger.log(
        `Startup ${startupId}: campanha ${draft.id} agendada para publicação ` +
          `em ${scheduledPublishAt.toISOString()} (delay padrão de ${PUBLISH_DELAY_HOURS}h).`,
      );
      return {
        ok: true,
        campaignId: draft.id,
        scheduled: true,
        scheduledPublishAt,
        fastDeploy: false,
      };
    }

    // Publicação imediata (FAST_DEPLOY contratado).
    await this.prisma.campaign.update({
      where: { id: draft.id },
      data: {
        status: 'OPEN',
        dataLancamentoRodada: now,
        deadline,
        scheduledPublishAt: now,
      },
    });

    await this.auditService.log({
      userId: null,
      action: 'CAMPAIGN_OPENED_ON_APPROVAL',
      entity: 'Campaign',
      entityId: String(draft.id),
      oldValue: { status: 'DRAFT' },
      newValue: {
        status: 'OPEN',
        dataLancamentoRodada: now.toISOString(),
        fastDeploy: true,
      },
    });

    this.logger.log(
      `Startup ${startupId}: campanha ${draft.id} aberta (OPEN) imediatamente na ` +
        `aprovação da Fase 3 (Publicação Rápida/FAST_DEPLOY).`,
    );
    return {
      ok: true,
      campaignId: draft.id,
      scheduled: false,
      scheduledPublishAt: now,
      fastDeploy: true,
    };
  }

  /**
   * Busca detalhes de uma startup para compliance
   * @param id ID da startup
   */
  async getStartupDetail(id: number) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id },
        include: {
          founder: {
            select: {
              id: true,
              publicId: true,
              nome: true,
              email: true,
              tipo_documento: true,
              reg_documento: true,
              avatar: true,
              comprovante: true,
              documento: true,
              biofacial: true,
            },
          },
          logo: true,
          cover: true,
          pitch_deck: true,
          // Taxonomia "Tipo de Startup" (cascata categoria → área de atuação)
          // preenchida em /founder/startups/:id/edit. Necessária para o admin
          // ver a classificação real (o legado `area_atuacao` pode estar vazio).
          categoryRel: { select: { id: true, nome: true, slug: true } },
          areaAtuacaoRel: { select: { id: true, nome: true, slug: true } },
          documents: {
            orderBy: { createdAt: 'desc' },
          },
          documentNAs: true,
          // Termo de Adesão assinado (PKI). O admin precisa ver o status da
          // assinatura na Fase 2 (data, hash, versão). Sem os certificados
          // completos — apenas metadados de exibição.
          signedDocuments: {
            where: { type: 'termo_adesao' },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              type: true,
              templateVersion: true,
              documentHash: true,
              signatureFounderAt: true,
              signatureStartupAt: true,
              createdAt: true,
            },
          },
          campaigns: {
            include: {
              investments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      nome: true,
                      email: true,
                    },
                  },
                },
              },
              // D8: alocação de recursos por categoria — necessária para o
              // admin avaliar a destinação dos recursos na Fase 3.
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
        return ResponseDto.error('Startup not found', 404);
      }

      // Documents + N/A ja vem pelo `include` no findUnique (acima).
      // Aqui so geramos as presigned URLs para os documentos reais (nao-se-aplica
      // tem URL nula — marker placeholder).
      const documentsWithUrl = await Promise.all(
        (startup.documents ?? []).map(async (doc: any) => {
          const naoSeAplica = doc.nome === 'não_se_aplica.pdf';
          let url: string | null = null;
          if (!naoSeAplica) {
            try {
              url = this.s3Service
                ? await this.s3Service.getUrl('document', doc.s3Key)
                : null;
            } catch (e) {
              this.logger.warn(
                `Falha ao gerar URL do documento ${doc.id}: ${(e as Error).message}`,
              );
            }
          }
          return { ...doc, url };
        }),
      );

      return ResponseDto.success('Startup detail retrieved', 200, {
        ...startup,
        documents: documentsWithUrl,
        documentNAs: startup.documentNAs ?? [],
      });
    } catch (error) {
      this.logger.error(`Error fetching startup detail: ${error.message}`);
      return ResponseDto.error('Error fetching startup detail', 500, error);
    }
  }

  /**
   * S/PAYOUT — "Finalizar Definitivamente" (admin-payout-management §3.6).
   *
   * Orquestra a configuração do repasse de uma campanha FUNDED em um único
   * passo (o admin tem permissão de compliance + financeiro):
   *  1. cria/atualiza o Repasse com numeroParcelas (mín. 12) e o
   *     valorTotalCaptacao = tokenPrice × tokensSold (valor captado);
   *  2. gera N Installments (1/mês via intervaloDias) com valorParcela e a
   *     última absorvendo os centavos residuais.
   *
   * Isso libera o botão "Solicitar Parcela" no dashboard da startup.
   */
  async finalizePayout(
    campaignId: number,
    numeroParcelas: number,
    intervaloDias: number,
    observacao: string | undefined,
    actor: { id: number | null; role?: string | null },
    options?: { primeiraParcelaDias?: number | null },
  ) {
    try {
      const n = Math.trunc(numeroParcelas);
      if (!Number.isInteger(n) || n < 12 || n > 60) {
        return ResponseDto.error(
          'Número de parcelas deve ser um inteiro entre 12 e 60.',
          400,
          { code: 'INVALID_PARCELAS' },
        );
      }
      const intervalo = Math.trunc(intervaloDias);
      if (!Number.isInteger(intervalo) || intervalo < 15 || intervalo > 60) {
        return ResponseDto.error(
          'Intervalo entre parcelas deve estar entre 15 e 60 dias.',
          400,
          { code: 'INVALID_INTERVALO' },
        );
      }

      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          status: true,
          startupId: true,
        },
      });
      if (!campaign) {
        return ResponseDto.error('Campanha não encontrada', 404);
      }
      if (campaign.status !== 'FUNDED') {
        return ResponseDto.error(
          `Campanha não está FUNDED (status atual: ${campaign.status}).`,
          409,
          { code: 'CAMPAIGN_NOT_FUNDED' },
        );
      }

      // Valor captado para repasse = SOMA do repasse por investimento
      // (startupRepasseAmount = tokensQty × preço BASE), não do valor cobrado
      // do investidor — taxa da plataforma e spread são receita da iSelfToken.
      // Linhas legadas (sem split, pre-backfill) caem no `amount`.
      const [repasseAgg, legacyAgg] = await Promise.all([
        this.prisma.investment.aggregate({
          _sum: { startupRepasseAmount: true },
          where: { campaignId, status: 'CONFIRMED' },
        }),
        this.prisma.investment.aggregate({
          _sum: { amount: true },
          where: {
            campaignId,
            status: 'CONFIRMED',
            startupRepasseAmount: null,
          },
        }),
      ]);
      const captacaoBruta = Number(
        (
          Number(repasseAgg._sum.startupRepasseAmount ?? 0) +
          Number(legacyAgg._sum.amount ?? 0)
        ).toFixed(2),
      );
      // Comissões de afiliado saem do repasse da startup — o valor é destinado
      // ao afiliado que trouxe o investidor.
      const comissoes = this.affiliateCommissionService
        ? await this.affiliateCommissionService.getTotalDueByCampaign(
            campaignId,
          )
        : { total: 0 };
      const valorTotal = Number(
        Math.max(0, captacaoBruta - Number(comissoes.total)).toFixed(2),
      );
      if (valorTotal <= 0) {
        return ResponseDto.error(
          'Valor captado inválido para configurar o repasse.',
          400,
          { code: 'INVALID_TOTAL' },
        );
      }

      // valorParcela (2 casas) + última absorve os centavos residuais.
      const valorParcela = Math.floor((valorTotal / n) * 100) / 100;
      const valorUltima = Number(
        (valorTotal - valorParcela * (n - 1)).toFixed(2),
      );

      const baseDate = new Date();
      baseDate.setUTCHours(0, 0, 0, 0);
      // Intervalo da PRIMEIRA parcela — opcional. Quando omitido, assume
      // o mesmo `intervaloDias` (regra antiga, parcel 1 = baseDate + 1 *
      // intervaloDias). Quando o admin passa `primeiraParcelaDias` (ex.: 7),
      // a primeira parcela fica em baseDate + 7d, e subsequentes vao em
      // +intervaloDias entre si.
      const intervaloPrimeira =
        options?.primeiraParcelaDias != null && options.primeiraParcelaDias > 0
          ? options.primeiraParcelaDias
          : intervalo;
      const installmentsData = Array.from({ length: n }, (_, i) => {
        const numero = i + 1;
        const scheduledDate = new Date(baseDate);
        if (numero === 1) {
          scheduledDate.setUTCDate(
            scheduledDate.getUTCDate() + intervaloPrimeira,
          );
        } else {
          // parcela N = parcela 1 + (N-1) * intervalo
          const deltaTotal = intervaloPrimeira + (numero - 1) * intervalo;
          scheduledDate.setUTCDate(scheduledDate.getUTCDate() + deltaTotal);
        }
        // Re-normaliza para UTC midnight (defesa contra DST / server tz).
        scheduledDate.setUTCHours(0, 0, 0, 0);
        return {
          numero,
          valor: numero === n ? valorUltima : valorParcela,
          scheduledDate,
          status: 'AWAITING_REQUEST' as const,
        };
      });

      const repasse = await this.prisma.$transaction(async (tx) => {
        const rep = await tx.repasse.upsert({
          where: { campaignId },
          update: {
            numeroParcelas: n,
            valorParcela,
            valorUltimaParcela: valorUltima,
            intervaloDias: intervalo,
            primeiraParcelaDias: intervaloPrimeira,
            valorTotalCaptacao: valorTotal,
            complianceApprovedAt: new Date(),
            complianceApprovedByUserId: actor.id ?? undefined,
            complianceObservacao: observacao ?? null,
            financeiroConfiguredAt: new Date(),
            financeiroConfiguredByUserId: actor.id ?? undefined,
            status: 'CONFIGURED',
          },
          create: {
            campaignId,
            numeroParcelas: n,
            valorParcela,
            valorUltimaParcela: valorUltima,
            intervaloDias: intervalo,
            primeiraParcelaDias: intervaloPrimeira,
            valorTotalCaptacao: valorTotal,
            complianceApprovedAt: new Date(),
            complianceApprovedByUserId: actor.id ?? undefined,
            complianceObservacao: observacao ?? null,
            financeiroConfiguredAt: new Date(),
            financeiroConfiguredByUserId: actor.id ?? undefined,
            status: 'CONFIGURED',
          },
        });
        await tx.installment.deleteMany({ where: { repasseId: rep.id } });
        await tx.installment.createMany({
          data: installmentsData.map((d) => ({ ...d, repasseId: rep.id })),
        });
        return rep;
      });

      await this.payoutAudit?.record({
        action: 'PAYOUT_FINALIZE',
        entity: 'Repasse',
        entityId: repasse.id,
        actorId: actor.id,
        actorRole: actor.role ?? null,
        details: {
          campaignId,
          numeroParcelas: n,
          intervaloDias: intervalo,
          primeiraParcelaDias: intervaloPrimeira,
          valorTotal,
          valorParcela,
          valorUltima,
        },
      });

      // Notifica o founder que as parcelas foram liberadas.
      this.eventEmitter?.emit('startup.approved', {
        startupId: campaign.startupId,
      });

      return ResponseDto.success('Repasse configurado e liberado', 200, {
        repasseId: repasse.id,
        numeroParcelas: n,
        valorParcela,
        valorUltima,
        valorTotal,
      });
    } catch (error) {
      this.logger.error(`Error finalizing payout: ${error.message}`);
      return ResponseDto.error('Erro ao finalizar payout', 500, error);
    }
  }

  async updatePayoutInstallmentDate(
    installmentId: number,
    scheduledDate: string,
    actor: { id: number | null; role: string | null },
  ) {
    const parsedDate = new Date(scheduledDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return ResponseDto.error('Data de pagamento inválida', 400);
    }

    // Normaliza para UTC midnight (00:00:00.000Z) para evitar drift de
    // timezone entre o admin que clica em /admin/payouts (edita data) e
    // o founder que abre /founder/campaigns/:id/financeiro. Sem isso,
    // dependendo do server timezone, o admin em BRT pode ver "15/10" mas
    // o founder em UTC-3 ve "14/10" (ou vice-versa).
    parsedDate.setUTCHours(0, 0, 0, 0);

    const installment = await this.prisma.installment.findUnique({
      where: { id: installmentId },
      select: {
        id: true,
        status: true,
        scheduledDate: true,
        paidAt: true,
      },
    });
    if (!installment) {
      return ResponseDto.error('Parcela não encontrada', 404);
    }
    if (installment.status === 'COMPLETED' || installment.paidAt) {
      return ResponseDto.error(
        'Não é possível alterar a data de uma parcela já paga',
        400,
      );
    }

    const updated = await this.prisma.installment.update({
      where: { id: installmentId },
      data: { scheduledDate: parsedDate },
      select: { id: true, scheduledDate: true },
    });

    await this.payoutAudit?.record({
      action: 'PAYOUT_INSTALLMENT_DATE_UPDATED',
      entity: 'Installment',
      entityId: installmentId,
      actorId: actor.id,
      actorRole: actor.role,
      details: {
        previousScheduledDate: installment.scheduledDate,
        scheduledDate: updated.scheduledDate,
      },
    });

    return ResponseDto.success('Data da parcela atualizada', 200, updated);
  }

  /**
   * S4 — Lista consolidada da página /admin/payouts.
   *
   * Categoria 1: campanhas FUNDED sem Repasse configurado (aguardando decisão
   *   prorrogar/finalizar do Admin/Compliance).
   * Categoria 2: solicitações de parcela (InstallmentRequest) em análise
   *   (REQUESTED/APPROVED) aguardando ação do Financeiro.
   *
   * Reusa as entidades existentes (Repasse/Installment/InstallmentRequest) —
   * sem duplicar PayoutProcess/PayoutReport (decisão do projeto).
   */
  async listPayouts(page = 1) {
    try {
      const pageSize = 10;
      const scheduledPage =
        Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
      // Categoria 1 — campanhas concluídas aguardando decisão de payout.
      const fundedCampaigns = await this.prisma.campaign.findMany({
        where: { status: 'FUNDED', repasse: { is: null } },
        select: {
          id: true,
          title: true,
          targetAmount: true,
          tokensSold: true,
          totalTokens: true,
          deadline: true,
          startup: { select: { id: true, nome: true } },
          investments: {
            where: { status: 'CONFIRMED' },
            select: { amount: true, startupRepasseAmount: true },
          },
        },
        orderBy: { id: 'desc' },
        take: 100,
      });

      // Categoria 2 — solicitações de parcela pendentes de ação.
      const installmentRequests = await this.prisma.installmentRequest.findMany(
        {
          where: { status: { in: ['REQUESTED', 'APPROVED'] } },
          select: {
            id: true,
            installmentId: true,
            status: true,
            valorSolicitado: true,
            submittedAt: true,
            usoRecurso: true,
            observacao: true,
            teveLucro: true,
            mensagemInvestidores: true,
            allocationPercents: true,
            allocationValues: true,
            bankInfoSnapshot: true,
            startup: { select: { id: true, nome: true } },
            installment: {
              select: {
                numero: true,
                scheduledDate: true,
                valor: true,
                comprovanteUrl: true,
                repasse: { select: { numeroParcelas: true } },
              },
            },
          },
          orderBy: { submittedAt: 'desc' },
          take: 100,
        },
      );

      // Categoria 3 — repasse CONFIGURADO, aguardando o founder solicitar a
      // parcela. Startups liberadas (Repasse CONFIGURED) que ainda não têm
      // uma solicitação ativa (REQUESTED/APPROVED) — o admin acompanha quem já
      // foi liberado e espera o founder agir (admin-payout-management §6.2).
      const configuredRepasses = await this.prisma.repasse.findMany({
        where: {
          status: 'CONFIGURED',
          installments: {
            none: { request: { status: { in: ['REQUESTED', 'APPROVED'] } } },
          },
        },
        select: {
          id: true,
          numeroParcelas: true,
          valorParcela: true,
          campaign: {
            select: {
              id: true,
              title: true,
              startup: { select: { id: true, nome: true } },
            },
          },
          installments: {
            where: { status: { in: ['AWAITING_REQUEST', 'REJECTED'] } },
            select: { numero: true },
            orderBy: { numero: 'asc' },
            take: 1,
          },
        },
        orderBy: { id: 'desc' },
        take: 100,
      });

      // Categoria 4 — parcelas programadas ordenadas pela data prevista,
      // paginadas em blocos de 10 para a tela administrativa.
      const scheduledWhere = { repasse: { status: 'CONFIGURED' as const } };
      const [scheduledTotal, scheduledInstallments] = await Promise.all([
        this.prisma.installment.count({ where: scheduledWhere }),
        this.prisma.installment.findMany({
          where: scheduledWhere,
          select: {
            id: true,
            numero: true,
            valor: true,
            scheduledDate: true,
            paidAt: true,
            status: true,
            repasseId: true,
            repasse: {
              select: {
                numeroParcelas: true,
                campaign: {
                  select: {
                    id: true,
                    title: true,
                    startup: { select: { id: true, nome: true } },
                  },
                },
              },
            },
          },
          orderBy: [{ scheduledDate: 'asc' }, { id: 'asc' }],
          skip: (scheduledPage - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return ResponseDto.success('Payouts consolidados', 200, {
        awaitingDecision: fundedCampaigns.map((c) => ({
          campaignId: c.id,
          campaignName: c.title,
          startupId: c.startup?.id ?? null,
          startupName: c.startup?.nome ?? null,
          targetAmount: c.targetAmount,
          // Valor captado para repasse = Σ startupRepasseAmount (preco base),
          // com fallback para `amount` em linhas legadas sem split.
          amountRaised: Number(
            c.investments
              .reduce(
                (sum, inv) =>
                  sum + Number(inv.startupRepasseAmount ?? inv.amount ?? 0),
                0,
              )
              .toFixed(2),
          ),
          tokensSold: c.tokensSold,
          totalTokens: c.totalTokens,
          deadline: c.deadline,
        })),
        installmentRequests: installmentRequests.map((r) => ({
          id: r.id,
          installmentId: r.installmentId,
          status: r.status,
          valorSolicitado: r.valorSolicitado,
          submittedAt: r.submittedAt,
          startupId: r.startup?.id ?? null,
          startupName: r.startup?.nome ?? null,
          installmentNumber: r.installment?.numero ?? null,
          totalInstallments: r.installment?.repasse?.numeroParcelas ?? null,
          // Considera o relatorio preenchido se QUALQUER um dos 3 campos
          // estiver preenchido: observacao (form do fundador), usoRecurso
          // ou mensagemInvestidores (relatorio mensal FIN-11 §8.2). Antes
          // exigia ambos usoRecurso + mensagemInvestidores, o que nunca era
          // satisfeito no fluxo atual e mantinha o badge "RELATORIO PENDENTE"
          // mesmo apos o fundador preencher a observacao.
          hasReport: Boolean(
            r.observacao || r.usoRecurso || r.mensagemInvestidores,
          ),
          hasComprovante: Boolean(r.installment?.comprovanteUrl),
          // Detalhes do relatorio (FIN-11) para abrir modal de revisao
          // sem precisar de round-trip extra ao backend.
          usoRecurso: r.usoRecurso ?? null,
          observacao: r.observacao ?? null,
          mensagemInvestidores: r.mensagemInvestidores ?? null,
          allocationPercents: this.toAllocationPercentsMap(
            r.allocationPercents,
          ),
          allocationValues: this.toAllocationValuesMap(r.allocationValues),
          bankInfoSnapshot: this.toBankInfoSnapshot(r.bankInfoSnapshot),
          scheduledDate: r.installment?.scheduledDate ?? null,
          valorParcela: r.installment?.valor ?? null,
        })),
        awaitingRequest: configuredRepasses.map((r) => ({
          repasseId: r.id,
          campaignId: r.campaign?.id ?? null,
          startupId: r.campaign?.startup?.id ?? null,
          startupName: r.campaign?.startup?.nome ?? null,
          numeroParcelas: r.numeroParcelas,
          valorParcela: Math.round(Number(r.valorParcela)),
          proximaParcela: r.installments[0]?.numero ?? null,
        })),
        scheduledInstallments: scheduledInstallments.map((i) => ({
          id: i.id,
          numero: i.numero,
          valor: i.valor,
          scheduledDate: i.scheduledDate,
          paidAt: i.paidAt,
          status: i.status,
          repasseId: i.repasseId,
          campaignId: i.repasse.campaign.id,
          campaignName: i.repasse.campaign.title,
          startupId: i.repasse.campaign.startup.id,
          startupName: i.repasse.campaign.startup.nome,
          totalInstallments: i.repasse.numeroParcelas,
        })),
        scheduledInstallmentsPagination: {
          page: scheduledPage,
          pageSize,
          total: scheduledTotal,
          totalPages: Math.max(1, Math.ceil(scheduledTotal / pageSize)),
        },
      });
    } catch (error) {
      this.logger.error(`Error listing payouts: ${error.message}`);
      return ResponseDto.error('Erro ao listar payouts', 500, error);
    }
  }

  /**
   * S2 — Status de pagamento por FASE de uma startup (gates da tabela admin).
   *
   * Regras (admin-startup-phases-design §1.5/§1.6):
   *  - Fase 1: gate = Payment(TOKEN_RESERVATION) PAID. Se não existe → skip
   *    (considerado atendido por default).
   *  - Fase 2: gate = Payment(COMPLIANCE_FEE) PAID. Se não existe → skip.
   *  - Fase 3: gate = TODOS os payments da startup PAID. Se não há payments →
   *    skip.
   *
   * `unlocked=true` significa que a fase pode ser aberta/aprovada. Cada fase
   * também retorna `reason` (motivo textual quando bloqueada, para tooltip) e
   * a data do pagamento confirmado quando aplicável.
   */
  async getStartupPaymentStatus(startupId: number) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id: startupId },
        select: { id: true, campaigns: { select: { id: true } } },
      });
      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }

      const campaignIds = startup.campaigns.map((c) => c.id);
      // Pagamentos ligados à startup: via campanha (TOKEN_RESERVATION legado) e
      // futuros vínculos por startup. Buscamos por campaignId das campanhas.
      const payments = campaignIds.length
        ? await this.prisma.payment.findMany({
            where: { campaignId: { in: campaignIds } },
            select: {
              purpose: true,
              status: true,
              paidAt: true,
              createdAt: true,
              // Breakdown financeiro (auditoria admin — comprovante da fase).
              // originalAmount: valor cheio antes de desconto; discountAmount:
              // desconto aplicado (cupom); paidAmount: efetivamente pago.
              // Fallback para `amount` quando os campos de breakdown são null
              // (pagamentos antigos anteriores à migração de breakdown).
              amount: true,
              originalAmount: true,
              discountAmount: true,
              paidAmount: true,
            },
          })
        : [];

      const latestByPurpose = (purpose: string) =>
        payments
          .filter((p) => p.purpose === purpose)
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0] ?? null;

      const reservation = latestByPurpose('TOKEN_RESERVATION');
      const complianceFee = latestByPurpose('COMPLIANCE_FEE');
      const reviewDecisions = await this.prisma.startupReviewDecision.findMany({
        where: { startupId, phase: { in: [1, 2, 3] } },
        orderBy: { createdAt: 'desc' },
        select: { phase: true, decision: true },
      });
      const latestReviewByPhase = new Map<number, 'APPROVED' | 'REJECTED'>();
      for (const review of reviewDecisions) {
        if (
          !latestReviewByPhase.has(review.phase) &&
          (review.decision === 'APPROVED' || review.decision === 'REJECTED')
        ) {
          latestReviewByPhase.set(review.phase, review.decision);
        }
      }
      const reviewStatus = (phase: number) =>
        latestReviewByPhase.get(phase) ?? null;

      // Deriva o breakdown financeiro de um pagamento para o comprovante.
      // Converte Decimal -> Number (contrato de serialização do projeto) e
      // aplica fallback para `amount` quando os campos de breakdown são null
      // (pagamentos anteriores à migração de originalAmount/discountAmount).
      const money = (
        p: {
          amount: unknown;
          originalAmount: unknown;
          discountAmount: unknown;
          paidAmount: unknown;
        } | null,
      ) => {
        if (!p) {
          return {
            originalAmount: null,
            discountAmount: null,
            paidAmount: null,
          };
        }
        const amount = p.amount != null ? Number(p.amount) : null;
        const original =
          p.originalAmount != null ? Number(p.originalAmount) : amount;
        const discount =
          p.discountAmount != null ? Number(p.discountAmount) : 0;
        const paid = p.paidAmount != null ? Number(p.paidAmount) : amount;
        return {
          originalAmount: original,
          discountAmount: discount,
          paidAmount: paid,
        };
      };

      // S18.6 — checkout consolidado COMPLIANCE_FEE + FAST_DEPLOY compartilha
      // a mesma campaign. Para o comprovante admin, retornamos AMBOS os
      // Payments como um array `payments`, na ordem em que foram criados.
      // Mantemos também os campos legados (`originalAmount`/`discountAmount`/
      // `paidAmount`) espelhando o COMPLIANCE_FEE (primary) para compat com
      // consumers que ainda não migraram.
      const fastDeploy = latestByPurpose('FAST_DEPLOY');
      const buildPayments = (
        primary: (typeof payments)[number] | null,
        secondary: (typeof payments)[number] | null,
      ) => {
        const out: Array<{
          purpose: string;
          status: string;
          paidAt: Date | null;
          createdAt: Date;
          originalAmount: number | null;
          discountAmount: number | null;
          paidAmount: number | null;
        }> = [];
        if (primary) {
          const m = money(primary);
          out.push({
            purpose: primary.purpose,
            status: primary.status,
            paidAt: primary.paidAt,
            createdAt: primary.createdAt,
            originalAmount: m.originalAmount,
            discountAmount: m.discountAmount,
            paidAmount: m.paidAmount,
          });
        }
        if (secondary) {
          const m = money(secondary);
          out.push({
            purpose: secondary.purpose,
            status: secondary.status,
            paidAt: secondary.paidAt,
            createdAt: secondary.createdAt,
            originalAmount: m.originalAmount,
            discountAmount: m.discountAmount,
            paidAmount: m.paidAmount,
          });
        }
        return out;
      };

      const phase1 = {
        gate: 'TOKEN_RESERVATION',
        exists: Boolean(reservation),
        paid: reservation ? reservation.status === 'PAID' : true,
        paidAt: reservation?.paidAt ?? null,
        createdAt: reservation?.createdAt ?? null,
        status: reservation?.status ?? null,
        reviewStatus: reviewStatus(1),
        ...money(reservation),
      };
      const phase2Payments = buildPayments(complianceFee, fastDeploy);
      const phase2 = {
        gate: 'COMPLIANCE_FEE',
        exists: phase2Payments.length > 0,
        // Gate libera quando o COMPLIANCE_FEE (primary) está PAID — FAST_DEPLOY
        // é opcional (serviço adicional) e não bloqueia Etapa 3.
        paid: complianceFee ? complianceFee.status === 'PAID' : true,
        paidAt: complianceFee?.paidAt ?? null,
        createdAt: complianceFee?.createdAt ?? null,
        status: complianceFee?.status ?? null,
        reviewStatus: reviewStatus(2),
        ...money(complianceFee),
        payments: phase2Payments,
      };
      // Fase 3 (gate final): o comprovante exibido é o da Taxa de Compliance
      // (COMPLIANCE_FEE). O status PAID desse pagamento libera "Aprovar Etapa 3".
      const phase3Payments = buildPayments(complianceFee, fastDeploy);
      const phase3 = {
        gate: 'COMPLIANCE_FEE',
        exists: phase3Payments.length > 0,
        paid: complianceFee ? complianceFee.status === 'PAID' : true,
        paidAt: complianceFee?.paidAt ?? null,
        createdAt: complianceFee?.createdAt ?? null,
        status: complianceFee?.status ?? null,
        reviewStatus: reviewStatus(3),
        ...money(complianceFee),
        payments: phase3Payments,
      };

      return ResponseDto.success('Status de pagamento por fase', 200, {
        startupId,
        phases: {
          1: {
            unlocked: phase1.paid,
            reason: phase1.paid
              ? null
              : 'Aguardando pagamento da reserva de token',
            ...phase1,
          },
          2: {
            unlocked: phase2.paid,
            reason: phase2.paid
              ? null
              : 'Aguardando pagamento da Taxa de Compliance',
            ...phase2,
          },
          3: {
            unlocked: phase3.paid,
            reason: phase3.paid
              ? null
              : 'Aguardando pagamento da Taxa de Compliance',
            ...phase3,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error fetching payment status: ${error.message}`);
      return ResponseDto.error('Erro ao obter status de pagamento', 500, error);
    }
  }

  /**
   * Revisão de um documento da startup pelo Admin/Compliance (fluxo §2).
   * Marca APPROVED ou REJECTED (rejeição exige justificativa, máx. 500 chars —
   * LGPD). Registra reviewer + timestamp e audita a decisão.
   */
  async reviewStartupDocument(
    startupId: number,
    docId: number,
    decision: 'APPROVED' | 'REJECTED',
    note: string | undefined,
    reviewerId: number | null,
  ) {
    try {
      if (decision !== 'APPROVED' && decision !== 'REJECTED') {
        return ResponseDto.error('Decisão inválida', 400, {
          code: 'INVALID_DECISION',
        });
      }
      if (decision === 'REJECTED') {
        if (!note || note.trim().length === 0) {
          return ResponseDto.error(
            'Justificativa é obrigatória para rejeição.',
            400,
            { code: 'NOTE_REQUIRED' },
          );
        }
        if (note.trim().length < 20) {
          return ResponseDto.error(
            'Justificativa deve ter no mínimo 20 caracteres.',
            400,
            { code: 'NOTE_TOO_SHORT' },
          );
        }
        if (note.length > 500) {
          return ResponseDto.error(
            'Justificativa excede o limite de 500 caracteres.',
            400,
            { code: 'NOTE_TOO_LONG' },
          );
        }
      }

      const doc = await this.prisma.startupDocument.findUnique({
        where: { id: docId },
        select: {
          id: true,
          startupId: true,
          categoria: true,
          nome: true,
          s3Key: true,
          mimetype: true,
          sizeBytes: true,
          uploadedById: true,
          createdAt: true,
        },
      });
      if (!doc || doc.startupId !== startupId) {
        return ResponseDto.error('Documento não encontrado', 404);
      }

      if (decision === 'APPROVED') {
        const updated = await this.prisma.startupDocument.update({
          where: { id: docId },
          data: {
            reviewStatus: 'APPROVED',
            reviewNote: null,
            reviewedAt: new Date(),
            reviewedById: reviewerId,
          },
          select: {
            id: true,
            reviewStatus: true,
            reviewNote: true,
            reviewedAt: true,
          },
        });

        await this.auditService.log({
          userId: reviewerId,
          action: 'STARTUP_DOCUMENT_APPROVED',
          entity: 'StartupDocument',
          entityId: String(docId),
          oldValue: undefined,
          newValue: { reviewStatus: 'APPROVED' },
        });

        return ResponseDto.success('Documento aprovado', 200, updated);
      }

      // decision === 'REJECTED' — hard delete do doc + arquivo, snapshot pré-delete
      // preservado em StartupDocumentRejection (banner do founder) e audit log.
      // (note já foi validada acima como string não-vazia com >=20 chars.)
      const reason = note!.trim();
      const rejectedAt = new Date();

      // 1) Snapshot pré-delete (vai para audit log + rejection row).
      const snapshot = {
        categoria: doc.categoria,
        nome: doc.nome,
        s3Key: doc.s3Key,
        mimetype: doc.mimetype,
        sizeBytes: doc.sizeBytes,
        uploadedById: doc.uploadedById,
        createdAt: doc.createdAt,
      };

      // 2) Audit log ANTES do delete — LGPD-safe (oldValue captura tudo).
      await this.auditService.log({
        userId: reviewerId,
        action: 'STARTUP_DOCUMENT_REJECTED_AND_DELETED',
        entity: 'StartupDocument',
        entityId: String(docId),
        oldValue: snapshot,
        newValue: { deleted: true, reason },
      });

      // 3) Insert na tabela de rejeições (fonte de verdade do banner no founder).
      await this.prisma.startupDocumentRejection.create({
        data: {
          startupId,
          categoria: doc.categoria,
          documentName: doc.nome,
          reason,
          rejectedById: reviewerId ?? 0,
          rejectedAt,
        },
      });

      // 4) Delete do S3 — best-effort. Falha aqui não trava o fluxo (doc sai do DB
      //    de qualquer forma); log warn para cleanup manual posterior se necessário.
      if (this.s3Service) {
        try {
          await this.s3Service.delete('document', doc.s3Key);
        } catch (err) {
          this.logger.warn(
            `S3 delete falhou para ${doc.s3Key} (docId=${docId}, startupId=${startupId}): ${(err as Error).message}. Doc removido do DB; cleanup manual necessário.`,
          );
        }
      }

      // 5) Delete do StartupDocument (Cascade já cobre o que depender disso).
      await this.prisma.startupDocument.delete({ where: { id: docId } });

      // 6) Notifica o founder (fluxo_startup §2) — in-app + e-mail best-effort via
      //    listener de domínio (`StartupNotificationService.onDocumentRejected`).
      //    `eventEmitter` é @Optional() — emit nunca quebra o fluxo.
      const event: StartupDocumentRejectedEvent = {
        startupId,
        categoria: doc.categoria,
        documentName: doc.nome,
        reason,
        rejectedById: reviewerId ?? 0,
        rejectedAt,
      };
      this.eventEmitter?.emit(StartupDocumentEvents.REJECTED, event);

      return ResponseDto.success('Documento rejeitado e removido', 200, {
        id: docId,
        categoria: doc.categoria,
        deleted: true,
        reason,
      });
    } catch (error) {
      this.logger.error(`Error reviewing document: ${error.message}`);
      return ResponseDto.error('Erro ao revisar documento', 500, error);
    }
  }

  /**
   * Calcula e atualiza o compliance score de uma startup
   * @param id ID da startup
   */
  async calculateComplianceScore(id: number) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id },
        include: {
          founder: {
            include: {
              avatar: true,
              comprovante: true,
              documento: true,
              biofacial: true,
            },
          },
          logo: true,
          campaigns: true,
        },
      });

      if (!startup) {
        return ResponseDto.error('Startup not found', 404);
      }

      // Calcular score baseado em documentos e dados fornecidos
      let score = 0;
      const factors: string[] = [];

      // Verificar dados do founder (KYC)
      if (startup.founder.avatar) {
        score += 25;
        factors.push('avatar_verified');
      }
      if (startup.founder.documento) {
        score += 25;
        factors.push('document_verified');
      }
      if (startup.founder.comprovante) {
        score += 25;
        factors.push('address_verified');
      }
      if (startup.founder.biofacial) {
        score += 25;
        factors.push('biofacial_verified');
      }

      // Logo verificado
      if (startup.logo) {
        score += 10;
        factors.push('logo_uploaded');
      }

      // Campanhas com dados completos
      if (startup.campaigns.length > 0) {
        score += 10;
        factors.push('campaign_created');
      }

      // CNPJ único
      if (startup.cnpj) {
        score += 5;
        factors.push('cnpj_verified');
      }

      // Garantir que score máximo seja 100
      score = Math.min(score, 100);

      this.logger.log(
        `Compliance score for startup ${id}: ${score}. Factors: ${factors.join(', ')}`,
      );

      return ResponseDto.success('Compliance score calculated', 200, {
        startupId: id,
        score,
        factors,
        maxScore: 100,
      });
    } catch (error) {
      this.logger.error(`Error calculating compliance score: ${error.message}`);
      return ResponseDto.error(
        'Error calculating compliance score',
        500,
        error,
      );
    }
  }

  // =====================================================
  // USERS MANAGEMENT
  // =====================================================

  /**
   * Lista usuários de forma paginada com filtros
   * @param query.page Número da página
   * @param query.limit Itens por página
   * @param query.role Filtro por role (USER, ADMIN, COMPLIANCE, FINANCEIRO, INVESTOR, FOUNDER)
   * @param query.status Filtro por status de conta ('active' | 'suspended') — mapeia para isActive boolean
   * @param query.createdFrom Filtro ISO date — usuários criados a partir desta data
   * @param query.search Busca por nome ou email
   * @param query.kycStatus Filtro por status KYC (aplicado na relação avatar)
   */
  async listUsers(query: {
    page?: number;
    limit?: number;
    role?: string;
    status?: 'active' | 'suspended';
    createdFrom?: string;
    kycStatus?: string;
    search?: string;
  }) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 25;

      const where: any = {};

      if (query.role) {
        where.role = query.role;
      }

      if (query.status === 'active') {
        where.isActive = true;
      } else if (query.status === 'suspended') {
        where.isActive = false;
      }

      if (query.createdFrom) {
        const d = new Date(query.createdFrom);
        if (!Number.isNaN(d.getTime())) {
          where.createdAt = { gte: d };
        }
      }

      const search = query.search?.trim();
      if (search) {
        where.OR = [
          { nome: { contains: search } },
          { email: { contains: search } },
        ];
      }

      if (query.kycStatus) {
        where.avatar = { status: query.kycStatus };
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          take: limit,
          skip: (page - 1) * limit,
          select: {
            id: true,
            publicId: true,
            email: true,
            nome: true,
            role: true,
            isActive: true,
            createdAt: true,
            tipo_documento: true,
            reg_documento: true,
            avatar: {
              select: {
                id: true,
                url_sm: true,
                status: true,
              },
            },
            subscriptions: {
              select: {
                id: true,
                status: true,
                plan: {
                  select: {
                    nome: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return ResponseDto.success(
        'Users retrieved successfully',
        200,
        users,
        total,
        page,
      );
    } catch (error) {
      this.logger.error(`Error listing users: ${error.message}`);
      return ResponseDto.error('Error listing users', 500, error);
    }
  }

  /**
   * Ativa ou desativa um usuário
   * @param id ID do usuário
   * @param isActive true para ativar, false para desativar
   */
  async toggleUserStatus(id: number, isActive: boolean) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });

      if (!user) {
        return ResponseDto.error('User not found', 404);
      }

      const updated = await this.prisma.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          publicId: true,
          email: true,
          nome: true,
          role: true,
          isActive: true,
        },
      });

      this.logger.log(
        `User ${id} ${isActive ? 'enabled' : 'disabled'} by admin`,
      );

      await this.auditService.log({
        userId: null,
        action: 'USER_TOGGLED',
        entity: 'User',
        entityId: String(id),
        oldValue: { isActive: user.isActive },
        newValue: { isActive },
      });

      // Sprint de Notificações — central (2026-10-04): emite evento de
      // domínio para o `UserNotificationService` criar in-app + e-mail.
      // Best-effort: eventEmitter é opcional (testes podem instanciar o
      // service sem ele) e a emissão nunca quebra o toggle.
      this.eventEmitter?.emit(isActive ? 'user.activated' : 'user.suspended', {
        userId: id,
        email: user.email,
        nome: user.nome,
        reason: 'admin_toggle',
      });

      return ResponseDto.success(
        `User ${isActive ? 'enabled' : 'disabled'} successfully`,
        200,
        updated,
      );
    } catch (error) {
      this.logger.error(`Error toggling user status: ${error.message}`);
      return ResponseDto.error('Error toggling user status', 500, error);
    }
  }

  // =====================================================
  // KYC COMPLIANCE - USERS
  // =====================================================

  /**
   * Lista usuários com KYC pendente
   * @param query.page Número da página
   * @param query.limit Itens por página
   */
  async listKycPendingUsers(query?: { page?: number; limit?: number }) {
    try {
      const page = query?.page || 1;
      const limit = query?.limit || 25;

      // Buscar usuários com documentos pendentes
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { avatar: { status: 'PENDING' } },
            { documento: { status: 'PENDING' } },
            { comprovante: { status: 'PENDING' } },
            { biofacial: { status: 'PENDING' } },
            { avatar: { status: 'UNDER_REVIEW' } },
            { documento: { status: 'UNDER_REVIEW' } },
            { comprovante: { status: 'UNDER_REVIEW' } },
            { biofacial: { status: 'UNDER_REVIEW' } },
          ],
        },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          publicId: true,
          email: true,
          nome: true,
          tipo_documento: true,
          reg_documento: true,
          createdAt: true,
          avatar: {
            select: {
              id: true,
              originalName: true,
              url: true,
              url_sm: true,
              status: true,
              createdAt: true,
            },
          },
          comprovante: {
            select: {
              id: true,
              originalName: true,
              url: true,
              url_sm: true,
              status: true,
              createdAt: true,
            },
          },
          documento: {
            select: {
              id: true,
              originalName: true,
              url: true,
              url_sm: true,
              status: true,
              createdAt: true,
            },
          },
          biofacial: {
            select: {
              id: true,
              originalName: true,
              url: true,
              url_sm: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const total = await this.prisma.user.count({
        where: {
          OR: [
            { avatar: { status: 'PENDING' } },
            { documento: { status: 'PENDING' } },
            { comprovante: { status: 'PENDING' } },
            { biofacial: { status: 'PENDING' } },
            { avatar: { status: 'UNDER_REVIEW' } },
            { documento: { status: 'UNDER_REVIEW' } },
            { comprovante: { status: 'UNDER_REVIEW' } },
            { biofacial: { status: 'UNDER_REVIEW' } },
          ],
        },
      });

      return ResponseDto.success(
        'KYC pending users retrieved successfully',
        200,
        users,
        total,
        page,
      );
    } catch (error) {
      this.logger.error(`Error listing KYC pending users: ${error.message}`);
      return ResponseDto.error('Error listing KYC pending users', 500, error);
    }
  }

  /**
   * Busca detalhes de KYC de um usuário específico
   * @param userId ID do usuário
   */
  async getUserKycDetail(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          avatar: true,
          comprovante: true,
          documento: true,
          biofacial: true,
          investments: {
            select: {
              id: true,
              amount: true,
              createdAt: true,
            },
          },
          tokens: {
            select: {
              id: true,
              quantity: true,
              purchaseVal: true,
            },
          },
          livenessTelemetries: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!user) {
        return ResponseDto.error('User not found', 404);
      }

      // Calcular risk score baseado em atividade
      const riskScore = this.calculateUserRiskScore(user);

      // Apoio ao Compliance (Fase 6): status do match selfie×documento.
      // Enquanto o extrator de embedding não estiver ativo, retorna indisponível.
      const faceMatch = this.faceMatchService
        ? await this.faceMatchService.status(userId).catch(() => null)
        : null;

      return ResponseDto.success('User KYC detail retrieved', 200, {
        user: {
          id: user.id,
          publicId: user.publicId,
          email: user.email,
          nome: user.nome,
          tipo_documento: user.tipo_documento,
          reg_documento: user.reg_documento,
        },
        documents: {
          avatar: user.avatar,
          comprovante: user.comprovante,
          documento: user.documento,
          biofacial: user.biofacial,
        },
        activity: {
          investmentsCount: user.investments.length,
          tokensCount: user.tokens.length,
          totalInvested: user.investments.reduce(
            (sum, inv) => sum + Number(inv.amount),
            0,
          ),
        },
        livenessTelemetry: user.livenessTelemetries[0] ?? null,
        faceMatch,
        riskScore,
      });
    } catch (error) {
      this.logger.error(`Error fetching user KYC detail: ${error.message}`);
      return ResponseDto.error('Error fetching user KYC detail', 500, error);
    }
  }

  /**
   * Toma decisão sobre documentos KYC de um usuário
   * @param kycProfileId ID do perfil KYC
   * @param decision approve, reject, resubmit ou revoke
   * @param reason Motivo da decisão (obrigatório para reject/resubmit; não usado em revoke)
   */
  async decideKycUser(kycProfileId: number, decision: string, reason?: string) {
    try {
      const allowedDecisions = [
        'APPROVED',
        'REJECTED',
        'NEEDS_RESUBMISSION',
        'REVOKE',
      ];
      const normalizedReason = reason?.trim() || undefined;

      if (!allowedDecisions.includes(decision)) {
        return ResponseDto.error(
          'Decisão inválida. Use APPROVED, REJECTED, NEEDS_RESUBMISSION ou REVOKE',
          400,
        );
      }

      if (
        (decision === 'REJECTED' || decision === 'NEEDS_RESUBMISSION') &&
        !normalizedReason
      ) {
        return ResponseDto.error(
          'O motivo é obrigatório para rejeição ou solicitação de reenvio',
          400,
        );
      }

      const kycProfile = await this.prisma.kYCProfile.findUnique({
        where: { id: kycProfileId },
      });

      if (!kycProfile) {
        return ResponseDto.error('Perfil KYC não encontrado', 404);
      }

      const isRevoke = decision === 'REVOKE';
      if (isRevoke && kycProfile.status !== 'APPROVED') {
        return ResponseDto.error(
          'Só é possível revogar uma decisão de KYC aprovada',
          409,
        );
      }

      if (!isRevoke && kycProfile.status === 'APPROVED') {
        return ResponseDto.error(
          'Documento KYC aprovado só pode ser alterado após revogação da decisão',
          409,
        );
      }

      const shouldPurgeRejectedKyc =
        decision === 'REJECTED' || decision === 'NEEDS_RESUBMISSION';

      // BUG-FT-005: idempotência — se já está NEEDS_RESUBMISSION e re-aplica
      // a mesma decisão, a FK já foi nulled no cleanup anterior; o
      // `prepareKycCleanup` retornaria `ok: false` (não acha owner) → 409.
      // Como CASE.md:920 documenta "repetir não dispara nova comunicação",
      // tratamos como no-op idempotente: atualiza o motivo (se mudou) e
      // refresca a sessão, sem cleanup nem email.
      const isIdempotentResubmission =
        decision === 'NEEDS_RESUBMISSION' &&
        kycProfile.status === 'NEEDS_RESUBMISSION';

      const cleanupPreparation =
        shouldPurgeRejectedKyc && !isIdempotentResubmission
          ? await this.prepareKycCleanup(kycProfileId, kycProfile)
          : null;

      if (cleanupPreparation && !cleanupPreparation.ok) {
        return ResponseDto.error(cleanupPreparation.message, 409);
      }

      const cleanupOwner = cleanupPreparation?.ok
        ? cleanupPreparation.owner
        : null;

      // BUG-FT-005: detecta qual slot do User estava vinculado ao KYCProfile
      // para persistir o nome do slot no User.lastKycRejectionSlot.
      const rejectedSlot:
        | 'avatar'
        | 'documento'
        | 'biofacial'
        | 'comprovante'
        | null = cleanupOwner
        ? cleanupOwner.avatar_id === kycProfileId
          ? 'avatar'
          : cleanupOwner.comprovante_id === kycProfileId
            ? 'comprovante'
            : cleanupOwner.documento_id === kycProfileId
              ? 'documento'
              : cleanupOwner.biofacial_id === kycProfileId
                ? 'biofacial'
                : null
        : null;

      const nextStatus = isRevoke
        ? 'PENDING'
        : isIdempotentResubmission
          ? 'NEEDS_RESUBMISSION'
          : decision;
      const resubmissionRequested =
        decision === 'NEEDS_RESUBMISSION' && !isIdempotentResubmission;
      const nextRejectionReason =
        decision === 'REJECTED' || decision === 'NEEDS_RESUBMISSION'
          ? normalizedReason
          : null;

      const updated = await this.prisma.$transaction(async (tx) => {
        const updatedProfile = await tx.kYCProfile.update({
          where: { id: kycProfileId },
          data: {
            status: nextStatus as any,
            rejectionReason: nextRejectionReason,
          },
        });

        if (cleanupPreparation?.ok) {
          const owner = cleanupPreparation.owner;
          await tx.user.update({
            where: { id: owner.id },
            data: {
              ...(owner.avatar_id === kycProfileId && { avatar_id: null }),
              ...(owner.comprovante_id === kycProfileId && {
                comprovante_id: null,
              }),
              ...(owner.documento_id === kycProfileId && {
                documento_id: null,
              }),
              ...(owner.biofacial_id === kycProfileId && {
                biofacial_id: null,
              }),
              // BUG-FT-005: persiste info da rejeição recente para o frontend
              // /profile exibir "Faça upload novamente" mesmo após o KYCProfile
              // ser deletado.
              lastKycRejectionAt: new Date(),
              lastKycRejectionReason: normalizedReason ?? null,
              lastKycRejectionSlot: rejectedSlot,
            },
          });
          await tx.kYCProfile.delete({ where: { id: kycProfileId } });
        }

        // BUG-FT-005 (APPROVED): limpa lastKycRejection* quando uma nova
        // aprovação substitui uma rejeição. Sem isso, o /profile continuaria
        // exibindo "Faça upload novamente" mesmo após a aprovação do admin.
        if (decision === 'APPROVED') {
          const ownerRow = await tx.user.findFirst({
            where: {
              OR: [
                { avatar_id: kycProfileId },
                { comprovante_id: kycProfileId },
                { documento_id: kycProfileId },
                { biofacial_id: kycProfileId },
              ],
            },
            select: { id: true },
          });
          if (ownerRow) {
            await tx.user.update({
              where: { id: ownerRow.id },
              data: {
                lastKycRejectionAt: null,
                lastKycRejectionReason: null,
                lastKycRejectionSlot: null,
              },
            });
          }
        }

        return updatedProfile;
      });

      this.logger.log(
        `KYC profile ${kycProfileId} transition: ${kycProfile.status} -> ${nextStatus} (${decision})`,
      );

      await this.auditService.log({
        userId: null,
        action: 'USER_KYC_DECIDED',
        entity: 'KYCProfile',
        entityId: String(kycProfileId),
        oldValue: { status: kycProfile.status },
        newValue: {
          status: nextStatus,
          decision,
          reason: normalizedReason ?? null,
        },
      });

      // BUG-FT-002 (auditoria): sincroniza o status do KYCProfile nas sessões
      // Redis ativas dos donos. Sem isso, /users/me continuaria retornando
      // o status antigo (cacheado no momento do upload) e o perfil do user
      // mostraria 'pendente de aprovação' mesmo após o admin aprovar.
      await this.refreshKycOwnersSessions(
        kycProfileId,
        cleanupPreparation?.ok ? null : kycProfileId,
        decision,
        nextStatus,
        cleanupOwner?.id ?? null,
      );

      if (cleanupPreparation?.ok && this.uploadsService) {
        for (const uploadId of cleanupPreparation.uploadIds) {
          try {
            await this.uploadsService.remove(uploadId, {
              id: cleanupPreparation.owner.id,
              role: 'ADMIN',
            });
          } catch (error) {
            this.logger.warn(
              `Falha ao remover o upload do KYC ${kycProfileId}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      if (resubmissionRequested && cleanupOwner) {
        const notificationDescription = `O documento ${kycProfile.originalName} precisa ser reenviado. Motivo: ${normalizedReason}. Envie uma nova imagem ou vídeo pelo seu perfil KYC.`;
        const notificationPromise = this.notificationsService
          ? this.notificationsService.create(
              cleanupOwner.id,
              'Reenvio de documento KYC solicitado',
              notificationDescription,
              NotificationType.KYC_RESUBMISSION_REQUESTED,
            )
          : Promise.resolve(null);
        const emailPromise = this.emailService.sendKycResubmissionEmail(
          cleanupOwner.email,
          {
            userName: cleanupOwner.nome,
            documentName: kycProfile.originalName,
            reason: normalizedReason!,
          },
        );

        const [notificationResult, emailResult] = await Promise.allSettled([
          notificationPromise,
          emailPromise,
        ]);

        if (notificationResult.status === 'rejected') {
          this.logger.warn(
            `KYC resubmission in-app notification failed for profile ${kycProfileId}`,
          );
        }
        if (
          emailResult.status === 'rejected' ||
          (emailResult.status === 'fulfilled' && !emailResult.value.success)
        ) {
          this.logger.warn(
            `KYC resubmission email failed for profile ${kycProfileId}`,
          );
        }
      } else if (resubmissionRequested) {
        this.logger.warn(
          `KYC profile ${kycProfileId} has no cleanup owner for resubmission notification`,
        );
      }

      const message =
        decision === 'APPROVED'
          ? 'KYC aprovado'
          : decision === 'REJECTED'
            ? 'KYC rejeitado'
            : decision === 'NEEDS_RESUBMISSION'
              ? 'Solicitação de reenvio KYC enviada'
              : 'Aprovação KYC revogada; documento retornado para pendente';

      return ResponseDto.success(message, 200, updated);
    } catch (error) {
      this.logger.error(`Erro ao decidir KYC: ${error.message}`);
      return ResponseDto.error('Erro ao decidir KYC', 500, error);
    }
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  /**
   * Atualiza o snapshot de perfil em TODAS as sessões Redis dos donos
   * do KYCProfile. Garante que /users/me reflete o novo status (APPROVED /
   * REJECTED / PENDING após revoke) sem depender de logout/login.
   *
   * Bug original: a sessão cacheava `user.avatar.status` no momento do
   * upload. Aprovação admin alterava o banco mas o cache ficava stale —
   * o perfil mostrava 'pendente de aprovação' mesmo após aprovar.
   *
   * O `deletedProfileId`, quando presente, representa um KYCProfile que
   * foi removido pelo cleanup (REJECTED/NEEDS_RESUBMISSION). Mesmo
   * nesses casos ainda precisamos sincronizar as sessões (porque o user
   * pode ter OUTROS KYCProfiles aprovados via outras FKs, e queremos
   * refletir o estado completo).
   */
  private async refreshKycOwnersSessions(
    kycProfileId: number,
    _deletedProfileId: number | null,
    decision: string,
    kycStatus: string,
    cleanupOwnerId: number | null,
  ): Promise<void> {
    const notifiedOwnerIds = new Set<number>();
    try {
      const owners = await this.prisma.user.findMany({
        where: {
          OR: [
            { avatar_id: kycProfileId },
            { comprovante_id: kycProfileId },
            { documento_id: kycProfileId },
            { biofacial_id: kycProfileId },
          ],
        },
        select: { id: true },
      });

      for (const owner of owners) {
        const profile = await this.prisma.user.findUnique({
          where: { id: owner.id },
          select: publicSessionProfileSelect,
        });
        if (!profile) continue;
        const patched = pickPublicProfilePayload(profile);
        await this.sessionService.refreshUserProfile(owner.id, patched);
        notifiedOwnerIds.add(owner.id);
      }
      if (owners.length > 0) {
        this.logger.log(
          `KYC sync: refreshUserProfile aplicado a ${owners.length} dono(s) do KYCProfile ${kycProfileId}`,
        );
      }
    } catch (error) {
      // Best-effort: nunca propaga erro. Próximo /users/me hidrata do banco.
      this.logger.warn(
        `Falha ao sincronizar sessões dos donos do KYCProfile ${kycProfileId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // BUG-FT-005: fallback para cache stale. Quando o KYCProfile foi removido
    // pelo cleanup (REJECTED/NEEDS_RESUBMISSION), as FKs do user já foram
    // zeradas e o findMany acima não encontra o dono. Hidratamos manualmente
    // do banco para garantir que /users/me retorna o payload atualizado
    // (incluindo `lastKycRejectionAt/Reason/Slot` populados).
    if (cleanupOwnerId != null) {
      notifiedOwnerIds.add(cleanupOwnerId);
      try {
        const ownerProfile = await this.prisma.user.findUnique({
          where: { id: cleanupOwnerId },
          select: publicSessionProfileSelect,
        });
        if (ownerProfile) {
          const patched = pickPublicProfilePayload(ownerProfile);
          await this.sessionService.refreshUserProfile(cleanupOwnerId, patched);
        }
      } catch (error) {
        this.logger.warn(
          `Falha ao hidratar sessão do cleanupOwner ${cleanupOwnerId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // Relay WS best-effort: emite kyc.user.decided para cada dono. O
    // NotificationsGateway escuta via @OnEvent e faz emitToUser para a
    // sala user:{id}. Falha aqui nunca quebra a decisão de KYC — o
    // próximo /users/me hidrata do banco (defesa em profundidade).
    for (const ownerId of notifiedOwnerIds) {
      try {
        this.eventEmitter?.emit(KycEvents.USER_DECIDED, {
          userId: ownerId,
          decision,
          kycStatus,
        } satisfies KycUserDecidedEvent);
      } catch (error) {
        this.logger.warn(
          `Falha ao emitir ${KycEvents.USER_DECIDED} para userId=${ownerId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  /**
   * Valida se o perfil pode ser desvinculado e removido com segurança.
   *
   * O KYCProfile legado não mantém a FK do Upload. Por isso, a resolução é
   * feita pelas URLs persistidas, sempre exigindo um Upload READY ativo com
   * metadados físicos completos antes de permitir a remoção.
   */
  private async prepareKycCleanup(
    kycProfileId: number,
    kycProfile: {
      url: string;
      url_sm: string | null;
      url_md: string | null;
      url_web: string | null;
      url_lg: string | null;
    },
  ): Promise<KycCleanupPreparation> {
    const [owners, startupReferenceCount] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { avatar_id: kycProfileId },
            { comprovante_id: kycProfileId },
            { documento_id: kycProfileId },
            { biofacial_id: kycProfileId },
          ],
        },
        select: {
          id: true,
          nome: true,
          email: true,
          avatar_id: true,
          comprovante_id: true,
          documento_id: true,
          biofacial_id: true,
        },
      }),
      this.prisma.startup.count({
        where: {
          OR: [
            { logo_id: kycProfileId },
            { cover_id: kycProfileId },
            { mie_id: kycProfileId },
            { contrato_social_id: kycProfileId },
            { cnpj_id: kycProfileId },
            { balanco_atual_id: kycProfileId },
            { declaracao_veracidade_id: kycProfileId },
            { ata_eleicao_id: kycProfileId },
            { balanco_anterior_id: kycProfileId },
            { procuracao_id: kycProfileId },
            { cv_socios_id: kycProfileId },
            { pitch_deck_id: kycProfileId },
            { projecoes_id: kycProfileId },
            { modelo_contrato_oferta_id: kycProfileId },
            { comprovante_endereco_id: kycProfileId },
            { declaracao_receita_id: kycProfileId },
          ],
        },
      }),
    ]);

    if (owners.length === 0) {
      return {
        ok: false,
        message:
          'O perfil KYC não está vinculado a um usuário; a operação foi bloqueada por segurança',
      };
    }

    if (owners.length > 1) {
      return {
        ok: false,
        message:
          'O perfil KYC está vinculado a mais de um usuário; a operação foi bloqueada por segurança',
      };
    }

    if (startupReferenceCount > 0) {
      return {
        ok: false,
        message:
          'O perfil KYC também está vinculado a uma startup e não pode ser removido por este fluxo',
      };
    }

    const profileUrls = Array.from(
      new Set(
        [
          kycProfile.url,
          kycProfile.url_sm,
          kycProfile.url_md,
          kycProfile.url_web,
          kycProfile.url_lg,
        ]
          .filter(
            (url): url is string =>
              typeof url === 'string' && url.trim().length > 0,
          )
          .map((url) => url.trim()),
      ),
    );

    if (profileUrls.length === 0) {
      return {
        ok: false,
        message:
          'O perfil KYC não possui URLs para identificar o arquivo físico; a operação foi bloqueada por segurança',
      };
    }

    const urlFilters = [
      { url: { in: profileUrls } },
      { url_md: { in: profileUrls } },
      { url_web: { in: profileUrls } },
    ];

    const [uploads, sharedProfile] = await Promise.all([
      this.prisma.upload.findMany({
        where: {
          deletedAt: null,
          status: 'READY',
          OR: urlFilters,
        },
        select: {
          id: true,
          userId: true,
          startupId: true,
          bucket: true,
          key: true,
          sha256: true,
          _count: {
            select: {
              transparencyPostAttachments: true,
            },
          },
        },
      }),
      this.prisma.kYCProfile.findFirst({
        where: {
          id: { not: kycProfileId },
          OR: [
            { url: { in: profileUrls } },
            { url_sm: { in: profileUrls } },
            { url_md: { in: profileUrls } },
            { url_web: { in: profileUrls } },
            { url_lg: { in: profileUrls } },
          ],
        },
        select: { id: true },
      }),
    ]);

    if (sharedProfile) {
      return {
        ok: false,
        message:
          'O arquivo do KYC é compartilhado com outro perfil e não pode ser removido automaticamente',
      };
    }

    if (uploads.length === 0) {
      return {
        ok: false,
        message:
          'Não foi possível identificar um Upload físico ativo para este KYC; a operação foi bloqueada por segurança',
      };
    }

    const owner = owners[0];

    if (
      uploads.some((upload) => !upload.bucket || !upload.key || !upload.sha256)
    ) {
      return {
        ok: false,
        message:
          'O Upload do KYC não possui bucket, chave ou hash físico identificável; a operação foi bloqueada por segurança',
      };
    }

    if (uploads.some((upload) => upload.userId !== owner.id)) {
      return {
        ok: false,
        message:
          'O Upload do KYC pertence a outro usuário; a operação foi bloqueada por segurança',
      };
    }

    if (uploads.some((upload) => upload.startupId != null)) {
      return {
        ok: false,
        message:
          'O Upload do KYC está associado a uma startup; a operação foi bloqueada por segurança',
      };
    }

    if (
      uploads.some((upload) => upload._count?.transparencyPostAttachments > 0)
    ) {
      return {
        ok: false,
        message:
          'O Upload do KYC é usado em um anexo de transparência; a operação foi bloqueada por segurança',
      };
    }

    return {
      ok: true,
      owner,
      uploadIds: uploads.map((upload) => upload.id),
    };
  }

  /**
   * Calcula risk score para um usuário baseado em sua atividade
   */
  private calculateUserRiskScore(user: any): number {
    let score = 0;
    const factors: string[] = [];

    // Verificar completude do KYC
    if (user.avatar?.status === 'APPROVED') {
      score += 30;
      factors.push('avatar_approved');
    }
    if (user.documento?.status === 'APPROVED') {
      score += 30;
      factors.push('document_approved');
    }
    if (user.comprovante?.status === 'APPROVED') {
      score += 20;
      factors.push('address_approved');
    }
    if (user.biofacial?.status === 'APPROVED') {
      score += 20;
      factors.push('biofacial_approved');
    }

    // Atividade de investimento reduz risco
    if (user.investments && user.investments.length > 0) {
      score += 5;
      factors.push('has_investments');
    }

    return Math.min(score, 100);
  }

  // =====================================================
  // COMPLIANCE DASHBOARD
  // =====================================================

  /**
   * Retorna KPIs do dashboard de compliance
   * @returns kyc_pending, startups_pending, approved_today, approval_time_avg
   */
  async getComplianceDashboard() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        kycPendingUsers,
        kycPendingStartups,
        approvedToday,
        recentKycDecisions,
        pendingApprovals,
      ] = await Promise.all([
        // Usuários com KYC pendente
        this.prisma.kYCProfile.count({
          where: { status: { in: ['PENDING', 'UNDER_REVIEW'] } },
        }),
        // Startups pendentes de aprovação
        this.prisma.startup.count({
          where: { status: 'PENDING' },
        }),
        // Aprovados hoje
        this.prisma.kYCProfile.count({
          where: {
            status: 'APPROVED',
            updatedAt: { gte: today },
          },
        }),
        // Decisões recentes de KYC (busca via User pois KYCProfile não tem relação direta com user)
        this.prisma.user.findMany({
          take: 10,
          where: {
            OR: [
              { avatar: { isNot: null } },
              { comprovante: { isNot: null } },
              { documento: { isNot: null } },
              { biofacial: { isNot: null } },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            nome: true,
            email: true,
            avatar: {
              select: {
                id: true,
                status: true,
                rejectionReason: true,
                updatedAt: true,
              },
            },
            comprovante: {
              select: {
                id: true,
                status: true,
                rejectionReason: true,
                updatedAt: true,
              },
            },
            documento: {
              select: {
                id: true,
                status: true,
                rejectionReason: true,
                updatedAt: true,
              },
            },
            biofacial: {
              select: {
                id: true,
                status: true,
                rejectionReason: true,
                updatedAt: true,
              },
            },
          },
        }),
        // Startups pendentes de aprovação
        this.prisma.startup.findMany({
          where: { status: 'PENDING' },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            nome: true,
            slug: true,
            status: true,
            founder: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            createdAt: true,
          },
        }),
      ]);

      return ResponseDto.success('Compliance dashboard retrieved', 200, {
        kpis: {
          kyc_pending: kycPendingUsers,
          startups_pending: kycPendingStartups,
          approved_today: approvedToday,
        },
        recentKycDecisions: recentKycDecisions.map((d) => {
          // Pega o KYC profile mais recente entre os 4 tipos
          const profiles = [
            d.avatar,
            d.comprovante,
            d.documento,
            d.biofacial,
          ].filter((p): p is NonNullable<typeof d.avatar> => p !== null);
          const latestProfile =
            profiles.length > 0
              ? profiles.sort(
                  (a, b) =>
                    new Date(b.updatedAt).getTime() -
                    new Date(a.updatedAt).getTime(),
                )[0]
              : null;
          return {
            id: latestProfile?.id ?? d.id,
            status: latestProfile?.status ?? 'N/A',
            userName: d.nome || 'N/A',
            userEmail: d.email || 'N/A',
            rejectionReason: latestProfile?.rejectionReason ?? null,
            updatedAt: latestProfile?.updatedAt ?? new Date(),
          };
        }),
        pendingApprovals: pendingApprovals.map((s) => ({
          id: s.id,
          nome: s.nome,
          slug: s.slug,
          founderName: s.founder?.nome || 'N/A',
          founderEmail: s.founder?.email || 'N/A',
          createdAt: s.createdAt,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Error fetching compliance dashboard: ${error.message}`,
      );
      return ResponseDto.error(
        'Error fetching compliance dashboard',
        500,
        error,
      );
    }
  }

  /**
   * Aprova ou rejeita KYC de usuário
   */
  async decideKyc(
    kycProfileId: number,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) {
    try {
      const kycProfile = await this.prisma.kYCProfile.findUnique({
        where: { id: kycProfileId },
      });

      if (!kycProfile) {
        return ResponseDto.error('Perfil KYC não encontrado', 404);
      }

      const updated = await this.prisma.kYCProfile.update({
        where: { id: kycProfileId },
        data: {
          status: decision,
          rejectionReason: decision === 'REJECTED' ? reason : null,
        },
      });

      this.logger.log(`KYC profile ${kycProfileId} ${decision} by compliance`);

      return ResponseDto.success(
        `KYC ${decision === 'APPROVED' ? 'aprovado' : 'rejeitado'}`,
        200,
        updated,
      );
    } catch (error) {
      this.logger.error(`Error deciding KYC: ${error.message}`);
      return ResponseDto.error('Erro ao decidir KYC', 500, error);
    }
  }

  /**
   * Aprova ou rejeita startup
   */
  async decideStartup(
    startupId: number,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
    reviewer?: { id: number },
    redirectPath?: string,
  ) {
    try {
      // T036 (B14): LGPD-safe - motivo limitado a 500 chars
      if (decision === 'REJECTED') {
        if (!reason || reason.trim().length === 0) {
          return ResponseDto.error(
            'Motivo eh obrigatorio para rejeicao.',
            400,
            { code: 'REASON_REQUIRED' },
          );
        }
        if (reason.length > 500) {
          return ResponseDto.error(
            'Motivo excede o limite de 500 caracteres (LGPD).',
            400,
            { code: 'REASON_TOO_LONG', maxLength: 500 },
          );
        }
      }

      const startup = await this.prisma.startup.findUnique({
        where: { id: startupId },
        include: { founder: { select: { id: true, email: true, nome: true } } },
      });

      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }

      const updated = await this.prisma.startup.update({
        where: { id: startupId },
        data: {
          status: decision,
        },
      });

      this.logger.log(`Startup ${startupId} ${decision} by compliance`);

      await this.auditService.log({
        userId: reviewer?.id ?? null,
        action: 'STARTUP_DECIDED',
        entity: 'Startup',
        entityId: String(startupId),
        oldValue: { status: startup.status },
        newValue: { status: decision, reason: reason ?? null },
      });

      // T036: Audit log + email notification em REJECTED
      if (decision === 'REJECTED' && startup.founder && startup.founder.email) {
        await this.prisma.auditLog
          .create({
            data: {
              userId: reviewer?.id ?? startup.founder.id,
              action: 'COMPLIANCE_REJECT',
              entity: 'startup',
              entityId: String(startupId),
              newValue: {
                reason: reason || '',
                redirectPath: redirectPath ?? '/founder/startup/edit',
              },
            },
          })
          .catch((e) =>
            this.logger.warn(`Falha ao criar audit log: ${e?.message}`),
          );

        // Email notification (best-effort - nao bloqueia resposta)
        try {
          const frontendUrl =
            process.env.FRONTEND_URL || 'http://localhost:5173';
          const redirectUrl = `${frontendUrl}${redirectPath ?? '/founder/startup/edit'}`;
          await this.emailService.sendRejectionNotification(
            startup.founder.email,
            {
              founderName: startup.founder.nome,
              startupName: startup.nome,
              reason: reason || '',
              redirectUrl,
            },
          );
        } catch (e) {
          this.logger.warn(
            `Falha ao enviar email de reprovacao: ${e?.message}`,
          );
        }
      }

      if (decision === 'APPROVED') {
        await this.sealsService
          .autoAssignVerified(startupId)
          .catch((e) =>
            this.logger.warn(
              `Falha ao auto-atribuir startup_verificada: ${e?.message}`,
            ),
          );
      }

      // S1-T09/alinhamento — notifica o founder da decisão do gate final.
      // Best-effort: o EventEmitter é opcional (testes podem instanciar o
      // service sem ele) e a emissão nunca deve quebrar a decisão.
      if (this.eventEmitter) {
        this.eventEmitter.emit(
          decision === 'APPROVED' ? 'startup.approved' : 'startup.rejected',
          { startupId, reason: reason ?? undefined },
        );
      }

      return ResponseDto.success(
        `Startup ${decision === 'APPROVED' ? 'aprovada' : 'rejeitada'}`,
        200,
        updated,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error deciding startup: ${message}`);
      return ResponseDto.error('Erro ao decidir startup', 500, error);
    }
  }

  // =====================================================
  // FINANCEIRO DASHBOARD
  // =====================================================

  /**
   * Retorna KPIs do dashboard financeiro
   * @returns total_revenue, transaction_volume, fee_collection, stats (today, week, month)
   */
  async getFinanceiroDashboard() {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const twelveMonthsAgo = new Date(
        today.getFullYear() - 1,
        today.getMonth(),
        today.getDate(),
      );

      const [
        splitAgg,
        legacySplitAgg,
        gmvChargedResult,
        transactionVolumeResult,
        todayRevenueResult,
        weekRevenueResult,
        monthRevenueResult,
        otherRevenueByPurpose,
        affiliateAgg,
        recentTransactions,
        paymentsByMethod,
        paymentsForTrend,
      ] = await Promise.all([
        // Split financeiro dos investimentos confirmados (Modelo B):
        //   tokenSubtotal  = tokensQty x preco de venda
        //   repasse        = tokensQty x preco base   (devido a startup)
        //   spread         = subtotal - repasse       (markup da plataforma)
        //   fee            = subtotal x platformFeePct (taxa cobrada do investidor)
        //   revenue        = spread + fee
        this.prisma.investment.aggregate({
          _sum: {
            tokenSubtotal: true,
            platformFeeAmount: true,
            platformSpreadAmount: true,
            startupRepasseAmount: true,
            platformRevenueAmount: true,
            affiliateCommissionAmount: true,
          },
          where: { status: 'CONFIRMED', startupRepasseAmount: { not: null } },
        }),
        // Linhas legadas sem split (pre-backfill): amount era integralmente
        // repassavel — conta como repasse e como subtotal (fee/spread = 0).
        this.prisma.investment.aggregate({
          _sum: { amount: true },
          where: { status: 'CONFIRMED', startupRepasseAmount: null },
        }),
        // GMV cobrado do investidor: total efetivamente pago (subtotal+taxa).
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'PAID', purpose: 'INVESTMENT' },
        }),
        // Transaction volume (all payments)
        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'PAID' },
        }),
        // Receita da plataforma por periodo (spread + taxa dos investimentos).
        this.prisma.investment.aggregate({
          _sum: { platformRevenueAmount: true },
          where: { status: 'CONFIRMED', createdAt: { gte: today } },
        }),
        this.prisma.investment.aggregate({
          _sum: { platformRevenueAmount: true },
          where: { status: 'CONFIRMED', createdAt: { gte: weekAgo } },
        }),
        this.prisma.investment.aggregate({
          _sum: { platformRevenueAmount: true },
          where: { status: 'CONFIRMED', createdAt: { gte: monthAgo } },
        }),
        // Receitas nao-investimento, por finalidade (taxas avulsas pagas).
        this.prisma.payment.groupBy({
          by: ['purpose'],
          where: {
            status: 'PAID',
            purpose: {
              in: [
                'TOKEN_RESERVATION',
                'TOKEN_RESERVATION_EXTENSION',
                'COMPLIANCE_FEE',
                'FAST_TRACK_REVIEW',
                'VERIFICATION_SEAL',
                'EARLY_ACCESS',
              ],
            },
          },
          _sum: { amount: true },
        }),
        // Comissoes de afiliados: affiliateAmount = devido ao afiliado (sai
        // do repasse); platformAmount = parte da plataforma.
        this.prisma.affiliateCommission.aggregate({
          _sum: { affiliateAmount: true, platformAmount: true },
          where: { status: { not: 'CANCELED' } },
        }),
        // Recent transactions
        this.prisma.payment.findMany({
          take: 15,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            method: true,
            purpose: true,
            status: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
          },
        }),
        // Payment methods aggregation (groupBy method)
        this.prisma.payment.groupBy({
          by: ['method'],
          where: { status: 'PAID' },
          _sum: { amount: true },
        }),
        // Payments for monthly trend (last 12 months)
        this.prisma.payment.findMany({
          where: {
            status: 'PAID',
            createdAt: { gte: twelveMonthsAgo },
          },
          select: {
            amount: true,
            createdAt: true,
          },
        }),
      ]);

      // ----- Consolidação do split (investimentos) -----
      const legacyAmount = Number(legacySplitAgg._sum.amount ?? 0);
      const tokenSubtotalSum =
        Number(splitAgg._sum.tokenSubtotal ?? 0) + legacyAmount;
      const repasseStartups =
        Number(splitAgg._sum.startupRepasseAmount ?? 0) + legacyAmount;
      const spreadTokens = Number(splitAgg._sum.platformSpreadAmount ?? 0);
      const taxaPlataforma = Number(splitAgg._sum.platformFeeAmount ?? 0);
      const receitaInvestimentos = Number(
        splitAgg._sum.platformRevenueAmount ?? 0,
      );
      const comissaoAfiliadoInvestidores = Number(
        splitAgg._sum.affiliateCommissionAmount ?? 0,
      );
      const gmvCobrado = Number(gmvChargedResult._sum.amount ?? 0);

      const transactionVolume = transactionVolumeResult._sum.amount
        ? Number(transactionVolumeResult._sum.amount)
        : 0;

      // ----- Receitas avulsas (por finalidade) -----
      const purposeSum = (purpose: string) =>
        otherRevenueByPurpose
          .filter((r) => r.purpose === purpose)
          .reduce((s, r) => s + Number(r._sum.amount ?? 0), 0);
      const taxaReservaTokens =
        purposeSum('TOKEN_RESERVATION') +
        purposeSum('TOKEN_RESERVATION_EXTENSION');
      const taxaCompliance = purposeSum('COMPLIANCE_FEE');
      const fastTrack = purposeSum('FAST_TRACK_REVIEW');
      const seloVerificacao = purposeSum('VERIFICATION_SEAL');
      const earlyAccess = purposeSum('EARLY_ACCESS');

      const comissaoAfiliadosDevida = Number(
        affiliateAgg._sum.affiliateAmount ?? 0,
      );
      const comissaoAfiliadosPlataforma = Number(
        affiliateAgg._sum.platformAmount ?? 0,
      );

      const receitaPlataformaTotal = Number(
        (
          receitaInvestimentos +
          taxaReservaTokens +
          taxaCompliance +
          fastTrack +
          seloVerificacao +
          earlyAccess +
          comissaoAfiliadosPlataforma
        ).toFixed(2),
      );

      // Payment methods: groupBy returns { method, _sum: { amount } }
      const METHOD_LABELS: Record<string, string> = {
        PIX: 'PIX',
        CREDIT_CARD: 'CREDIT_CARD',
        BOLETO: 'BOLETO',
        WALLET: 'WALLET',
      };
      const methodMap = new Map<string, number>();
      for (const row of paymentsByMethod) {
        methodMap.set(row.method, Number(row._sum.amount ?? 0));
      }
      const paymentMethods = {
        labels: Object.keys(METHOD_LABELS),
        data: Object.keys(METHOD_LABELS).map((k) => methodMap.get(k) ?? 0),
      };

      // Monthly trend: aggregate paid payments by YYYY-MM
      const MONTH_LABELS = [
        'Jan',
        'Fev',
        'Mar',
        'Abr',
        'Mai',
        'Jun',
        'Jul',
        'Ago',
        'Set',
        'Out',
        'Nov',
        'Dez',
      ];
      const monthlyMap = new Map<string, number>();
      for (const row of paymentsForTrend) {
        const d = new Date(row.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(row.amount));
      }
      // Build last 12 months series
      const trendLabels: string[] = [];
      const trendData: number[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        trendLabels.push(MONTH_LABELS[d.getMonth()]);
        trendData.push(monthlyMap.get(key) ?? 0);
      }
      const monthlyTrend = { labels: trendLabels, data: trendData };

      return ResponseDto.success('Financeiro dashboard retrieved', 200, {
        kpis: {
          // Receita total da plataforma (spread + taxa + taxas avulsas +
          // comissao sobre afiliados) — nao e o GMV transacionado.
          total_revenue: receitaPlataformaTotal,
          transaction_volume: transactionVolume,
          // Taxa da plataforma efetivamente cobrada dos investidores.
          fee_collection: taxaPlataforma,
          // GMV dos investimentos = total cobrado do investidor
          // (subtotal de tokens + taxa).
          gmv_investments: gmvCobrado,
          // Valor devido as startups (repasse) — base x tokens vendidos.
          repasse_startups: repasseStartups,
          // Receita da plataforma vinda de investimentos (spread + taxa).
          platform_revenue_investments: receitaInvestimentos,
        },
        stats: {
          today: todayRevenueResult._sum.platformRevenueAmount
            ? Number(todayRevenueResult._sum.platformRevenueAmount)
            : 0,
          this_week: weekRevenueResult._sum.platformRevenueAmount
            ? Number(weekRevenueResult._sum.platformRevenueAmount)
            : 0,
          this_month: monthRevenueResult._sum.platformRevenueAmount
            ? Number(monthRevenueResult._sum.platformRevenueAmount)
            : 0,
        },
        revenue_breakdown: {
          // Investimentos (Modelo B)
          gmv_cobrado: gmvCobrado,
          token_subtotal: tokenSubtotalSum,
          repasse_startups: repasseStartups,
          taxa_plataforma: taxaPlataforma,
          spread_tokens: spreadTokens,
          receita_investimentos: receitaInvestimentos,
          comissao_afiliado_investidores: comissaoAfiliadoInvestidores,
          // Taxas avulsas (pagamentos nao-investimento)
          taxa_reserva_tokens: taxaReservaTokens,
          taxa_compliance: taxaCompliance,
          fast_track: fastTrack,
          selo_verificacao: seloVerificacao,
          early_access: earlyAccess,
          // Afiliados: parcela devida aos afiliados e parte da plataforma
          comissao_afiliados_devida: comissaoAfiliadosDevida,
          comissao_afiliados_plataforma: comissaoAfiliadosPlataforma,
          receita_plataforma_total: receitaPlataformaTotal,
        },
        recentTransactions: recentTransactions.map((t) => ({
          id: t.id,
          amount: Number(t.amount),
          method: t.method,
          purpose: t.purpose,
          status: t.status,
          userName: t.user?.nome || 'N/A',
          userEmail: t.user?.email || 'N/A',
          createdAt: t.createdAt,
        })),
        paymentMethods,
        monthlyTrend,
      });
    } catch (error) {
      this.logger.error(
        `Error fetching financeiro dashboard: ${error.message}`,
      );
      return ResponseDto.error(
        'Error fetching financeiro dashboard',
        500,
        error,
      );
    }
  }

  // ===========================================================================
  // Marketplace - Score manual da startup (0-100) e FinanceConfig (key/value)
  // ===========================================================================

  async updateStartupScore(id: number, score: number) {
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      return ResponseDto.error(
        'Score inválido. Deve ser inteiro entre 0 e 100.',
        400,
      );
    }
    const startup = await this.prisma.startup.findUnique({ where: { id } });
    if (!startup) {
      return ResponseDto.error('Startup não encontrada', 404);
    }
    const updated = await this.prisma.startup.update({
      where: { id },
      data: { score: Math.round(score) },
      select: { id: true, nome: true, score: true },
    });

    await this.auditService.log({
      userId: null,
      action: 'STARTUP_SCORE_UPDATED',
      entity: 'Startup',
      entityId: String(id),
      oldValue: { score: startup.score },
      newValue: { score: Math.round(score) },
    });

    return ResponseDto.success('Score atualizado com sucesso', 200, updated);
  }

  /**
   * Incrementa (ou decrementa, com delta negativo) o score de marketplace
   * de uma startup.
   *
   * Ação "Coroar" — exclusiva para ADMIN e restrita a startups com a Fase 3
   * APROVADA. O `delta` é somado ao score atual e o resultado é clampado em
   * 0..100 (regra do projeto: score sempre em [0, 100]).
   *
   * Defesa em profundidade: o service revalida o gate `phase 3 approved`
   * mesmo sabendo que o frontend já esconde o botão. Garante que um bypass
   * via BFF/curl não consiga aplicar score boost a startups não-qualificadas.
   *
   * Auditoria: cada chamada grava em `AuditLog` com `STARTUP_SCORE_INCREMENTED`
   * incluindo oldValue/newValue/delta/reason — base para LGPD e compliance.
   */
  async incrementStartupScore(
    id: number,
    delta: number,
    reason: string | undefined,
    adminContext: {
      adminUserId: number | null;
      adminName: string | null;
      ip: string | null;
    },
  ) {
    if (
      !Number.isInteger(delta) ||
      delta < -100 ||
      delta > 100 ||
      delta === 0
    ) {
      return ResponseDto.error(
        'Delta inválido. Use inteiro entre -100 e 100, diferente de 0.',
        400,
      );
    }

    const startup = await this.prisma.startup.findUnique({
      where: { id },
      select: { id: true, score: true },
    });
    if (!startup) {
      return ResponseDto.error('Startup não encontrada', 404);
    }

    // Gate de fase 3 — revalidação server-side. Lê a última decisão da fase 3
    // da tabela `startup_review_decisions` (mesma fonte do
    // `getStartupPaymentStatus`). Tolerante a fase sem pagamento (legado).
    const phase3Review = await this.prisma.startupReviewDecision.findFirst({
      where: { startupId: id, phase: 3 },
      orderBy: { createdAt: 'desc' },
      select: { decision: true },
    });
    if (phase3Review?.decision !== 'APPROVED') {
      this.logger.warn(
        `Tentativa de incremento de score bloqueada para startup ${id} (fase 3 não aprovada).`,
      );
      return ResponseDto.error(
        'Score só pode ser incrementado após a aprovação da Fase 3 (Detalhes de Captação).',
        403,
      );
    }

    const previousScore = startup.score;
    const newScore = Math.max(0, Math.min(100, previousScore + delta));
    const appliedDelta = newScore - previousScore; // pode ser menor que `delta` por clamp

    const updated = await this.prisma.startup.update({
      where: { id },
      data: { score: newScore },
      select: { id: true, nome: true, score: true },
    });

    await this.auditService.log({
      userId: adminContext.adminUserId,
      action: 'STARTUP_SCORE_INCREMENTED',
      entity: 'Startup',
      entityId: String(id),
      oldValue: { score: previousScore },
      newValue: { score: newScore, delta: appliedDelta },
      ip: adminContext.ip ?? undefined,
    });

    return ResponseDto.success('Score incrementado com sucesso', 200, {
      ...updated,
      previousScore,
      appliedDelta,
      reason: reason ?? null,
    });
  }

  async listFinanceConfig() {
    const items = await this.prisma.financeConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return ResponseDto.success(
      'Configurações financeiras retornadas com sucesso',
      200,
      items,
    );
  }

  async updateFinanceConfig(key: string, value: string) {
    const existing = await this.prisma.financeConfig.findUnique({
      where: { key },
    });
    if (!existing) {
      return ResponseDto.error(
        `Chave de configuração não encontrada: ${key}`,
        404,
      );
    }
    const updated = await this.prisma.financeConfig.update({
      where: { key },
      data: { value: String(value) },
    });

    await this.auditService.log({
      userId: null,
      action: 'FINANCE_CONFIG_UPDATED',
      entity: 'FinanceConfig',
      entityId: key,
      oldValue: { value: existing.value },
      newValue: { value: String(value) },
    });

    return ResponseDto.success('Configuração atualizada', 200, updated);
  }

  /**
   * Lista paginada de Investments para o painel financeiro, expondo o split
   * financeiro persistido (Modelo B) + payment associado. Filtros opcionais:
   *
   * - `status`: enum do Investment (PENDING/CONFIRMED/CANCELED/REFUNDED).
   * - `campaignId`: restringe a uma campanha.
   * - `dateFrom`, `dateTo`: ISO strings, filtra por `createdAt`.
   * - `search`: substring case-insensitive em user.email ou user.nome.
   */
  async listFinanceiroInvestments(query: {
    page?: number;
    limit?: number;
    status?: string;
    campaignId?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    try {
      const page = Math.max(1, Math.trunc(query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 20)));

      const where: Record<string, unknown> = {};
      if (query.status) where.status = query.status;
      if (query.campaignId) where.campaignId = query.campaignId;
      if (query.dateFrom || query.dateTo) {
        where.createdAt = {
          ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
          ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
        };
      }
      if (query.search) {
        where.user = {
          OR: [
            { email: { contains: query.search } },
            { nome: { contains: query.search } },
          ],
        };
      }

      const [items, total] = await Promise.all([
        this.prisma.investment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: { select: { id: true, nome: true, email: true } },
            campaign: {
              select: {
                id: true,
                title: true,
                startup: { select: { id: true, nome: true } },
              },
            },
            payment: {
              select: {
                id: true,
                amount: true,
                status: true,
                method: true,
                paidAt: true,
              },
            },
          },
        }),
        this.prisma.investment.count({ where }),
      ]);

      const toNum = (v: unknown) => (v == null ? null : Number(v));

      return ResponseDto.success('Investimentos retornados', 200, {
        data: items.map((inv) => {
          const subtotal = Number(inv.tokenSubtotal ?? inv.amount);
          const repasse = Number(inv.startupRepasseAmount ?? inv.amount);
          const fee = Number(inv.platformFeeAmount ?? 0);
          return {
            id: inv.id,
            status: inv.status,
            userId: inv.userId,
            userName: inv.user?.nome ?? null,
            userEmail: inv.user?.email ?? null,
            campaignId: inv.campaignId,
            campaignTitle: inv.campaign?.title ?? null,
            startupId: inv.campaign?.startup?.id ?? null,
            startupName: inv.campaign?.startup?.nome ?? null,
            tokensQty: inv.tokensQty,
            affiliateCode: inv.affiliateCode,
            createdAt: inv.createdAt,
            allocatedAt: inv.allocatedAt,
            breakdown: {
              tokenBasePrice: toNum(inv.tokenBasePrice),
              tokenSellPrice: toNum(inv.tokenSellPrice),
              tokenSubtotal: subtotal,
              platformFeePct: toNum(inv.platformFeePct),
              platformFeeAmount: fee,
              startupRepasseAmount: repasse,
              platformSpreadAmount: Number(inv.platformSpreadAmount ?? 0),
              platformRevenueAmount: Number(inv.platformRevenueAmount ?? 0),
              affiliateCommissionAmount: toNum(inv.affiliateCommissionAmount),
              // Total cobrado do investidor (subtotal + taxa) — snapshot do
              // Payment vinculado quando existe.
              totalCharged: inv.payment
                ? Number(inv.payment.amount)
                : subtotal + fee,
            },
            payment: inv.payment ?? null,
          };
        }),
        total,
        pagina: page,
        limite: limit,
      });
    } catch (error) {
      this.logger.error(
        `Error listing financeiro investments: ${error.message}`,
      );
      return ResponseDto.error('Erro ao listar investimentos', 500, error);
    }
  }

  /**
   * Lista paginada de Payments para o painel financeiro, com user (email,
   * nome) e Subscription/Plan associados em JOIN. Filtros opcionais:
   *
   * - `status`, `method`, `purpose`: enums do Payment. Match exato.
   * - `dateFrom`, `dateTo`: ISO strings, filtra por `createdAt`.
   * - `search`: substring case-insensitive em user.email, user.nome ou
   *   Payment.txid. Útil pra busca rápida pelo operador.
   *
   * Retorna no shape ResponseDto.success com `data`, `total` e `pagina`.
   */
  async listFinanceiroTransactions(query: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    purpose?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 25;
    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.method) where.method = query.method;
    if (query.purpose) where.purpose = query.purpose;

    if (query.dateFrom || query.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (query.dateFrom) createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) createdAt.lte = new Date(query.dateTo);
      where.createdAt = createdAt;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { txid: { contains: term } },
        { user: { email: { contains: term } } },
        { user: { nome: { contains: term } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, nome: true } },
          subscription: {
            include: { plan: { select: { id: true, nome: true, slug: true } } },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return ResponseDto.success(
      'Transações retornadas com sucesso',
      200,
      items,
      total,
      page,
    );
  }

  /**
   * Helpers para normalizar campos JSON do InstallmentRequest no payload
   * de `/admin/payouts`. O Prisma retorna `JsonValue | null` (tipo amplo)
   * e o frontend espera `AllocationPercents` (objeto com chaves tipadas).
   * Em caso de payload malformado, retornamos um objeto vazio para evitar
   * quebrar a renderização do card na home do admin.
   */
  private toAllocationPercentsMap(raw: unknown): Record<string, number> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const result: Record<string, number> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      const n = Number(value);
      if (Number.isFinite(n)) result[key] = n;
    }
    return result;
  }

  private toAllocationValuesMap(raw: unknown): Record<string, string> | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'string') result[key] = value;
    }
    return Object.keys(result).length > 0 ? result : null;
  }

  private toBankInfoSnapshot(raw: unknown): {
    banco: string;
    agencia: string;
    conta: string;
    tipoConta: string;
  } | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    const banco = typeof obj.banco === 'string' ? obj.banco : '';
    const agencia = typeof obj.agencia === 'string' ? obj.agencia : '';
    const conta = typeof obj.conta === 'string' ? obj.conta : '';
    const tipoConta =
      typeof obj.tipoConta === 'string' ? obj.tipoConta : 'CORRENTE';
    return { banco, agencia, conta, tipoConta };
  }
}
