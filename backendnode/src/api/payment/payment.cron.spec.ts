import { Test, TestingModule } from '@nestjs/testing';
import { PaymentCronService } from './payment.cron';
import { PrismaService } from 'src/prisma/prisma.service';
import { FeatureFlagsService } from 'src/common/feature-flags/feature-flags.service';
import { PaymentPublisher } from 'src/messaging/payment.publisher';
import { AuditService } from 'src/common/audit/audit.service';
import { EfiPixAdapter } from './efi/adapters/efi-pix.adapter';
import { PaymentService } from './payment.service';

/**
 * Cobre a distinção de status na expiração (fluxo_startup §1 / SPEC §16.2):
 *  - TOKEN_RESERVATION → EXPIRED + rascunho PRESERVADO + sem efeitos de cancel.
 *  - Demais purposes    → CANCELED + rascunho removido + efeitos de cancel.
 */
describe('PaymentCronService.expirePendingPayments (EXPIRED vs CANCELED)', () => {
  let service: PaymentCronService;
  let prisma: any;
  let paymentService: any;
  let paymentPublisher: any;
  let auditLog: any;

  function build(candidates: any[]) {
    prisma = {
      payment: {
        findMany: jest.fn().mockResolvedValue(candidates),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      startupDraft: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    paymentService = {
      emitPaymentCancelled: jest.fn(),
      processPaymentCancelledEffects: jest.fn().mockResolvedValue(undefined),
      processWebhookPaymentReceived: jest.fn(),
    };
    paymentPublisher = {
      publishPaymentCancelled: jest.fn().mockResolvedValue(true),
    };
    auditLog = { log: jest.fn().mockResolvedValue(undefined) };
    return { prisma, paymentService, paymentPublisher, auditLog };
  }

  async function make() {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentCronService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeatureFlagsService, useValue: { efiEnabled: false } },
        { provide: PaymentService, useValue: paymentService },
        { provide: EfiPixAdapter, useValue: { getPix: jest.fn() } },
        { provide: AuditService, useValue: auditLog },
        { provide: PaymentPublisher, useValue: paymentPublisher },
      ],
    }).compile();
    service = moduleRef.get(PaymentCronService);
  }

  const base = {
    id: 1,
    userId: 5,
    status: 'PENDING',
    amount: 1000,
    txid: null,
    subscriptionId: null,
    investmentId: null,
    campaignId: null,
    endToEndId: null,
    paidAt: null,
  };

  it('TOKEN_RESERVATION expira como EXPIRED, preserva rascunho, sem efeitos de cancel', async () => {
    build([{ ...base, purpose: 'TOKEN_RESERVATION' }]);
    await make();

    const result = await service.expirePendingPayments();

    expect(result.expired).toBe(1);
    // Transição para EXPIRED
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'EXPIRED' }),
      }),
    );
    // Rascunho PRESERVADO (não deleta)
    expect(prisma.startupDraft.deleteMany).not.toHaveBeenCalled();
    // Sem efeitos de cancelamento
    expect(paymentService.emitPaymentCancelled).not.toHaveBeenCalled();
    expect(paymentPublisher.publishPaymentCancelled).not.toHaveBeenCalled();
    // Audit com PAYMENT_EXPIRED
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_EXPIRED',
        newValue: { status: 'EXPIRED' },
      }),
    );
  });

  it('SUBSCRIPTION expira como CANCELED, remove rascunho e dispara efeitos', async () => {
    build([{ ...base, id: 2, purpose: 'SUBSCRIPTION', subscriptionId: 9 }]);
    await make();

    const result = await service.expirePendingPayments();

    expect(result.expired).toBe(1);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CANCELED' }),
      }),
    );
    expect(prisma.startupDraft.deleteMany).toHaveBeenCalled();
    expect(paymentService.emitPaymentCancelled).toHaveBeenCalled();
    expect(paymentPublisher.publishPaymentCancelled).toHaveBeenCalled();
    expect(auditLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PAYMENT_CANCELED',
        newValue: { status: 'CANCELED' },
      }),
    );
  });

  it('fallback inline de efeitos quando o publisher falha (CANCELED)', async () => {
    build([{ ...base, id: 3, purpose: 'INVESTMENT', investmentId: 7 }]);
    paymentPublisher.publishPaymentCancelled.mockResolvedValueOnce(false);
    await make();

    await service.expirePendingPayments();

    expect(paymentService.processPaymentCancelledEffects).toHaveBeenCalledWith(
      3,
    );
  });

  it('não faz nada quando a transição perde a corrida (count=0)', async () => {
    build([{ ...base, purpose: 'TOKEN_RESERVATION' }]);
    prisma.payment.updateMany.mockResolvedValueOnce({ count: 0 });
    await make();

    const result = await service.expirePendingPayments();

    expect(result.expired).toBe(0);
    expect(auditLog.log).not.toHaveBeenCalled();
  });
});
