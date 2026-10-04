import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateAffiliateProgramDto,
  DecideAffiliateProgramDto,
  DecideAffiliationDto,
} from './dto/affiliate.dto';
import { ConfigService } from '../config/config.service';

/** Chaves dos percentuais default do programa (config versionada). */
const CFG_AFFILIATE_PCT = 'affiliate.defaultAffiliatePct';
const CFG_PLATFORM_PCT = 'affiliate.defaultPlatformPct';

/**
 * Status da startup em que o programa de afiliados pode operar (aberto a
 * candidaturas e a aceite). Fora disso (PENDING*, REJECTED, DECLINED) nada
 * pode ser candidatado nem aceito — evita afiliados em startup não aprovada.
 */
const STARTUP_ATIVA: string[] = ['APPROVED', 'LIVE'];

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  // ==========================================
  // ETAPA 1 — adesao da startup ao programa
  // ==========================================

  /**
   * Fundador solicita a adesao da sua startup ao programa de afiliados.
   * Exige startup APPROVED; uma startup so tem um programa (1:1).
   */
  async requestProgram(
    startupId: number,
    founderId: number,
    dto: CreateAffiliateProgramDto,
  ) {
    try {
      const startup = await this.prisma.startup.findUnique({
        where: { id: startupId },
        include: { affiliateProgram: true },
      });

      if (!startup) {
        return ResponseDto.error('Startup não encontrada', 404);
      }
      if (startup.founderId !== founderId) {
        return ResponseDto.error('Startup não pertence a este fundador', 403);
      }
      if (!STARTUP_ATIVA.includes(startup.status)) {
        return ResponseDto.error(
          'Somente startups aprovadas podem aderir ao programa de afiliados',
          400,
        );
      }
      if (startup.affiliateProgram) {
        return ResponseDto.error(
          `Esta startup já possui adesão com status ${startup.affiliateProgram.status}`,
          409,
        );
      }

      const defaults = await this.getDefaultPercentuais();

      const program = await this.prisma.affiliateProgram.create({
        data: {
          startupId,
          requestedBy: founderId,
          affiliateCommissionPct:
            dto.affiliateCommissionPct ?? defaults.affiliatePct,
          platformCommissionPct:
            dto.platformCommissionPct ?? defaults.platformPct,
          maxAffiliates: dto.maxAffiliates ?? null,
        },
      });

      this.logger.log(
        `Adesão ao programa de afiliados solicitada: startup ${startupId}`,
      );
      return ResponseDto.success(
        'Adesão solicitada, aguardando análise da iSelfToken',
        201,
        program,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao solicitar adesão', 500, error);
    }
  }

  /** Consulta a adesao de uma startup. */
  async getProgramByStartup(startupId: number) {
    try {
      const program = await this.prisma.affiliateProgram.findUnique({
        where: { startupId },
        include: {
          _count: { select: { affiliations: true } },
        },
      });

      if (!program) {
        return ResponseDto.error(
          'Esta startup não aderiu ao programa de afiliados',
          404,
        );
      }
      return ResponseDto.success('Programa encontrado', 200, program);
    } catch (error) {
      return ResponseDto.error('Erro ao buscar programa', 500, error);
    }
  }

  /** Lista adesoes para a fila da admin. */
  async listPrograms(status?: string) {
    try {
      const where: Prisma.AffiliateProgramWhereInput = {};
      if (status) {
        where.status =
          status as Prisma.EnumAffiliateProgramStatusFilter['equals'];
      }

      const programs = await this.prisma.affiliateProgram.findMany({
        where,
        include: {
          startup: { select: { id: true, nome: true, area_atuacao: true } },
          _count: { select: { affiliations: true } },
        },
        orderBy: { requestedAt: 'desc' },
      });

      return ResponseDto.success(
        'Programas listados',
        200,
        programs,
        programs.length,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao listar programas', 500, error);
    }
  }

  /** Admin aprova ou rejeita a adesao, fixando os percentuais definitivos. */
  async decideProgram(
    programId: number,
    adminId: number,
    dto: DecideAffiliateProgramDto,
  ) {
    try {
      const program = await this.prisma.affiliateProgram.findUnique({
        where: { id: programId },
      });

      if (!program) {
        return ResponseDto.error('Programa não encontrado', 404);
      }
      if (program.status !== 'PENDING') {
        return ResponseDto.error(
          `Programa já decidido (status ${program.status})`,
          409,
        );
      }
      if (dto.decision === 'REJECTED' && !dto.reason) {
        return ResponseDto.error('Motivo é obrigatório para rejeitar', 400);
      }

      const updated = await this.prisma.affiliateProgram.update({
        where: { id: programId },
        data: {
          status: dto.decision,
          decidedAt: new Date(),
          decidedBy: adminId,
          decisionReason: dto.reason ?? null,
          ...(dto.affiliateCommissionPct !== undefined && {
            affiliateCommissionPct: dto.affiliateCommissionPct,
          }),
          ...(dto.platformCommissionPct !== undefined && {
            platformCommissionPct: dto.platformCommissionPct,
          }),
        },
      });

      this.logger.log(
        `Programa ${programId} ${dto.decision} por admin ${adminId}`,
      );
      return ResponseDto.success(
        dto.decision === 'APPROVED' ? 'Adesão aprovada' : 'Adesão rejeitada',
        200,
        updated,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao decidir programa', 500, error);
    }
  }

  /** Programas abertos a candidatura, para a vitrine do afiliado. */
  async listOpenPrograms() {
    try {
      const programs = await this.prisma.affiliateProgram.findMany({
        // Só vitrine de programas aprovados DE startups ainda aprovadas —
        // uma startup que voltou a pendente/rejeitada some da vitrine.
        where: {
          status: 'APPROVED',
          startup: {
            status: {
              in: STARTUP_ATIVA as Prisma.EnumStartupStatusFilter['in'],
            },
          },
        },
        include: {
          startup: {
            select: {
              id: true,
              nome: true,
              area_atuacao: true,
              estagio: true,
              logo: { select: { url: true } },
            },
          },
          _count: { select: { affiliations: true } },
        },
        orderBy: { decidedAt: 'desc' },
      });

      const data = programs.map((p) => ({
        programId: p.id,
        startup: p.startup,
        affiliateCommissionPct: p.affiliateCommissionPct,
        maxAffiliates: p.maxAffiliates,
        afiliadosAtivos: p._count.affiliations,
      }));

      return ResponseDto.success('Programas abertos', 200, data, data.length);
    } catch (error) {
      return ResponseDto.error('Erro ao listar programas abertos', 500, error);
    }
  }

  // ==========================================
  // ETAPA 2 — candidatura e triagem do fundador
  // ==========================================

  /**
   * Usuario se candidata a afiliado de um programa aprovado.
   * O AffiliateGuard ja garantiu papel elegivel e plano ativo.
   */
  async apply(programId: number, userId: number) {
    try {
      const program = await this.prisma.affiliateProgram.findUnique({
        where: { id: programId },
        include: {
          startup: { select: { founderId: true, status: true } },
          _count: { select: { affiliations: { where: { status: 'ACTIVE' } } } },
        },
      });

      if (!program) {
        return ResponseDto.error('Programa não encontrado', 404);
      }
      if (program.status !== 'APPROVED') {
        return ResponseDto.error(
          'Este programa não está aberto a candidaturas',
          400,
        );
      }
      if (!STARTUP_ATIVA.includes(program.startup.status)) {
        return ResponseDto.error(
          'Esta startup não está aprovada — o programa de afiliados está indisponível',
          400,
        );
      }
      if (program.startup.founderId === userId) {
        return ResponseDto.error(
          'O fundador não pode ser afiliado da própria startup',
          400,
        );
      }
      if (
        program.maxAffiliates !== null &&
        program._count.affiliations >= program.maxAffiliates
      ) {
        return ResponseDto.error(
          'Este programa atingiu o limite de afiliados ativos',
          409,
        );
      }

      const existing = await this.prisma.affiliation.findUnique({
        where: { programId_userId: { programId, userId } },
      });
      if (existing) {
        return ResponseDto.error(
          `Você já possui candidatura neste programa (status ${existing.status})`,
          409,
        );
      }

      // Config do admin: exigir (ou não) análise da candidatura. Ligado, passa
      // pela triagem do fundador e depois da iSelfToken. Desligado (padrão), o
      // afiliado é APROVADO AUTOMATICAMENTE — sem análise do fundador nem do admin.
      const exigeAnalise =
        (await this.config.getEffective('affiliate.requireFounderReview')) !==
        0;

      const code = await this.generateCode();

      if (!exigeAnalise) {
        const agora = new Date();
        const affiliation = await this.prisma.affiliation.create({
          data: {
            programId,
            userId,
            code,
            status: 'ACTIVE',
            // Marca o desfecho automático (sem um decisor humano).
            founderDecidedAt: agora,
            adminDecidedAt: agora,
            purchaseLinkUrl: this.buildPurchaseLink(program.startupId, code),
          },
        });
        this.logger.log(
          `Candidatura de afiliado ${userId} ao programa ${programId} APROVADA AUTOMATICAMENTE (sem análise)`,
        );
        return ResponseDto.success(
          'Candidatura aprovada automaticamente — você já é afiliado desta startup',
          201,
          affiliation,
        );
      }

      const affiliation = await this.prisma.affiliation.create({
        data: { programId, userId, code, status: 'PENDING_FOUNDER' },
      });
      this.logger.log(
        `Candidatura de afiliado ${userId} ao programa ${programId} (aguardando análise do fundador)`,
      );
      return ResponseDto.success(
        'Candidatura enviada, aguardando análise do fundador',
        201,
        affiliation,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao se candidatar', 500, error);
    }
  }

  /**
   * Candidaturas das startups de um fundador. Anexa a cada linha os tokens
   * ainda disponiveis para alocar (por startup), para a UI de triagem.
   * Aceita filtro opcional por startupId para a página de gerenciamento
   * acessada direto pelo dashboard do fundador.
   */
  async listAffiliationsForFounder(
    founderId: number,
    options: { status?: string; startupId?: number } = {},
  ) {
    const { status, startupId } = options;
    try {
      const affiliations = await this.prisma.affiliation.findMany({
        where: {
          program: {
            startup: { founderId, ...(startupId && { id: startupId }) },
          },
          ...(status && {
            status: status as Prisma.EnumAffiliationStatusFilter['equals'],
          }),
        },
        include: {
          user: { select: { id: true, nome: true, email: true, role: true } },
          program: {
            select: {
              id: true,
              affiliateCommissionPct: true,
              startup: { select: { id: true, nome: true } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      });

      // Disponibilidade por startup (calculada uma vez por startup envolvida).
      const startupIds = [
        ...new Set(affiliations.map((a) => a.program.startup.id)),
      ];
      const disponivelPorStartup = new Map<number, number>();
      await Promise.all(
        startupIds.map(async (sid) => {
          disponivelPorStartup.set(
            sid,
            await this.getStartupAvailableTokens(sid),
          );
        }),
      );

      const data = affiliations.map((a) => ({
        id: a.id,
        status: a.status,
        code: a.code,
        tokensAllocated: a.tokensAllocated,
        appliedAt: a.appliedAt,
        rejectionReason: a.rejectionReason,
        user: a.user,
        startup: a.program.startup,
        comissaoPct: a.program.affiliateCommissionPct,
        tokensAvailable: disponivelPorStartup.get(a.program.startup.id) ?? 0,
      }));

      return ResponseDto.success(
        'Candidaturas listadas',
        200,
        data,
        data.length,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao listar candidaturas', 500, error);
    }
  }

  /**
   * Fundador tria a candidatura. Ao aprovar, aloca os tokens que o afiliado
   * podera vender e encaminha para a admin (PENDING_ADMIN); quem ativa de
   * fato e a etapa 3. A quantidade e validada contra os tokens ainda
   * disponiveis nas campanhas da startup.
   */
  async founderDecide(
    affiliationId: number,
    founderId: number,
    dto: DecideAffiliationDto,
  ) {
    try {
      const affiliation = await this.prisma.affiliation.findUnique({
        where: { id: affiliationId },
        include: { program: { include: { startup: true } } },
      });

      if (!affiliation) {
        return ResponseDto.error('Candidatura não encontrada', 404);
      }
      if (affiliation.program.startup.founderId !== founderId) {
        return ResponseDto.error(
          'Candidatura não pertence a este fundador',
          403,
        );
      }
      // Só bloqueia a APROVAÇÃO: rejeitar candidato de startup pendente é
      // limpeza legítima e continua permitido.
      if (
        dto.decision === 'APPROVED' &&
        !STARTUP_ATIVA.includes(affiliation.program.startup.status)
      ) {
        return ResponseDto.error(
          'Startup não aprovada — não é possível aceitar afiliados enquanto ela estiver pendente',
          400,
        );
      }
      if (affiliation.status !== 'PENDING_FOUNDER') {
        return ResponseDto.error(
          `Candidatura não está aguardando o fundador (status ${affiliation.status})`,
          409,
        );
      }
      if (dto.decision === 'REJECTED' && !dto.reason) {
        return ResponseDto.error('Motivo é obrigatório para rejeitar', 400);
      }

      // Ao aprovar, o fundador precisa alocar tokens dentro do que ainda
      // sobra para venda nas campanhas da startup.
      if (dto.decision === 'APPROVED') {
        if (!dto.tokensAllocated || dto.tokensAllocated < 1) {
          return ResponseDto.error(
            'Informe a quantidade de tokens a alocar ao afiliado',
            400,
          );
        }
        const disponivel = await this.getStartupAvailableTokens(
          affiliation.program.startupId,
        );
        if (dto.tokensAllocated > disponivel) {
          return ResponseDto.error(
            `Tokens insuficientes: há ${disponivel} disponível(is) para alocar`,
            400,
          );
        }
      }

      const updated = await this.prisma.affiliation.update({
        where: { id: affiliationId },
        data: {
          status: dto.decision === 'APPROVED' ? 'PENDING_ADMIN' : 'REJECTED',
          founderDecidedAt: new Date(),
          founderDecidedBy: founderId,
          rejectionReason:
            dto.decision === 'REJECTED' ? (dto.reason ?? null) : null,
          ...(dto.decision === 'APPROVED' && {
            tokensAllocated: dto.tokensAllocated,
          }),
        },
      });

      return ResponseDto.success(
        dto.decision === 'APPROVED'
          ? 'Candidatura aprovada e encaminhada à iSelfToken'
          : 'Candidatura rejeitada',
        200,
        updated,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao decidir candidatura', 500, error);
    }
  }

  // ==========================================
  // ETAPA 3 — aval da admin, tokens e link
  // ==========================================

  /** Fila da admin: candidaturas ja triadas pelo fundador. */
  async listAffiliationsForAdmin(status?: string) {
    try {
      const affiliations = await this.prisma.affiliation.findMany({
        where: status
          ? { status: status as Prisma.EnumAffiliationStatusFilter['equals'] }
          : {},
        include: {
          user: { select: { id: true, nome: true, email: true } },
          program: {
            select: {
              id: true,
              affiliateCommissionPct: true,
              platformCommissionPct: true,
              startup: { select: { id: true, nome: true } },
            },
          },
        },
        orderBy: { founderDecidedAt: 'desc' },
      });

      return ResponseDto.success(
        'Candidaturas listadas',
        200,
        affiliations,
        affiliations.length,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao listar candidaturas', 500, error);
    }
  }

  /**
   * Aval final da admin. Ao aprovar, gera o link publico de compra vinculado
   * ao codigo do afiliado. Os tokens alocados ja foram definidos pelo fundador
   * na etapa 2 e sao preservados aqui.
   */
  async adminDecide(
    affiliationId: number,
    adminId: number,
    dto: DecideAffiliationDto,
  ) {
    try {
      const affiliation = await this.prisma.affiliation.findUnique({
        where: { id: affiliationId },
        include: { program: { include: { startup: true } } },
      });

      if (!affiliation) {
        return ResponseDto.error('Candidatura não encontrada', 404);
      }
      if (affiliation.status !== 'PENDING_ADMIN') {
        return ResponseDto.error(
          `Candidatura não está aguardando a iSelfToken (status ${affiliation.status})`,
          409,
        );
      }
      // Ativar afiliação exige startup aprovada; rejeitar segue permitido.
      if (
        dto.decision === 'APPROVED' &&
        !STARTUP_ATIVA.includes(affiliation.program.startup.status)
      ) {
        return ResponseDto.error(
          'Startup não aprovada — não é possível ativar afiliações enquanto ela estiver pendente',
          400,
        );
      }
      if (dto.decision === 'REJECTED' && !dto.reason) {
        return ResponseDto.error('Motivo é obrigatório para rejeitar', 400);
      }

      const purchaseLinkUrl =
        dto.decision === 'APPROVED'
          ? this.buildPurchaseLink(
              affiliation.program.startupId,
              affiliation.code,
            )
          : null;

      const updated = await this.prisma.affiliation.update({
        where: { id: affiliationId },
        data: {
          status: dto.decision === 'APPROVED' ? 'ACTIVE' : 'REJECTED',
          adminDecidedAt: new Date(),
          adminDecidedBy: adminId,
          rejectionReason:
            dto.decision === 'REJECTED' ? (dto.reason ?? null) : null,
          // tokensAllocated ja foi definido pelo fundador na etapa 2.
          purchaseLinkUrl,
        },
      });

      this.logger.log(
        `Afiliação ${affiliationId} ${dto.decision} por admin ${adminId}`,
      );
      return ResponseDto.success(
        dto.decision === 'APPROVED'
          ? 'Afiliação ativada'
          : 'Candidatura rejeitada',
        200,
        updated,
      );
    } catch (error) {
      return ResponseDto.error('Erro ao decidir candidatura', 500, error);
    }
  }

  // ==========================================
  // PAINEL DO AFILIADO
  // ==========================================

  /** Afiliacoes do usuario logado, com codigo, link e total ja comissionado. */
  async listMine(userId: number) {
    try {
      const affiliations = await this.prisma.affiliation.findMany({
        where: { userId },
        include: {
          program: {
            select: {
              id: true,
              affiliateCommissionPct: true,
              startup: { select: { id: true, nome: true } },
            },
          },
        },
        orderBy: { appliedAt: 'desc' },
      });

      // Comissões do afiliado, com status e investidor — para separar o que já
      // foi RECEBIDO (PAID) do que está PENDENTE (ainda não garantido) e contar
      // os investidores REAIS que geraram comissão (inclui atribuição por código
      // no checkout, não só por clique no link). CANCELED é ignorado.
      const commissions = await this.prisma.affiliateCommission.findMany({
        where: { affiliation: { userId } },
        select: {
          affiliationId: true,
          status: true,
          affiliateAmount: true,
          investment: { select: { userId: true } },
        },
      });

      const recebidaPorAff = new Map<number, number>();
      const pendentePorAff = new Map<number, number>();
      const investidoresPorAff = new Map<number, Set<number>>();
      for (const c of commissions) {
        if (c.status === 'CANCELED') continue;
        const amt = Number(c.affiliateAmount);
        if (c.status === 'PAID') {
          recebidaPorAff.set(
            c.affiliationId,
            (recebidaPorAff.get(c.affiliationId) ?? 0) + amt,
          );
        } else {
          // PENDING / PAYABLE → ainda a receber
          pendentePorAff.set(
            c.affiliationId,
            (pendentePorAff.get(c.affiliationId) ?? 0) + amt,
          );
        }
        const set =
          investidoresPorAff.get(c.affiliationId) ?? new Set<number>();
        if (c.investment?.userId) set.add(c.investment.userId);
        investidoresPorAff.set(c.affiliationId, set);
      }

      const data = affiliations.map((a) => {
        const recebida = recebidaPorAff.get(a.id) ?? 0;
        const pendente = pendentePorAff.get(a.id) ?? 0;
        return {
          id: a.id,
          status: a.status,
          code: a.code,
          purchaseLinkUrl: a.purchaseLinkUrl,
          tokensAllocated: a.tokensAllocated,
          startup: a.program.startup,
          comissaoPct: a.program.affiliateCommissionPct,
          // Investidores que efetivamente aportaram por indicação deste afiliado.
          investidores: investidoresPorAff.get(a.id)?.size ?? 0,
          comissaoRecebida: recebida, // PAID — já caiu
          comissaoPendente: pendente, // PENDING/PAYABLE — ainda não garantido
          totalComissionado: recebida + pendente,
          rejectionReason: a.rejectionReason,
        };
      });

      return ResponseDto.success('Afiliações listadas', 200, data, data.length);
    } catch (error) {
      return ResponseDto.error('Erro ao listar afiliações', 500, error);
    }
  }

  // ==========================================
  // AUXILIARES
  // ==========================================

  /**
   * Tokens ainda disponiveis para o fundador alocar a afiliados.
   * Base = soma de (totalTokens - tokensSold) nas campanhas OPEN da startup.
   * Desconta o que ja foi alocado a afiliacoes vigentes (PENDING_ADMIN/ACTIVE).
   */
  async getStartupAvailableTokens(startupId: number): Promise<number> {
    const campanhas = await this.prisma.campaign.findMany({
      where: { startupId, status: 'OPEN' },
      select: { totalTokens: true, tokensSold: true },
    });
    const emCampanhas = campanhas.reduce(
      (soma, c) => soma + Math.max(0, c.totalTokens - c.tokensSold),
      0,
    );

    const alocados = await this.prisma.affiliation.aggregate({
      where: {
        program: { startupId },
        status: { in: ['PENDING_ADMIN', 'ACTIVE'] },
      },
      _sum: { tokensAllocated: true },
    });

    const jaAlocado = alocados._sum.tokensAllocated ?? 0;
    return Math.max(0, emCampanhas - jaAlocado);
  }

  /**
   * Percentuais default do programa, VIGENTES hoje (config versionada). Só são
   * usados como sugestão ao criar o programa; o valor efetivo fica congelado em
   * AffiliateProgram, então mudanças futuras não afetam programas já criados.
   */
  private async getDefaultPercentuais() {
    const eff = await this.config.getManyEffective([
      CFG_AFFILIATE_PCT,
      CFG_PLATFORM_PCT,
    ]);
    return {
      affiliatePct: eff[CFG_AFFILIATE_PCT],
      platformPct: eff[CFG_PLATFORM_PCT],
    };
  }

  /** Codigo curto e unico no formato AFL-XXXXXX. */
  private async generateCode(): Promise<string> {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const code = `AFL-${randomBytes(4).toString('hex').toUpperCase()}`;
      const taken = await this.prisma.affiliation.findUnique({
        where: { code },
      });
      if (!taken) return code;
    }
    // Colisao 5x seguidas e improvavel; cai para um sufixo mais longo.
    return `AFL-${randomBytes(8).toString('hex').toUpperCase()}`;
  }

  /** Link publico de compra que carrega o codigo do afiliado. */
  private buildPurchaseLink(startupId: number, code: string): string {
    const base = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    // Rota do frontend e /startups/:id (plural). Ex.: /startups/41?ref=AFL-...
    return `${base.replace(/\/$/, '')}/startups/${startupId}?ref=${code}`;
  }
}
