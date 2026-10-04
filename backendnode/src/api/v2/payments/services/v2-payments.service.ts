/**
 * @description Service do Hub de Pagamentos v2 (PRD).
 *
 * Filosofia:
 * - Orquestrador fino. NAO contem regra de dominio (Subscription/Investment/etc).
 * - Delegates para o PaymentService + FundTransferService ja existentes
 *   durante o periodo de transicao (Fase A deste PRD).
 * - Num sprint futuro, listeners no EventEmitter substituirao as chamadas
 *   inline. Por enquanto, o caminho fica via service injection.
 */
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { FundTransferService } from 'src/api/payment/fund-transfer.service';
import { PaymentService } from 'src/api/payment/payment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CheckoutReferenceType,
  CreateCheckoutDto,
} from '../dto/create-checkout.dto';
import { CreatePayoutDto } from '../dto/create-payout.dto';
import { ListTransactionsDto } from '../dto/list-transactions.dto';

@Injectable()
export class V2PaymentsService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly fundTransferService: FundTransferService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Cria um Payment e inicia o checkout unificado C6 (PIX + Cartao na
   * mesma tela). Retorna a `redirectUrl` para o frontend redirecionar.
   *
   * Fase atual: delega para `paymentService.generateCardCheckout` que
   * cria checkoutPIX+cartao no C6 (PIX separado). FUTURO (Fase B):
   * trocar para chamada `checkoutAdapter.createUnified()` quando o C6
   * confirmar o endpoint único.
   */
  async createCheckout(dto: CreateCheckoutDto, userId: number): Promise<any> {
    // Map referenceType (legado) para o enum PaymentPurpose
    const purpose = this.mapReferenceTypeToPurpose(dto.referenceType);

    // Resolve referencia para FK esperada pelo service atual.
    const subscriptionId =
      dto.referenceType === CheckoutReferenceType.SUBSCRIPTION
        ? Number(dto.referenceId)
        : undefined;
    const investmentId =
      dto.referenceType === CheckoutReferenceType.INVESTMENT
        ? Number(dto.referenceId)
        : undefined;
    const campaignId =
      dto.referenceType === CheckoutReferenceType.TOKEN_RESERVATION
        ? Number(dto.referenceId)
        : undefined;

    // Cria Payment em PENDING.
    const paymentRes = await this.paymentService.create(
      {
        amount: dto.amount,
        method: 'CREDIT_CARD', // default; webhook pode sobrescrever quando vier o method real
        purpose,
        subscriptionId,
        investmentId,
        campaignId,
      } as any,
      userId,
    );

    if (!paymentRes?.data?.id) {
      throw new Error('Falha ao criar Payment');
    }

    // A EFI não tem checkout hospedado de cartão: o pagamento por cartão exige
    // o payment_token gerado no navegador (lib payment-token-efi) e é
    // confirmado via POST /payment/:id/card. Aqui apenas criamos o Payment
    // PENDING e devolvemos o paymentId para o frontend seguir o fluxo.
    return {
      paymentId: paymentRes.data.id,
      amount: dto.amount,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId,
      metadata: dto.metadata,
    };
  }

  /**
   * Read-only: consulta o status atual do checkout no banco local.
   * Opcionalmente, sincroniza com o C6 se estiver PENDING a muito tempo.
   */
  async getCheckoutStatus(paymentId: number, userId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        method: true,
        txid: true,
        amount: true,
        paidAt: true,
        userId: true,
        createdAt: true,
        endToEndId: true,
      },
    });
    if (!payment) {
      throw new NotFoundException('Pagamento nao encontrado');
    }
    if (payment.userId !== userId) {
      // Apenas o dono ou ADMIN (gate do controller) pode ver.
      throw new UnauthorizedException('Acesso negado');
    }
    return {
      paymentId: payment.id,
      status: payment.status,
      method: payment.method,
      checkoutId: payment.txid, // txid guarda o checkoutId do C6
      amount: Number(payment.amount),
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      endToEndId: payment.endToEndId,
    };
  }

  /**
   * Lista pagamentos com filtros. Read-only. RBAC FINANCEIRO/ADMIN
   * e validado no controller.
   */
  async listTransactions(filters: ListTransactionsDto) {
    const limit = filters.limit ?? 25;
    const offset = filters.offset ?? 0;
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.referenceType) {
      // Mapeia referenceType enum para PaymentPurpose enum
      where.purpose = this.mapReferenceTypeToPurpose(filters.referenceType);
    }
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          method: true,
          purpose: true,
          txid: true,
          endToEndId: true,
          amount: true,
          paidAt: true,
          createdAt: true,
          userId: true,
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, total, limit, offset };
  }

  /**
   * Inicia um payout via FundTransferService existente.
   *
   * Idempotência: o FundTransferService.initiateTransfer gera um
   * endToEndId local (FORMATO `MANUAL-<uuid>`) e o reutiliza em
   * retentativas. O C6 ignora chamadas com mesmo endToEndId em
   * janela de minutos.
   */
  async createPayout(
    dto: CreatePayoutDto,
    actor: { userId: number; role: string },
  ) {
    // B12 FundTransfer ainda opera no schema antigo (Int startupId).
    // Wrapper converte targetAccountId (UUID) em startupId via metadata
    // se necessario. Para a Fase A, aceitamos q o caller ja tenha
    // resolvido para startupId numerico.
    //
    // Contrato atual: targetAccountId === startupId em string.
    const startupIdNum = Number(dto.targetAccountId);

    const result = await this.fundTransferService.initiateTransfer(
      startupIdNum,
      actor.userId,
      actor.role,
    );
    return result;
  }

  /**
   * Helper local: mapeia CheckoutReferenceType (novo) para PaymentPurpose
   * (legacy). Quando rodar Fase B (polimorfismo), este helper some.
   */
  private mapReferenceTypeToPurpose(ref: CheckoutReferenceType): any {
    const map: Record<CheckoutReferenceType, string> = {
      [CheckoutReferenceType.SUBSCRIPTION]: 'SUBSCRIPTION',
      [CheckoutReferenceType.INVESTMENT]: 'INVESTMENT',
      [CheckoutReferenceType.TOKEN_RESERVATION]: 'TOKEN_RESERVATION',
      [CheckoutReferenceType.EARLY_ACCESS]: 'EARLY_ACCESS',
      [CheckoutReferenceType.P2P_BUY]: 'P2P_BUY',
    };
    return map[ref];
  }
}
