import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export type NextActionType =
  | 'CONFIGURAR'
  | 'CAMPANHA_EM_ANDAMENTO'
  | 'NOVA_RODADA'
  | 'PAGAR_RESERVA'
  | 'REVISAR_DOCUMENTOS'
  | 'CONFIGURAR_TIME';

export interface NextAction {
  tipo: NextActionType;
  label: string;
  rota: string;
}

type CampaignStatus = 'DRAFT' | 'OPEN' | 'FUNDED' | 'PAID_OUT' | 'CLOSED';

@Injectable()
export class NextActionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve a proxima acao para uma startup enriquecida.
   * Tabela de decisao (short-circuit sequencial):
   * 1. PENDING_RESERVATION_PAYMENT → PAGAR_RESERVA
   * 2. REJECTED → REVISAR_DOCUMENTOS
   * 3. DRAFT|RASCUNHO → CONFIGURAR
   * 4. APPROVED + campaign OPEN → CAMPANHA_EM_ANDAMENTO
   * 5. APPROVED + campaign FUNDED|PAID_OUT → NOVA_RODADA
   * 6. APPROVED + campaign FAILED → CONFIGURAR_TIME
   * 7. APPROVED sem campanha → CONFIGURAR
   * 8. Default → null
   */
  async getNextAction(
    startup: { id: number; status: string },
    campaigns: Array<{ status: string }>,
    /**
     * Reserva PENDING pré-computada em lote (findAll): startupId → paymentId.
     * Quando fornecido, evita a query `payment.findFirst` por startup (N+1).
     * Quando ausente, cai no caminho legado que consulta o Prisma.
     */
    pendingReservationByStartup?: Map<number, number>,
  ): Promise<NextAction | null> {
    // 1. Pagamento pendente tem prioridade
    if (startup.status === 'PENDING_RESERVATION_PAYMENT') {
      let reservationId: number | null | undefined;
      if (pendingReservationByStartup) {
        reservationId = pendingReservationByStartup.get(startup.id) ?? null;
      } else {
        const reservation = await this.prisma.payment.findFirst({
          where: { campaign: { startupId: startup.id }, status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        reservationId = reservation?.id ?? null;
      }
      if (!reservationId) return null;
      return {
        tipo: 'PAGAR_RESERVA',
        label: 'Pagar reserva',
        rota: `/checkout/payment/${reservationId}`,
      };
    }

    // 2. Reprovada → compliance
    if (startup.status === 'REJECTED') {
      return {
        tipo: 'REVISAR_DOCUMENTOS',
        label: 'Revisar documentos',
        rota: '/founder/compliance/status',
      };
    }

    // 3. Rascunho / Pendente / Pre-aprovacao → configurar
    if (
      startup.status === 'DRAFT' ||
      startup.status === 'RASCUNHO' ||
      startup.status === 'PENDING'
    ) {
      return {
        tipo: 'CONFIGURAR',
        label: 'Configurar',
        rota: `/startup/${startup.id}/edit`,
      };
    }

    // 4-7. Aprovada → depende da campanha
    if (startup.status === 'APPROVED') {
      const mostRelevant = this.getMostRelevantCampaign(campaigns);

      if (mostRelevant?.status === 'OPEN') {
        return {
          tipo: 'CAMPANHA_EM_ANDAMENTO',
          label: 'Campanha em andamento',
          rota: `/startup/${startup.id}/dashboard`,
        };
      }

      if (
        mostRelevant?.status === 'FUNDED' ||
        mostRelevant?.status === 'PAID_OUT'
      ) {
        return {
          tipo: 'NOVA_RODADA',
          label: 'Nova rodada',
          rota: `/startup/${startup.id}/campaigns/new`,
        };
      }

      if (mostRelevant?.status === 'CLOSED') {
        return {
          tipo: 'CONFIGURAR_TIME',
          label: 'Reconfigurar time',
          rota: `/startup/${startup.id}/team`,
        };
      }

      // Aprovada sem campanha
      return {
        tipo: 'CONFIGURAR',
        label: 'Configurar',
        rota: `/startup/${startup.id}/edit`,
      };
    }

    // 8. Estado terminal
    return null;
  }

  private getMostRelevantCampaign(
    campaigns: Array<{ status: string }>,
  ): { status: string } | undefined {
    const order: CampaignStatus[] = [
      'OPEN',
      'FUNDED',
      'PAID_OUT',
      'CLOSED',
      'DRAFT',
    ];
    for (const status of order) {
      const c = campaigns.find((x) => x.status === status);
      if (c) return c;
    }
    return undefined;
  }
}
