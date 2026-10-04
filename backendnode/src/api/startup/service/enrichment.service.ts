import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type BadgeType = 'STATUS' | 'RODADA' | 'PAGAMENTO' | 'ALERTA';
export type BadgeColor =
  | 'green'
  | 'yellow'
  | 'red'
  | 'orange'
  | 'blue'
  | 'gray';

/**
 * RoundStatus enum - status da rodada de captacao.
 * Valores possiveis: sem_rodada | criada_aguardando_reserva | reserva_paga | ativa | pausada | cancelada | encerrada
 */
export type RoundStatus =
  | 'sem_rodada'
  | 'criada_aguardando_reserva'
  | 'reserva_paga'
  | 'ativa'
  | 'pausada'
  | 'cancelada'
  | 'encerrada';

export interface Badge {
  type: BadgeType;
  label: string;
  color: BadgeColor;
}

export interface StartupEnrichedEntity {
  // Campos antigos (100% retrocompat)
  id: string;
  slug: string;
  logo: string | null;
  nome: string;
  categoria: string | null;
  segmento: string | null;
  status: 'aprovada' | 'em_analise' | 'rejeitada';
  estagio: string | null;
  totalTokens: number;
  tokensVendidos: number;
  percentualVendido: number;
  statusCampanha:
    | 'edicao'
    | 'em_analise'
    | 'aberto'
    | 'financiado'
    | 'reprovado'
    | 'pago';
  bandeira: string | null;
  createdAt: string;
  // Campos novos (T049)
  badges: Badge[];
  valorCaptado: number; // REAIS (R$ captado da campanha ativa)
  /** Meta da campanha ativa em REAIS. `null` quando não há campanha ativa. */
  valorMeta: number | null;
  progresso: number; // 0-100
  // Campo novo (T106) - roundStatus
  roundStatus: RoundStatus;
  /** Repasse configurado pelo admin (libera "Solicitar Parcela"). */
  repasseConfigurado: boolean;
  /**
   * Lista de campanhas da startup (id + status). Exposta para a UI
   * `/founder/financeiro` classificar fase ("Em captação" vs "Captação
   * concluída") e selecionar a campanha certa nos CTAs de serviço
   * (compliance-fee, prorrogação).
   */
  campaigns: Array<{ id: number; status: string }>;
  /** Última decisão da Fase 3, usada para liberar correção da captação. */
  phase3Rejected?: boolean;
}

/** Input basico que vem do Prisma (select do findAll) */
export interface StartupBaseInput {
  id: number;
  slug: string;
  logo: { url_sm: string | null } | null;
  nome: string;
  categoryRel?: { nome: string } | null;
  area_atuacao: string | null;
  estagio: string | null;
  status: string;
  reviewDecisions?: Array<{ decision: string }>;
  issuedTokens: number | null;
  pais: Record<string, any> | null;
  campaigns: Array<{
    id: number;
    tokensSold: number;
    totalTokens: number;
    tokenPrice: any;
    tokenBaseValue?: any;
    targetAmount?: any;
    status: string;
  }>;
  createdAt: Date;
}

/**
 * Agregados por campaignId pré-computados em lote (evita N+1 no findAll).
 */
export interface EnrichmentAggregates {
  /** campaignId → soma de Investment.amount com status CONFIRMED. */
  valorCaptadoByCampaign: Map<number, number>;
  /** conjunto de campaignIds com Repasse status=CONFIGURED. */
  repasseConfiguredCampaignIds: Set<number>;
  /** conjunto de campaignIds com taxa de compliance já paga. */
  complianceFeePaidCampaignIds: Set<number>;
}

