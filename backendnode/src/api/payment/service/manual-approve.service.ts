import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Payment } from '@prisma/client';
import { AuditService } from 'src/common/audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ManualApproveDto } from '../dto/manual-approve.dto';
import { PaymentService } from '../payment.service';

/**
 * Serviço de aprovação manual de pagamentos off-platform.
 *
 * Permite que ADMIN/FINANCEIRO marque um Payment como PAID manualmente,
 * para casos onde o pagamento ocorreu fora do plataforma (ex: transferência
 * direta, PIX via outro canal).
 *
 * @example
 * const payment = await manualApproveService.manualApprove(id, dto, userId);
 */
@Injectable()
export class ManualApproveService {
  private readonly logger = new Logger(ManualApproveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * @description ADMIN/FINANCEIRO marca Payment como PAID manualmente (pagamento off-platform).
   * @param id Payment ID
   * @param dto { justification: string >= 20 chars, comprovanteKey?: string }
   * @param userId User marcando
   * @throws BadRequestException se justification < 20 caracteres
   * @throws NotFoundException se payment não existe
   * @throws ConflictException se payment já está PAID ou CANCELED
   */
  async manualApprove(
    id: number,
    dto: ManualApproveDto,
    userId: number,
  ): Promise<Payment> {
    if (dto.justification.length < 20) {
      throw new BadRequestException({
        code: 'justification_too_short',
        message: 'justification deve ter no mínimo 20 caracteres',
      });
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      throw new NotFoundException({
        code: 'payment_not_found',
        message: `Payment ${id} não encontrado`,
      });
    }

    if (payment.status === 'PAID') {
      throw new ConflictException({
        code: 'already_paid',
        message: `Payment ${id} já está PAID`,
      });
    }

    if (payment.status === 'CANCELED') {
      throw new ConflictException({
        code: 'canceled',
        message: `Payment ${id} está CANCELED e não pode ser aprovado`,
      });
    }

    const updated = await this.prisma.payment.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        manualApprovedById: userId,
        manualApprovedAt: new Date(),
        manualJustification: dto.justification,
        manualComprovanteKey: dto.comprovanteKey,
      },
    });

    await this.auditService.log({
      userId,
      action: 'PAYMENT_MANUAL_APPROVED',
      entity: 'Payment',
      entityId: id,
      oldValue: { status: payment.status },
      newValue: {
        status: 'PAID',
        justification: dto.justification,
        comprovanteKey: dto.comprovanteKey ?? null,
      },
    });

    // Notificação no shape correto (aninhado) — mesma fonte usada pelo webhook.
    this.paymentService.emitPaymentConfirmed({
      id: updated.id,
      userId: updated.userId,
      purpose: updated.purpose,
      status: updated.status,
      amount: updated.amount,
      subscriptionId: updated.subscriptionId,
      investmentId: updated.investmentId,
      campaignId: updated.campaignId,
      endToEndId: updated.endToEndId,
      txid: updated.txid,
      paidAt: updated.paidAt,
    });

    // Aplica os efeitos de domínio (ativa plano/investimento/reserva) de forma
    // idempotente e transacional, além de invalidar a sessão do usuário.
    // Antes, a aprovação manual só emitia um evento (com shape errado) e o
    // plano nunca era ativado.
    await this.paymentService.processPaymentEffects(id);

    this.logger.log(
      `ManualApprove OK payment=${id} by userId=${userId} reason=${dto.justification.slice(0, 50)}`,
    );

    return updated;
  }
}
