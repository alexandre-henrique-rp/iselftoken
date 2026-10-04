import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';

export type ActorRole =
  | 'INVESTIDOR'
  | 'FUNDADOR'
  | 'AFILIADO'
  | 'ADMIN'
  | 'SISTEMA';

export type EventCategory =
  | 'INVESTIMENTO'
  | 'PAGAMENTO'
  | 'TOKEN'
  | 'SAQUE'
  | 'AFILIACAO'
  | 'COMISSAO'
  | 'STARTUP'
  | 'ADMIN'
  | 'USUARIO'
  | 'ASSINATURA'
  | 'KYC';

export interface HistoryEvent {
  id: string;
  timestamp: string; // ISO
  category: EventCategory;
  type: string; // código
  action: string; // rótulo pt-BR
  status: string | null;
  amount: number | null;
  actor: { id: number; nome: string; email: string } | null;
  actorRole: ActorRole;
  startup: { id: number; nome: string } | null;
  description: string;
}

export interface HistoryFilters {
  role?: string;
  category?: string;
  type?: string;
  status?: string;
  userId?: number;
  startupId?: number;
  from?: string; // ISO date
  to?: string; // ISO date
  fromTime?: string; // HH:mm
  toTime?: string; // HH:mm
  actorName?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const brl = (v: number | null) =>
  v == null
    ? ''
    : new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(v);

/**
 * Agrega, num único "timeline" normalizado, as transações e decisões espalhadas
 * pelas tabelas tipadas (investimento, pagamento, reserva, saque, afiliação,
 * comissão, alteração de dados, auditoria). Read-only: reflete os dados reais.
 *
 * Escala: para o volume atual (centenas de registros) a agregação em memória é
 * suficiente. Em produção com milhões de linhas, materializar numa tabela de
 * eventos (append-only) seria o próximo passo.
 */
@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(filters: HistoryFilters) {
    try {
      const events = await this.buildAllEvents();
      const filtered = this.applyFilters(events, filters);
      filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      const page = Math.max(1, Number(filters.page) || 1);
      const pageSize = Math.min(
        200,
        Math.max(1, Number(filters.pageSize) || 50),
      );
      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const items = filtered.slice(start, start + pageSize);

      return ResponseDto.success('Histórico de transações', 200, {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        facets: this.buildFacets(filtered),
      });
    } catch (error) {
      this.logger.error('Erro ao montar histórico', error);
      return ResponseDto.error('Erro ao montar histórico', 500, error);
    }
  }

  /** Todos os eventos (sem paginação), já filtrados — usado pelo export CSV. */
  async listAllForExport(filters: HistoryFilters): Promise<HistoryEvent[]> {
    const events = await this.buildAllEvents();
    const filtered = this.applyFilters(events, filters);
    filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return filtered;
  }

  // ==========================================
  // Agregação
  // ==========================================