@Injectable()
export class EnrichmentService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Adiciona campos extras a cada startup do array:
   * badges, valorCaptado, progresso.
   * Campos antigos sao preservados 100% (retrocompat).
   */
  /**
   * Agregados pré-computados para enriquecimento em lote (batch), evitando
   * N+1. São montados uma única vez em `StartupQueryService.findAll` a partir
   * de queries agregadas por `campaignId IN (...)`:
   *  - `valorCaptadoByCampaign`: soma de Investment CONFIRMED por campaignId.
   *  - `repasseConfiguredCampaignIds`: campanhas com Repasse status=CONFIGURED.
   * Quando não fornecidos (ex.: chamada unitária), o serviço cai no caminho
   * legado que consulta o Prisma por startup (retrocompat com specs).
   */
  async enrichStartup(
    startup: StartupBaseInput,
    campaigns: StartupBaseInput['campaigns'],
    aggregates?: EnrichmentAggregates,
  ): Promise<StartupEnrichedEntity> {
    const badges = this.deriveBadges(startup, campaigns);
    // Prioridade: campanha OPEN > última campanha (FUNDED/PAID_OUT/CLOSED).
    // Sem isso, startups com captação concluída mostravam R$ 0 mesmo
    // tendo R$ 8M captados (caso do GreenEnergy legada).
    const activeCampaign =
      campaigns.find((c) => c.status === 'OPEN') ??
      this.pickLatestCampaign(campaigns);
    const campaignIds = campaigns.map((c) => c.id);

    let valorCaptado: number;
    let repasseConfigurado: boolean;
    if (aggregates) {
      // Caminho batch (findAll): tudo já veio agregado — zero I/O aqui.
      valorCaptado = activeCampaign
        ? (aggregates.valorCaptadoByCampaign.get(activeCampaign.id) ?? 0)
        : 0;
      repasseConfigurado = campaignIds.some((id) =>
        aggregates.repasseConfiguredCampaignIds.has(id),
      );
    } else {
      // Caminho legado (chamada unitária): consulta por startup.
      const [captado, repasse] = await Promise.all([
        this.sumInvestmentsByCampaign(activeCampaign?.id),
        campaignIds.length > 0
          ? this.prisma.repasse.findFirst({
              where: { campaignId: { in: campaignIds }, status: 'CONFIGURED' },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);
      valorCaptado = captado;
      repasseConfigurado = Boolean(repasse);
    }
    const progresso = this.deriveProgresso(valorCaptado, activeCampaign);
    const valorMeta = this.deriveTargetAmount(activeCampaign);

    // Mapear para formato antigo (mesma logica do findAll existente)
    const tokensVendidos = campaigns.reduce(
      (sum, c) => sum + (c.tokensSold || 0),
      0,
    );
    const totalTokensCalc = campaigns.reduce(
      (sum, c) => sum + (c.totalTokens || 0),
      0,
    );
    const percentualVendido =
      totalTokensCalc > 0
        ? Math.round((tokensVendidos / totalTokensCalc) * 100)
        : 0;

    const campanhaAberta = campaigns.find((c) => c.status === 'OPEN');
    const campanhaFinanciada = campaigns.find((c) => c.status === 'FUNDED');
    const campanhaEmAnalise =
      startup.status === 'APPROVED' &&
      campaigns.some(
        (campaign) =>
          campaign.status === 'DRAFT' &&
          aggregates?.complianceFeePaidCampaignIds?.has(campaign.id),
      );

    let statusCampanha:
      | 'edicao'
      | 'em_analise'
      | 'aberto'
      | 'financiado'
      | 'pago';
    const startupEmAnalise = [
      'AWAITING_COMPLIANCE_FEE',
      'PENDING_CURATOR_REVIEW',
      'PENDING_APPROVAL',
    ].includes(startup.status);
    if (startupEmAnalise || campanhaEmAnalise) statusCampanha = 'em_analise';
    else if (campanhaAberta) statusCampanha = 'aberto';
    else if (campanhaFinanciada) statusCampanha = 'financiado';
    else if (campaigns.some((c) => c.status === 'PAID_OUT'))
      statusCampanha = 'pago';
    else statusCampanha = 'edicao';

    const paisData = startup.pais as { emoji?: string } | null;
    const bandeira = paisData?.emoji || null;
    const statusMap: Record<string, 'aprovada' | 'em_analise' | 'rejeitada'> = {
      APPROVED: 'aprovada',
      PENDING: 'em_analise',
      REJECTED: 'rejeitada',
    };

    return {
      // Campos antigos (retrocompat)
      id: startup.id.toString(),
      slug: startup.slug,
      logo: startup.logo?.url_sm || null,
      nome: startup.nome,
      categoria: startup.categoryRel?.nome ?? startup.area_atuacao ?? null,
      segmento: startup.area_atuacao || null,
      status: statusMap[startup.status] || 'em_analise',
      estagio: startup.estagio || null,
      totalTokens: startup.issuedTokens || 0,
      tokensVendidos,
      percentualVendido,
      statusCampanha,
      bandeira,
      createdAt: startup.createdAt.toISOString(),
      // Campos novos
      badges,
      valorCaptado,
      valorMeta,
      progresso,
      // Campo novo (T106)
      roundStatus: this.deriveRoundStatus(campaigns),
      repasseConfigurado,
      // Lista de campanhas da startup — exposta para o /founder/financeiro
      // (e qualquer outra tela que precise da fase/status por startup).
      // Mantém o shape do Prisma select: { id, status } — é tudo que a UI
      // precisa para classificar "Em captação" vs "Captação concluída" e
      // escolher a campanha certa para os CTAs de serviço.
      campaigns: campaigns.map((c) => ({
        id: c.id,
        status: c.status,
      })),
      phase3Rejected: startup.reviewDecisions?.[0]?.decision === 'REJECTED',
    };
  }

  /**
   * Deriva o targetAmount (meta em R$) a partir de uma campanha.
   * Retorna `null` se não houver totalTokens/tokenPrice definidos.
   */
  private deriveTargetAmount(
    campaign: StartupBaseInput['campaigns'][0] | undefined,
  ): number | null {
    if (!campaign) return null;
    // Meta em R$ = targetAmount persistido (autoritativo). Fallback: preco
    // BASE x totalTokens (repasse integral) — nao o preco de venda, que
    // inclui markup da plataforma. Legado sem base/target: tokenPrice x
    // totalTokens (quando os dois valores eram identicos).
    if (campaign.targetAmount != null) {
      return Number(campaign.targetAmount);
    }
    const unit = campaign.tokenBaseValue ?? campaign.tokenPrice;
    if (!campaign.totalTokens || unit == null) return null;
    return Number(unit) * campaign.totalTokens;
  }

  /**
   * Escolhe a campanha mais recente (maior `id`, equivalente a "última criada"
   * no fluxo do founder) quando não há campanha ativa. Usado como fallback
   * para `valorMeta` em startups já financiadas ou em rascunho.
   */
  private pickLatestCampaign(
    campaigns: StartupBaseInput['campaigns'],
  ): StartupBaseInput['campaigns'][0] | undefined {
    if (campaigns.length === 0) return undefined;
    return campaigns.reduce((latest, current) =>
      current.id > latest.id ? current : latest,
    );
  }

  /**
   * Deriva badges (max 3) a partir do status da startup + campanha.
   */
  private deriveBadges(
    startup: StartupBaseInput,
    campaigns: StartupBaseInput['campaigns'],
  ): Badge[] {
    const badges: Badge[] = [];

    // 1. Status da startup
    if (startup.status === 'PENDING')
      badges.push({ type: 'STATUS', label: 'Em Análise', color: 'yellow' });
    else if (startup.status === 'APPROVED')
      badges.push({ type: 'STATUS', label: 'Aprovada', color: 'green' });
    else if (startup.status === 'REJECTED')
      badges.push({ type: 'STATUS', label: 'Reprovada', color: 'red' });
    else if (startup.status === 'PENDING_RESERVATION_PAYMENT')
      badges.push({
        type: 'PAGAMENTO',
        label: 'Aguardando Pgto',
        color: 'orange',
      });

    // 2. Status da campanha mais relevante (prioridade: OPEN > FUNDED > PAID_OUT)
    const priorityCampaign =
      campaigns.find((c) => c.status === 'OPEN') ??
      campaigns.find((c) => c.status === 'FUNDED') ??
      campaigns.find((c) => c.status === 'PAID_OUT');

    if (priorityCampaign) {
      if (priorityCampaign.status === 'OPEN')
        badges.push({ type: 'RODADA', label: 'Em Captação', color: 'green' });
      else if (priorityCampaign.status === 'FUNDED')
        badges.push({ type: 'RODADA', label: 'Financiada', color: 'blue' });
      else if (priorityCampaign.status === 'PAID_OUT')
        badges.push({
          type: 'RODADA',
          label: 'Repasse Concluído',
          color: 'blue',
        });
    }

    return badges.slice(0, 3); // UX: max 3 badges
  }

  /**
   * Soma do repasse devido a startup (startupRepasseAmount) de investments
   * confirmados — linhas legadas sem split caem no `amount`.
   */
  private async sumInvestmentsByCampaign(
    campaignId: number | undefined,
  ): Promise<number> {
    if (!campaignId) return 0;
    const [repasseAgg, legacyAgg] = await Promise.all([
      this.prisma.investment.aggregate({
        where: { campaignId, status: 'CONFIRMED' },
        _sum: { startupRepasseAmount: true },
      }),
      this.prisma.investment.aggregate({
        where: {
          campaignId,
          status: 'CONFIRMED',
          startupRepasseAmount: null,
        },
        _sum: { amount: true },
      }),
    ]);
    return (
      Number(repasseAgg._sum?.startupRepasseAmount ?? 0) +
      Number(legacyAgg._sum?.amount ?? 0)
    );
  }

  /**
   * Progresso = (valorCaptado / meta) * 100. valorCaptado e meta estao na
   * mesma base (repasse/preco base) — nunca cruzar com preco de venda.
   */
  private deriveProgresso(
    valorCaptado: number,
    activeCampaign: StartupBaseInput['campaigns'][0] | undefined,
  ): number {
    if (!activeCampaign) return 0;
    const meta = this.deriveTargetAmount(activeCampaign);
    if (!meta || meta === 0) return 0;
    return Math.round((valorCaptado / meta) * 100);
  }

  /**
   * Deriva o roundStatus a partir das campanhas da startup.
   * Mapeia CampaignStatus -> RoundStatus conforme a logica de negocio.
   */
  private deriveRoundStatus(
    campaigns: StartupBaseInput['campaigns'],
  ): RoundStatus {
    // Prioridade: OPEN > PAUSED > (CLOSED|FUNDED|PAID_OUT) > DRAFT > nenhuma
    const openCampaign = campaigns.find((c) => c.status === 'OPEN');
    if (openCampaign) return 'ativa';

    const pausedCampaign = campaigns.find((c) => c.status === 'PAUSED');
    if (pausedCampaign) return 'pausada';

    const closedCampaign = campaigns.find(
      (c) =>
        c.status === 'CLOSED' ||
        c.status === 'FUNDED' ||
        c.status === 'PAID_OUT',
    );
    if (closedCampaign) return 'encerrada';

    const draftCampaign = campaigns.find((c) => c.status === 'DRAFT');
    if (draftCampaign) return 'criada_aguardando_reserva';

    return 'sem_rodada';
  }
}
