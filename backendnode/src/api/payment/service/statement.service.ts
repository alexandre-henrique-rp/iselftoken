import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatementQueryDto } from '../dto/statement-query.dto';

/**
 * Item individual de transação no extrato.
 */
export interface StatementTransaction {
  id: number;
  purpose: string;
  method: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
  paidAt: string | null;
}

/**
 * Resumo agregado do extrato.
 */
export interface StatementSummary {
  totalConfirmed: number;
  totalRefunded: number;
  count: number;
}

/**
 * Extrato em formato JSON.
 */
export interface StatementJson {
  transactions: StatementTransaction[];
  summary: StatementSummary;
}

/**
 * Serviço de extrato bancário.
 *
 * Lista transações do usuário com filtros de período e formata
 * como JSON ou CNAB 240 (text/plain).
 */
@Injectable()
export class StatementService {
  private readonly logger = new Logger(StatementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna o extrato de transações do usuário.
   *
   * @param userId  - ID do usuário logado
   * @param query   - Filtros: startDate, endDate, format
   * @returns JSON object ou string CNAB 240
   */
  async getStatement(
    userId: number,
    query: StatementQueryDto,
  ): Promise<StatementJson | string> {
    const { startDate, endDate, format = 'JSON' } = query;

    const where: any = {
      userId,
      status: { in: ['PAID', 'REFUNDED'] },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const transactions: StatementTransaction[] = payments.map((p) => ({
      id: p.id,
      purpose: p.purpose,
      method: p.method,
      amount: Number(p.amount),
      status: p.status,
      description: this.buildDescription(p),
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    }));

    if (format === 'CNAB240') {
      return this.buildCnab240(userId, transactions, query);
    }

    const summary: StatementSummary = {
      totalConfirmed: transactions
        .filter((t) => t.status === 'PAID')
        .reduce((sum, t) => sum + t.amount, 0),
      totalRefunded: transactions
        .filter((t) => t.status === 'REFUNDED')
        .reduce((sum, t) => sum + t.amount, 0),
      count: transactions.length,
    };

    return { transactions, summary };
  }

  /**
   * Gera extrato no formato CNAB 240 (texto).
   *
   * Layout:
   * - Header: dados do extrato + período
   * - Transaction lines: uma linha por transação
   * - Trailer: totais e contagem
   */
  private buildCnab240(
    userId: number,
    transactions: StatementTransaction[],
    query: StatementQueryDto,
  ): string {
    const lines: string[] = [];

    // Header
    lines.push(
      `IselfToken Statement - User ${userId} - Period ${query.startDate ?? 'início'} to ${query.endDate ?? 'hoje'}`,
    );
    lines.push('─'.repeat(70));

    // Transactions
    if (transactions.length === 0) {
      lines.push('Nenhuma transação no período.');
    } else {
      for (const t of transactions) {
        lines.push(
          `${t.createdAt.split('T')[0]} | ${(t as any).type ?? t.method} | ${t.amount.toFixed(2)} | ${t.status} | ${t.description}`,
        );
      }
    }

    lines.push('─'.repeat(70));

    // Trailer
    const totalConfirmed = transactions
      .filter((t) => t.status === 'PAID')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalRefunded = transactions
      .filter((t) => t.status === 'REFUNDED')
      .reduce((sum, t) => sum + t.amount, 0);
    const netAmount = totalConfirmed - totalRefunded;

    lines.push(
      `Total: ${transactions.length} transactions - Confirmed: ${totalConfirmed.toFixed(2)} - Refunded: ${totalRefunded.toFixed(2)} - Net: ${netAmount.toFixed(2)}`,
    );

    return lines.join('\n');
  }

  /**
   * Monta descrição legível para uma transação.
   */
  private buildDescription(payment: {
    purpose: string;
    method: string;
    id: number;
  }): string {
    const purposeLabels: Record<string, string> = {
      SUBSCRIPTION: 'Assinatura de plano',
      INVESTMENT: 'Investimento',
      TOKEN_RESERVATION: 'Reserva de tokens',
      EARLY_ACCESS: 'Acesso antecipado',
      P2P_BUY: 'Compra P2P',
    };
    const purpose = purposeLabels[payment.purpose] ?? payment.purpose;
    return `${purpose} (#${payment.id})`;
  }
}
