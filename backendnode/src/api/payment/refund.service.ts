import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { EfiPixAdapter } from './efi/adapters/efi-pix.adapter';
import { PaymentEvents, PaymentRefundedEvent } from './events/payment-events';
import { RefundDto } from './dto/refund.dto';

/**
 * Resultado de uma operação de refund.
 */
export interface RefundResult {
  success: boolean;
  refundId?: string;
  error?: string;
}

/**
 * Serviço responsável por processar estornos (refunds) de pagamentos.
 *
 * Delega ao adapter EFI correto (PIX ou cobrança) com base nos dados
 * do payment, atualiza o status no banco e registra o audit log.
 *
 * @example
 * const result = await refundService.processRefund(paymentId, dto, userId);
 * if (!result.success) {
 *   logger.error(`Refund falhou: ${result.error}`);
 * }
 */
@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly pixAdapter: EfiPixAdapter,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * Processa o estorno de um pagamento via ID.
   *
   * Validações:
   * - Payment deve existir e estar com status PAID
   * - Janela de 90 dias da EFI (hoje - paidAt <= 90 dias)
   * - Amount do estorno não pode exceder o valor original (suporta parcial)
   *
   * Estratégia de roteamento:
   * - Se payment.txid existe → devolução PIX via EFI
   * - Cobranças de cartão EFI devem ser estornadas no painel EFI
   *
   * @param paymentId - ID do pagamento a estornar
   * @param dto - DTO com amount e reason
   * @param userId - ID do usuário que executa o refund (audit log)
   * @throws UnprocessableEntityException se fora da janela de 90 dias
   * @throws BadRequestException se payment não está PAID
   */
  async processRefund(
    paymentId: number,
    dto: RefundDto,
    userId: number,
  ): Promise<RefundResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new BadRequestException({
        code: 'payment_not_found',
        message: `Payment ${paymentId} não encontrado`,
      });
    }

    if (payment.status !== 'PAID') {
      throw new BadRequestException({
        code: 'payment_not_paid',
        message: `Payment ${paymentId} não está PAID (status: ${payment.status})`,
      });
    }

    if (!payment.paidAt) {
      throw new BadRequestException({
        code: 'payment_no_paid_at',
        message: `Payment ${paymentId} não tem data de pagamento`,
      });
    }

    // Valida janela EFI de 90 dias
    const paidAtDate = new Date(payment.paidAt);
    const now = new Date();
    const diffMs = now.getTime() - paidAtDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > 90) {
      throw new UnprocessableEntityException({
        code: 'reembolso_fora_prazo',
        message: `Janela de estorno EFI expirada (90 dias). Payment foi pago em ${paidAtDate.toISOString()}.`,
      });
    }

    const totalAmount = Number(payment.amount);
    const refundAmount = dto.amount;

    if (refundAmount > totalAmount) {
      throw new BadRequestException({
        code: 'refund_amount_exceeds_total',
        message: `Valor do estorno (${refundAmount}) excede o total do pagamento (${totalAmount})`,
      });
    }

    const isPartial = refundAmount < totalAmount;

    try {
      let refundId: string;

      if (payment.txid && !payment.efiChargeId) {
        const result = await this.pixAdapter.refundPix({
          e2eId: payment.txid,
          amount: refundAmount.toFixed(2),
        });
        refundId = result.id;
        this.logger.log(
          `Refund PIX EFI OK payment=${paymentId} refundId=${refundId} partial=${isPartial}`,
        );
      } else if (payment.efiChargeId) {
        return {
          success: false,
          error: `Payment ${paymentId} possui cobrança de cartão EFI; o estorno deve ser processado no painel EFI`,
        };
      } else {
        return {
          success: false,
          error: `Payment ${paymentId} sem txid e purpose=${payment.purpose} — refund não suportado`,
        };
      }

      // Atualiza payment: se parcial mantém PAID, se total marca REFUNDED
      const newStatus = isPartial ? 'PAID' : 'REFUNDED';
      const updated = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
          refundedAt: isPartial
            ? new Date()
            : (payment.refundedAt ?? new Date()),
          refundReason: dto.reason,
          refundTxid: refundId,
        },
      });

      // Fase v3: emite payment.refunded para listeners (só em estorno total)
      if (!isPartial) {
        this.events.emit(PaymentEvents.REFUNDED, {
          paymentId: updated.id,
          payment: {
            id: updated.id,
            userId: updated.userId,
            purpose: updated.purpose,
            status: updated.status,
            amount: updated.amount.toString(),
            subscriptionId: updated.subscriptionId,
            investmentId: updated.investmentId,
            campaignId: updated.campaignId,
            endToEndId: updated.endToEndId,
            txid: updated.txid,
            paidAt: updated.paidAt,
          },
          reason: `Refund processado (userId=${userId}): ${dto.reason}`,
        } satisfies PaymentRefundedEvent);
      }

      // Audit log com retenção 5 anos (LGPD)
      const retentionUntil = new Date();
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_REFUNDED',
          entity: 'Payment',
          entityId: String(paymentId),
          oldValue: { status: 'PAID' },
          newValue: {
            refundId,
            amount: refundAmount,
            totalAmount,
            isPartial,
            reason: dto.reason,
            retentionUntil: retentionUntil.toISOString(),
          },
        },
      });

      return { success: true, refundId };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      this.logger.error(`Refund falhou payment=${paymentId}: ${msg}`);

      const retentionUntil = new Date();
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 5);

      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_REFUND_FAILED',
          entity: 'Payment',
          entityId: String(paymentId),
          newValue: {
            error: msg,
            amount: refundAmount,
            retentionUntil: retentionUntil.toISOString(),
          },
        },
      });

      return { success: false, error: msg };
    }
  }

  /**
   * Processa o refund de um pagamento individual (legacy — forneça o objeto payment).
   *
   * Estratégia de roteamento:
   * - Se payment.txid existe → PIX adapter (devolução PIX)
   * - Se purpose=INVESTMENT sem txid → Checkout adapter (reembolso cartão)
   *
   * @param payment - Registro do pagamento a estornar
   * @param userId - ID do usuário que executa o refund (para audit log)
   * @returns Resultado com refundId em caso de sucesso
   */
  async refundPayment(
    payment: { id: number; txid?: string | null; purpose: string; amount: any },
    userId: number,
  ): Promise<RefundResult> {
    const amount = Number(payment.amount);

    try {
      let refundId: string;

      if (payment.txid) {
        const result = await this.pixAdapter.refundPix({
          e2eId: payment.txid,
          amount: amount.toFixed(2),
        });
        refundId = result.id;
        this.logger.log(
          `Refund PIX EFI OK payment=${payment.id} refundId=${refundId}`,
        );
      } else {
        return {
          success: false,
          error: `Payment ${payment.id} sem txid e purpose=${payment.purpose} — refund nao suportado`,
        };
      }

      // Atualiza status do payment para REFUNDED
      const updated = await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });

      // Fase v3: emite payment.refunded para listeners
      this.events.emit(PaymentEvents.REFUNDED, {
        paymentId: updated.id,
        payment: {
          id: updated.id,
          userId: updated.userId,
          purpose: updated.purpose,
          status: updated.status,
          amount: updated.amount.toString(),
          subscriptionId: updated.subscriptionId,
          investmentId: updated.investmentId,
          campaignId: updated.campaignId,
          endToEndId: updated.endToEndId,
          txid: updated.txid,
          paidAt: updated.paidAt,
        },
        reason: `Refund processado (userId=${userId})`,
      } satisfies PaymentRefundedEvent);

      // Registra audit log
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_REFUND',
          entity: 'Payment',
          entityId: String(payment.id),
          newValue: { refundId, amount, reason: 'CANCEL_ROUND' },
        },
      });

      return { success: true, refundId };
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      this.logger.error(`Refund falhou payment=${payment.id}: ${msg}`);

      // Audit log da falha
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'PAYMENT_REFUND_FAILED',
          entity: 'Payment',
          entityId: String(payment.id),
          newValue: { error: msg, amount },
        },
      });

      return { success: false, error: msg };
    }
  }
}
