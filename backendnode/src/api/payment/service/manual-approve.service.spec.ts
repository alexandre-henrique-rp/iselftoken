import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from 'src/common/audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ManualApproveDto } from '../dto/manual-approve.dto';
import { PaymentService } from '../payment.service';
import { ManualApproveService } from './manual-approve.service';

describe('ManualApproveService', () => {
  let service: ManualApproveService;
  let prisma: any;
  let auditService: any;
  let events: any;
  let paymentService: any;

  const fakePayment = (overrides: Record<string, any> = {}) => ({
    id: 1,
    userId: 10,
    purpose: 'INVESTMENT',
    status: 'PENDING',
    amount: { toString: () => '5000' },
    txid: null,
    paidAt: null,
    manualApprovedById: null,
    manualApprovedAt: null,
    manualJustification: null,
    manualComprovanteKey: null,
    subscriptionId: null,
    investmentId: null,
    campaignId: null,
    endToEndId: null,
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };
    events = { emit: jest.fn() };
    paymentService = {
      emitPaymentConfirmed: jest.fn(),
      processPaymentEffects: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManualApproveService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: EventEmitter2, useValue: events },
        { provide: PaymentService, useValue: paymentService },
      ],
    }).compile();

    service = module.get(ManualApproveService);
  });

  // ===== justification too short =====

  it('deve lancrar BadRequestException quando justification < 20 chars', async () => {
    const dto: ManualApproveDto = {
      justification: 'muito curto', // 12 chars < 20
    };
    try {
      await service.manualApprove(1, dto, 42);
      fail('expected BadRequestException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(BadRequestException);
      const resp = e.getResponse();
      expect(resp).toHaveProperty('code', 'justification_too_short');
    }
  });

  // ===== payment not found =====

  it('deve lancrar NotFoundException quando payment nao existe', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    const dto: ManualApproveDto = {
      justification: 'justificativa longa o suficiente 20+ chars',
    };
    await expect(service.manualApprove(999, dto, 42)).rejects.toThrow(
      NotFoundException,
    );
  });

  // ===== already paid =====

  it('deve lancrar ConflictException quando payment ja esta PAID', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({ status: 'PAID' }),
    );
    const dto: ManualApproveDto = {
      justification: 'payment ja esta pago e pronto',
    };
    try {
      await service.manualApprove(1, dto, 42);
      fail('expected ConflictException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConflictException);
      const resp = e.getResponse();
      expect(resp).toHaveProperty('code', 'already_paid');
    }
  });

  // ===== canceled =====

  it('deve lancrar ConflictException quando payment esta CANCELED', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({ status: 'CANCELED' }),
    );
    const dto: ManualApproveDto = {
      justification: 'payment cancelado e nao pode ser aprovado',
    };
    try {
      await service.manualApprove(1, dto, 42);
      fail('expected ConflictException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(ConflictException);
      const resp = e.getResponse();
      expect(resp).toHaveProperty('code', 'canceled');
    }
  });

  // ===== happy path =====

  it('deve marcar payment como PAID e criar AuditLog', async () => {
    const original = fakePayment({ status: 'PENDING' });
    prisma.payment.findUnique.mockResolvedValue(original);
    const updated = {
      ...original,
      status: 'PAID',
      paidAt: new Date(),
      manualApprovedById: 42,
      manualApprovedAt: expect.any(Date),
      manualJustification: 'transferencia via pix offline realizada',
      manualComprovanteKey: null,
    };
    prisma.payment.update.mockResolvedValue(updated);
    auditService.log.mockResolvedValue(undefined);

    const dto: ManualApproveDto = {
      justification: 'transferencia via pix offline realizada',
    };
    const result = await service.manualApprove(1, dto, 42);

    expect(result.status).toBe('PAID');
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: 'PAID',
        manualApprovedById: 42,
        manualJustification: 'transferencia via pix offline realizada',
      }),
    });
    expect(auditService.log).toHaveBeenCalledWith({
      userId: 42,
      action: 'PAYMENT_MANUAL_APPROVED',
      entity: 'Payment',
      entityId: 1,
      oldValue: { status: 'PENDING' },
      newValue: {
        status: 'PAID',
        justification: 'transferencia via pix offline realizada',
        comprovanteKey: null,
      },
    });
  });

  // ===== emits payment.confirmed event =====

  it('deve emitir payment.confirmed event', async () => {
    const original = fakePayment({ status: 'PENDING', purpose: 'INVESTMENT' });
    prisma.payment.findUnique.mockResolvedValue(original);
    prisma.payment.update.mockResolvedValue({ ...original, status: 'PAID' });

    const dto: ManualApproveDto = {
      justification: 'pagamento off-platform confirmado',
    };
    await service.manualApprove(1, dto, 42);

    // Agora a notificação passa pelo helper do PaymentService (shape aninhado)
    // e os efeitos de domínio são aplicados por processPaymentEffects.
    expect(paymentService.emitPaymentConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, userId: 10, purpose: 'INVESTMENT' }),
    );
    expect(paymentService.processPaymentEffects).toHaveBeenCalledWith(1);
  });

  // ===== with comprovanteKey =====

  it('deve salvar comprovanteKey quando fornecido', async () => {
    const original = fakePayment({ status: 'PENDING' });
    prisma.payment.findUnique.mockResolvedValue(original);
    prisma.payment.update.mockResolvedValue({
      ...original,
      status: 'PAID',
      manualComprovanteKey: 'comprovantes/pix-offline-123.pdf',
    });

    const dto: ManualApproveDto = {
      justification: 'transferencia bancaria comprovada',
      comprovanteKey: 'comprovantes/pix-offline-123.pdf',
    };
    await service.manualApprove(1, dto, 42);

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        manualComprovanteKey: 'comprovantes/pix-offline-123.pdf',
      }),
    });
  });
});