  private async buildAllEvents(): Promise<HistoryEvent[]> {
    const [
      investments,
      payments,
      reservations,
      withdrawals,
      programs,
      affiliations,
      commissions,
      changeRequests,
      auditLogs,
    ] = await Promise.all([
      this.prisma.investment.findMany({
        include: {
          user: { select: { id: true, nome: true, email: true } },
          campaign: {
            select: {
              title: true,
              startup: { select: { id: true, nome: true } },
            },
          },
        },
      }),
      this.prisma.payment.findMany({
        include: {
          user: { select: { id: true, nome: true, email: true } },
          campaign: {
            select: { startup: { select: { id: true, nome: true } } },
          },
        },
      }),
      this.prisma.tokenReservation.findMany({
        include: {
          user: { select: { id: true, nome: true, email: true } },
          campaign: {
            select: {
              title: true,
              startup: { select: { id: true, nome: true } },
            },
          },
        },
      }),
      this.prisma.withdrawal.findMany({
        include: {
          startup: {
            select: {
              id: true,
              nome: true,
              founder: { select: { id: true, nome: true, email: true } },
            },
          },
        },
      }),
      this.prisma.affiliateProgram.findMany({
        include: {
          startup: {
            select: {
              id: true,
              nome: true,
              founder: { select: { id: true, nome: true, email: true } },
            },
          },
        },
      }),
      this.prisma.affiliation.findMany({
        include: {
          user: { select: { id: true, nome: true, email: true } },
          program: {
            select: { startup: { select: { id: true, nome: true } } },
          },
        },
      }),
      this.prisma.affiliateCommission.findMany({
        include: {
          affiliation: {
            select: {
              user: { select: { id: true, nome: true, email: true } },
              program: {
                select: { startup: { select: { id: true, nome: true } } },
              },
            },
          },
        },
      }),
      this.prisma.dataChangeRequest.findMany({
        include: {
          requestedBy: { select: { id: true, nome: true, email: true } },
          startup: { select: { id: true, nome: true } },
          reviewedBy: { select: { id: true, nome: true, email: true } },
        },
      }),
      this.prisma.auditLog.findMany({
        include: { user: { select: { id: true, nome: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ]);

    // Resolve nomes de quem decidiu (ids soltos em decidedBy/adminDecidedBy).
    const deciderIds = new Set<number>();
    for (const p of programs) if (p.decidedBy) deciderIds.add(p.decidedBy);
    for (const a of affiliations) {
      if (a.founderDecidedBy) deciderIds.add(a.founderDecidedBy);
      if (a.adminDecidedBy) deciderIds.add(a.adminDecidedBy);
    }
    const deciders = deciderIds.size
      ? await this.prisma.user.findMany({
          where: { id: { in: [...deciderIds] } },
          select: { id: true, nome: true, email: true },
        })
      : [];
    const deciderById = new Map(deciders.map((u) => [u.id, u]));

    const ev: HistoryEvent[] = [];

    // ---- Investimentos ----
    for (const i of investments) {
      const startup = i.campaign?.startup ?? null;
      const amount = Number(i.amount);
      ev.push({
        id: `inv-${i.id}`,
        timestamp: i.createdAt.toISOString(),
        category: 'INVESTIMENTO',
        type: 'INVESTMENT_CREATED',
        action: 'Investimento solicitado',
        status: i.status,
        amount,
        actor: i.user,
        actorRole: 'INVESTIDOR',
        startup,
        description: `${i.user?.nome ?? 'Investidor'} solicitou investir ${brl(amount)} (${i.tokensQty} tokens) em ${startup?.nome ?? 'campanha'}${i.affiliateCode ? ` · ref ${i.affiliateCode}` : ''}.`,
      });
    }

    // ---- Pagamentos ----
    const purposeLabel: Record<string, string> = {
      INVESTMENT: 'investimento',
      SUBSCRIPTION: 'assinatura',
      TOKEN_RESERVATION: 'reserva de tokens',
      EARLY_ACCESS: 'acesso antecipado',
      P2P_BUY: 'compra P2P',
      VERIFICATION_SEAL: 'selo de verificação',
    };
    for (const p of payments) {
      const startup = p.campaign?.startup ?? null;
      const amount = Number(p.amount);
      const alvo = purposeLabel[p.purpose] ?? p.purpose;
      ev.push({
        id: `pay-${p.id}-c`,
        timestamp: p.createdAt.toISOString(),
        category: 'PAGAMENTO',
        type: 'PAYMENT_CREATED',
        action: 'Pagamento criado',
        status: p.status,
        amount,
        actor: p.user,
        actorRole: 'INVESTIDOR',
        startup,
        description: `${p.user?.nome ?? 'Usuário'} gerou pagamento ${p.method} de ${brl(amount)} (${alvo}).`,
      });
      if (p.paidAt) {
        ev.push({
          id: `pay-${p.id}-p`,
          timestamp: p.paidAt.toISOString(),
          category: 'PAGAMENTO',
          type: 'PAYMENT_PAID',
          action: 'Pagamento confirmado',
          status: 'PAID',
          amount,
          actor: p.user,
          actorRole: 'INVESTIDOR',
          startup,
          description: `Pagamento de ${brl(amount)} (${alvo}) confirmado.`,
        });
      }
      if (p.status === 'CANCELED') {
        ev.push({
          id: `pay-${p.id}-x`,
          timestamp: p.updatedAt.toISOString(),
          category: 'PAGAMENTO',
          type: 'PAYMENT_CANCELED',
          action: 'Pagamento cancelado',
          status: 'CANCELED',
          amount,
          actor: p.user,
          actorRole: 'INVESTIDOR',
          startup,
          description: `Pagamento de ${brl(amount)} (${alvo}) cancelado.`,
        });
      }
    }

    // ---- Reservas de tokens ----
    for (const r of reservations) {
      const startup = r.campaign?.startup ?? null;
      ev.push({
        id: `res-${r.id}-c`,
        timestamp: r.createdAt.toISOString(),
        category: 'TOKEN',
        type: 'RESERVATION_CREATED',
        action: 'Tokens reservados',
        status: r.status,
        amount: null,
        actor: r.user,
        actorRole: 'INVESTIDOR',
        startup,
        description: `${r.user?.nome ?? 'Investidor'} reservou ${r.quantity} tokens de ${startup?.nome ?? 'campanha'}.`,
      });
      if (r.confirmedAt) {
        ev.push({
          id: `res-${r.id}-e`,
          timestamp: r.confirmedAt.toISOString(),
          category: 'TOKEN',
          type: 'RESERVATION_CONFIRMED',
          action: 'Reserva efetivada',
          status: 'CONFIRMED',
          amount: null,
          actor: r.user,
          actorRole: 'INVESTIDOR',
          startup,
          description: `Reserva de ${r.quantity} tokens efetivada (tokens emitidos).`,
        });
      }
      if (r.discardedAt) {
        ev.push({
          id: `res-${r.id}-d`,
          timestamp: r.discardedAt.toISOString(),
          category: 'TOKEN',
          type: 'RESERVATION_DISCARDED',
          action: 'Reserva descartada',
          status: 'DISCARDED',
          amount: null,
          actor: r.user,
          actorRole: 'INVESTIDOR',
          startup,
          description: `Reserva de ${r.quantity} tokens descartada${r.discardReason ? `: ${r.discardReason}` : ''}.`,
        });
      }
    }

    // ---- Saques (fundador/startup) ----
    const wStatusLabel: Record<string, string> = {
      REQUESTED: 'Saque solicitado',
      PROCESSING: 'Saque em processamento',
      COMPLETED: 'Saque concluído',
      REJECTED: 'Saque rejeitado',
    };
    for (const w of withdrawals) {
      const amount = Number(w.amount);
      ev.push({
        id: `wd-${w.id}`,
        timestamp: (w.updatedAt ?? w.createdAt).toISOString(),
        category: 'SAQUE',
        type: `WITHDRAWAL_${w.status}`,
        action: wStatusLabel[w.status] ?? 'Saque',
        status: w.status,
        amount,
        actor: w.startup?.founder ?? null,
        actorRole: 'FUNDADOR',
        startup: w.startup ? { id: w.startup.id, nome: w.startup.nome } : null,
        description: `${wStatusLabel[w.status] ?? 'Saque'} de ${brl(amount)} — ${w.startup?.nome ?? 'startup'}.`,
      });
    }

    // ---- Adesão da startup ao programa de afiliados ----
    for (const p of programs) {
      const startup = p.startup
        ? { id: p.startup.id, nome: p.startup.nome }
        : null;
      ev.push({
        id: `afp-${p.id}-req`,
        timestamp: p.requestedAt.toISOString(),
        category: 'AFILIACAO',
        type: 'AFFILIATE_PROGRAM_REQUESTED',
        action: 'Adesão ao programa solicitada',
        status: 'PENDING',
        amount: null,
        actor: p.startup?.founder ?? null,
        actorRole: 'FUNDADOR',
        startup,
        description: `${p.startup?.nome ?? 'Startup'} solicitou adesão ao programa de afiliados (comissão ${Number(p.affiliateCommissionPct)}%).`,
      });
      if (p.decidedAt && p.status !== 'PENDING') {
        const decider = p.decidedBy ? deciderById.get(p.decidedBy) : null;
        const aprovada = p.status === 'APPROVED';
        ev.push({
          id: `afp-${p.id}-dec`,
          timestamp: p.decidedAt.toISOString(),
          category: 'AFILIACAO',
          type: aprovada
            ? 'AFFILIATE_PROGRAM_APPROVED'
            : 'AFFILIATE_PROGRAM_REJECTED',
          action: aprovada ? 'Adesão aprovada' : 'Adesão rejeitada',
          status: p.status,
          amount: null,
          actor: decider ?? null,
          actorRole: 'ADMIN',
          startup,
          description: `Adesão de ${p.startup?.nome ?? 'startup'} ${aprovada ? 'aprovada' : 'rejeitada'} pela iSelfToken${p.decisionReason ? `: ${p.decisionReason}` : ''}.`,
        });
      }
    }

    // ---- Candidaturas de afiliado + decisões ----
    for (const a of affiliations) {
      const startup = a.program?.startup ?? null;
      ev.push({
        id: `afl-${a.id}-app`,
        timestamp: a.appliedAt.toISOString(),
        category: 'AFILIACAO',
        type: 'AFFILIATION_APPLIED',
        action: 'Candidatura de afiliado',
        status: 'PENDING_FOUNDER',
        amount: null,
        actor: a.user,
        actorRole: 'AFILIADO',
        startup,
        description: `${a.user?.nome ?? 'Usuário'} candidatou-se a afiliado de ${startup?.nome ?? 'startup'} (código ${a.code}).`,
      });
      if (a.founderDecidedAt) {
        const decider = a.founderDecidedBy
          ? deciderById.get(a.founderDecidedBy)
          : null;
        const encaminhada =
          a.status === 'PENDING_ADMIN' || a.status === 'ACTIVE';
        const rejeitada = a.status === 'REJECTED' && !a.adminDecidedAt;
        ev.push({
          id: `afl-${a.id}-fdec`,
          timestamp: a.founderDecidedAt.toISOString(),
          category: 'AFILIACAO',
          type: rejeitada
            ? 'AFFILIATION_FOUNDER_REJECTED'
            : 'AFFILIATION_FOUNDER_APPROVED',
          action: rejeitada
            ? 'Triagem do fundador: rejeitada'
            : 'Triagem do fundador: aprovada',
          status: rejeitada ? 'REJECTED' : 'PENDING_ADMIN',
          amount: null,
          actor: decider ?? null,
          actorRole: 'FUNDADOR',
          startup,
          description: rejeitada
            ? `Fundador rejeitou a candidatura de ${a.user?.nome ?? 'afiliado'}${a.rejectionReason ? `: ${a.rejectionReason}` : ''}.`
            : `Fundador aprovou ${a.user?.nome ?? 'afiliado'} e alocou ${a.tokensAllocated ?? 0} tokens.`,
        });
      }
      if (a.adminDecidedAt) {
        const decider = a.adminDecidedBy
          ? deciderById.get(a.adminDecidedBy)
          : null;
        const ativada = a.status === 'ACTIVE';
        ev.push({
          id: `afl-${a.id}-adec`,
          timestamp: a.adminDecidedAt.toISOString(),
          category: 'AFILIACAO',
          type: ativada
            ? 'AFFILIATION_ADMIN_APPROVED'
            : 'AFFILIATION_ADMIN_REJECTED',
          action: ativada
            ? 'Aval iSelfToken: ativada'
            : 'Aval iSelfToken: rejeitada',
          status: a.status,
          amount: null,
          actor: decider ?? null,
          actorRole: 'ADMIN',
          startup,
          description: ativada
            ? `iSelfToken ativou a afiliação de ${a.user?.nome ?? 'afiliado'} (link de compra gerado).`
            : `iSelfToken rejeitou a afiliação de ${a.user?.nome ?? 'afiliado'}${a.rejectionReason ? `: ${a.rejectionReason}` : ''}.`,
        });
      }
    }

    // ---- Comissões de afiliado ----
    for (const c of commissions) {
      const startup = c.affiliation?.program?.startup ?? null;
      const afiliado = c.affiliation?.user ?? null;
      const amount = Number(c.affiliateAmount);
      ev.push({
        id: `com-${c.id}-a`,
        timestamp: c.createdAt.toISOString(),
        category: 'COMISSAO',
        type: 'COMMISSION_ACCRUED',
        action: 'Comissão apurada',
        status: c.status,
        amount,
        actor: afiliado,
        actorRole: 'AFILIADO',
        startup,
        description: `Comissão de ${brl(amount)} apurada para ${afiliado?.nome ?? 'afiliado'} (${c.attributedBy}) sobre investimento #${c.investmentId}.`,
      });
      if (c.paidAt) {
        ev.push({
          id: `com-${c.id}-p`,
          timestamp: c.paidAt.toISOString(),
          category: 'COMISSAO',
          type: 'COMMISSION_PAID',
          action: 'Comissão paga',
          status: 'PAID',
          amount,
          actor: afiliado,
          actorRole: 'AFILIADO',
          startup,
          description: `Comissão de ${brl(amount)} paga a ${afiliado?.nome ?? 'afiliado'}.`,
        });
      }
    }

    // ---- Solicitações de alteração de dados (fundador → compliance) ----
    for (const d of changeRequests) {
      const startup = d.startup
        ? { id: d.startup.id, nome: d.startup.nome }
        : null;
      ev.push({
        id: `dcr-${d.id}-req`,
        timestamp: d.createdAt.toISOString(),
        category: 'STARTUP',
        type: 'DATA_CHANGE_REQUESTED',
        action: 'Alteração de dados solicitada',
        status: 'PENDING',
        amount: null,
        actor: d.requestedBy,
        actorRole: 'FUNDADOR',
        startup,
        description: `${d.requestedBy?.nome ?? 'Fundador'} solicitou alterar "${d.field}" de ${startup?.nome ?? 'startup'}.`,
      });
      if (d.reviewedAt && d.status !== 'PENDING') {
        const aprovada = d.status === 'APPROVED';
        ev.push({
          id: `dcr-${d.id}-rev`,
          timestamp: d.reviewedAt.toISOString(),
          category: 'STARTUP',
          type: aprovada ? 'DATA_CHANGE_APPROVED' : 'DATA_CHANGE_REJECTED',
          action: aprovada ? 'Alteração aprovada' : 'Alteração rejeitada',
          status: d.status,
          amount: null,
          actor: d.reviewedBy ?? null,
          actorRole: 'ADMIN',
          startup,
          description: `Compliance ${aprovada ? 'aprovou' : 'rejeitou'} a alteração de "${d.field}"${d.reviewNote ? `: ${d.reviewNote}` : ''}.`,
        });
      }
    }

    // ---- AuditLog genérico (ações administrativas: KYC, startup, etc.) ----
    for (const l of auditLogs) {
      const mapped = this.mapAuditToCategory(l.action);
      ev.push({
        id: `aud-${l.id}`,
        timestamp: l.createdAt.toISOString(),
        category: mapped.category,
        type: l.action,
        action: this.humanizeAudit(l.action),
        status: null,
        amount: null,
        actor: l.user ?? null,
        actorRole: l.userId ? 'ADMIN' : 'SISTEMA',
        startup: mapped.startupFromEntity(l.entity, l.entityId),
        description: `${l.user?.nome ?? 'Sistema'} — ${this.humanizeAudit(l.action)} em ${l.entity}#${l.entityId}.`,
      });
    }

    return ev;
  }

  private humanizeAudit(action: string): string {
    return action
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  /** Mapeia action do AuditLog → categoria + contexto do evento. */
  private mapAuditToCategory(action: string): {
    category: EventCategory;
    startupFromEntity: (
      entity: string,
      entityId: string,
    ) => { id: number; nome: string } | null;
  } {
    const startupFromEntity = (entity: string, entityId: string) =>
      entity === 'Startup' ? { id: Number(entityId), nome: '' } : null;

    if (action.startsWith('USER_KYC_')) {
      return { category: 'KYC', startupFromEntity };
    }
    if (action.startsWith('USER_') || action === 'USER_TOGGLED') {
      return { category: 'USUARIO', startupFromEntity };
    }
    if (action.startsWith('SUBSCRIPTION_')) {
      return { category: 'ASSINATURA', startupFromEntity };
    }
    if (action.startsWith('WITHDRAWAL_')) {
      return { category: 'SAQUE', startupFromEntity };
    }
    return { category: 'ADMIN', startupFromEntity };
  }

  // ==========================================
  // Filtros / facets
  // ==========================================

  private applyFilters(
    events: HistoryEvent[],
    f: HistoryFilters,
  ): HistoryEvent[] {
    const from = f.from ? new Date(f.from).getTime() : null;
    const to = f.to ? new Date(f.to).getTime() : null;
    const search = f.search?.trim().toLowerCase();
    const actorName = f.actorName?.trim().toLowerCase();

    // fromTime/toTime: filtra por horário (HH:mm) no timestamp
    const fromMinutes = f.fromTime ? this.parseTimeToMinutes(f.fromTime) : null;
    const toMinutes = f.toTime ? this.parseTimeToMinutes(f.toTime) : null;

    return events.filter((e) => {
      if (f.role && e.actorRole !== f.role) return false;
      if (f.category && e.category !== f.category) return false;
      if (f.type && e.type !== f.type) return false;
      if (f.status && e.status !== f.status) return false;
      if (f.userId && e.actor?.id !== Number(f.userId)) return false;
      if (f.startupId && e.startup?.id !== Number(f.startupId)) return false;
      if (from || to) {
        const t = new Date(e.timestamp).getTime();
        if (from && t < from) return false;
        if (to && t > to) return false;
      }
      // filtro por horário (HH:mm)
      if (fromMinutes != null || toMinutes != null) {
        const d = new Date(e.timestamp);
        const mins = d.getHours() * 60 + d.getMinutes();
        if (fromMinutes != null && mins < fromMinutes) return false;
        if (toMinutes != null && mins > toMinutes) return false;
      }
      if (actorName) {
        const actorText =
          `${e.actor?.nome ?? ''} ${e.actor?.email ?? ''}`.toLowerCase();
        if (!actorText.includes(actorName)) return false;
      }
      if (search) {
        const hay =
          `${e.action} ${e.description} ${e.actor?.nome ?? ''} ${e.actor?.email ?? ''} ${e.startup?.nome ?? ''} ${e.type}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }

  /** Converte "HH:mm" para minutos desde meia-noite. */
  private parseTimeToMinutes(time: string): number | null {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  }

  private buildFacets(events: HistoryEvent[]) {
    const count = (key: (e: HistoryEvent) => string | null) => {
      const m = new Map<string, number>();
      for (const e of events) {
        const k = key(e);
        if (k) m.set(k, (m.get(k) ?? 0) + 1);
      }
      return [...m.entries()]
        .map(([value, total]) => ({ value, total }))
        .sort((a, b) => b.total - a.total);
    };
    return {
      byRole: count((e) => e.actorRole),
      byCategory: count((e) => e.category),
      byStatus: count((e) => e.status),
    };
  }
}
