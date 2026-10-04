import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { EfiPixAdapter } from '../payment/efi/adapters/efi-pix.adapter';

interface ReconciliationEntry {
  localReference: string;
  reference: string;
  amount: number;
  entryDate: string;
  title: string;
  description: string;
  transactionType: string;
  operationType: 'INCOMING';
}

/**
 * Fechamento de caixa — compara Payments com status PAID no período com as
 * entradas PIX reportadas pela EFI.
 *
 * Estratégia de match (heurística pragmática):
 * 1. Para cada Payment PAID, procura uma entrada INCOMING onde:
 *    - `entry.localReference === payment.txid`, OU
 *    - `entry.reference === payment.txid`, OU
 *    - `entry.description` contém o `payment.txid` (fallback solto).
 *    O primeiro match consome a entrada (não pode ser reusada).
 * 2. Sobra de Payment sem entry → `missingInBank` (recebemos PIX/cartão
 *    no nosso DB mas não vimos no extrato — pode ser timing ou divergência
 *    real).
 * 3. Sobra de entry sem Payment → `missingInDb` (caiu dinheiro na conta
 *    sem Payment correspondente — outra receita, transferência avulsa, ou
 *    fraude).
 *
 * Resultado: totals em centavos arredondados pra 2 casas. Não tenta
 * resolver discrepâncias — só reporta.
 */
@Injectable()
export class FinanceiroReconciliationService {
  private readonly logger = new Logger(FinanceiroReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly efiPixAdapter: EfiPixAdapter,
  ) {}

  async reconcile(input: { from: Date; to: Date }) {
    if (
      Number.isNaN(input.from.getTime()) ||
      Number.isNaN(input.to.getTime())
    ) {
      throw new HttpException(
        'Datas inválidas (esperado ISO YYYY-MM-DD).',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (input.to.getTime() < input.from.getTime()) {
      throw new HttpException(
        'Data final anterior à inicial.',
        HttpStatus.BAD_REQUEST,
      );
    }

    let upstreamError = false;
    const [payments, pixEntries] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          status: 'PAID',
          paidAt: { gte: input.from, lte: input.to },
        },
        select: {
          id: true,
          txid: true,
          amount: true,
          paidAt: true,
          purpose: true,
          method: true,
          user: { select: { id: true, nome: true, email: true } },
        },
        orderBy: { paidAt: 'asc' },
      }),
      // P2.17 — a EFI pode estar fora / retornar erro de upstream.
      // Envolvemos em try/catch para nao quebrar a conciliacao inteira:
      // se falhar, retornamos lista vazia e marcamos no payload.
      this.efiPixAdapter
        .listReceivedPix({
          startDate: input.from.toISOString(),
          endDate: input.to.toISOString(),
        })
        .then((result) =>
          result.pix.map((pix) => ({
            localReference: pix.txid,
            reference: pix.txid,
            amount: Number(pix.valor),
            entryDate: pix.horario,
            title: 'PIX recebido',
            description: pix.txid,
            transactionType: 'PIX',
            operationType: 'INCOMING' as const,
          })),
        )
        .catch((err) => {
          this.logger.error(
            `Falha ao consultar EFI para conciliacao (${input.from.toISOString().slice(0, 10)}..${input.to.toISOString().slice(0, 10)}): ${err?.message ?? err}`,
          );
          upstreamError = true;
          return [] as ReconciliationEntry[];
        }),
    ]);

    const entries = pixEntries;

    const incomingEntries = entries.filter(
      (e) => e.operationType === 'INCOMING',
    );
    const usedEntryIdx = new Set<number>();
    const missingInBank: typeof payments = [];
    const matched: Array<{
      payment: (typeof payments)[number];
      entry: ReconciliationEntry;
    }> = [];

    for (const payment of payments) {
      const idx = this.findMatchIndex(
        payment.txid,
        incomingEntries,
        usedEntryIdx,
      );
      if (idx === -1) {
        missingInBank.push(payment);
      } else {
        usedEntryIdx.add(idx);
        matched.push({ payment, entry: incomingEntries[idx] });
      }
    }

    const missingInDb = incomingEntries.filter(
      (_, idx) => !usedEntryIdx.has(idx),
    );

    const totalExpected = payments.reduce(
      (acc, p) => acc + Number(p.amount),
      0,
    );
    const totalReceived = incomingEntries.reduce((acc, e) => acc + e.amount, 0);

    this.logger.log(
      `Reconcile ${input.from.toISOString().slice(0, 10)}..${input.to.toISOString().slice(0, 10)}: ` +
        `payments=${payments.length} entries=${incomingEntries.length} ` +
        `matched=${matched.length} missingInBank=${missingInBank.length} missingInDb=${missingInDb.length}`,
    );

    return ResponseDto.success('Reconciliação executada', 200, {
      from: input.from.toISOString().slice(0, 10),
      to: input.to.toISOString().slice(0, 10),
      totalExpected: round2(totalExpected),
      totalReceived: round2(totalReceived),
      difference: round2(totalReceived - totalExpected),
      // P2.17 — sinaliza se a EFI falhou no payload (UI pode exibir banner)
      upstreamError,
      counts: {
        payments: payments.length,
        entries: incomingEntries.length,
        matched: matched.length,
        missingInBank: missingInBank.length,
        missingInDb: missingInDb.length,
      },
      missingInBank: missingInBank.map((p) => ({
        id: p.id,
        txid: p.txid,
        amount: Number(p.amount),
        paidAt: p.paidAt,
        purpose: p.purpose,
        method: p.method,
        user: p.user,
      })),
      missingInDb: missingInDb.map((e) => ({
        localReference: e.localReference,
        reference: e.reference,
        amount: e.amount,
        entryDate: e.entryDate,
        title: e.title,
        description: e.description,
        transactionType: e.transactionType,
      })),
    });
  }

  /**
   * Encontra a primeira entry no `incomingEntries` que bate com o txid,
   * pulando índices já consumidos. Retorna -1 se nada bate.
   */
  private findMatchIndex(
    txid: string | null,
    entries: ReconciliationEntry[],
    used: Set<number>,
  ): number {
    if (!txid) return -1;
    for (let i = 0; i < entries.length; i++) {
      if (used.has(i)) continue;
      const e = entries[i];
      if (e.localReference === txid || e.reference === txid) return i;
      if (e.description && e.description.includes(txid)) return i;
    }
    return -1;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
