import { Test, TestingModule } from '@nestjs/testing';
import {
  UnprocessableEntityException,
  BadRequestException,
} from '@nestjs/common';
import { RefundService } from './refund.service';
import { EfiPixAdapter } from './efi/adapters/efi-pix.adapter';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RefundDto } from './dto/refund.dto';

describe('RefundService — processRefund()', () => {
  let service: RefundService;
  let pixAdapter: any;
  let prisma: any;
  let events: any;

  const fakePayment = (overrides: Record<string, any> = {}) => ({
    id: 1,
    userId: 10,
    purpose: 'INVESTMENT',
    status: 'PAID',
    amount: { toString: () => '1000' },
    txid: 'ISelf123456789ABCDEF',
    paidAt: new Date(),
    refundedAt: null,
    refundReason: null,
    refundTxid: null,
    subscriptionId: null,
    investmentId: null,
    campaignId: null,
    endToEndId: null,
    ...overrides,
  });

  beforeEach(async () => {
    pixAdapter = { refundPix: jest.fn() };
    prisma = {
      payment: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    events = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: EfiPixAdapter, useValue: pixAdapter },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get(RefundService);
  });

  // ===== helpers =====

  const dto = (overrides: Partial<RefundDto> = {}): RefundDto => ({
    amount: 1000,
    reason: 'Cancelamento da rodada',
    ...overrides,
  });

  // ===== payment not found =====

  it('deve lancrar BadRequestException quando payment nao existe', async () => {
    prisma.payment.findUnique.mockResolvedValue(null);
    await expect(service.processRefund(999, dto(), 42)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ===== payment not paid =====

  it('deve lancrar BadRequestException quando payment.status !== PAID', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({ status: 'PENDING' }),
    );
    await expect(service.processRefund(1, dto(), 42)).rejects.toThrow(
      BadRequestException,
    );
  });

  // ===== 90-day window =====

  it('deve lancrar UnprocessableEntityException quando payment > 90 dias', async () => {
    const paidAt91DiasAtras = new Date();
    paidAt91DiasAtras.setDate(paidAt91DiasAtras.getDate() - 91);
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({ paidAt: paidAt91DiasAtras }),
    );
    try {
      await service.processRefund(1, dto(), 42);
      fail('expected UnprocessableEntityException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(UnprocessableEntityException);
      const resp = e.getResponse();
      expect(resp).toHaveProperty('code', 'reembolso_fora_prazo');
    }
  });

  it('deve allow refund dentro da janela de 90 dias', async () => {
    // 89 dias atrás — claramente dentro da janela
    const paidAt89DiasAtras = new Date();
    paidAt89DiasAtras.setDate(paidAt89DiasAtras.getDate() - 89);
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({ paidAt: paidAt89DiasAtras }),
    );
    pixAdapter.refundPix.mockResolvedValue({ id: 'REF-90' });
    prisma.payment.update.mockResolvedValue(
      fakePayment({ status: 'REFUNDED' }),
    );
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.processRefund(1, dto(), 42);
    expect(result.success).toBe(true);
  });

  // ===== partial refund =====

  it('deve processar refund parcial (amount < total)', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({ amount: { toString: () => '1000' } }),
    );
    pixAdapter.refundPix.mockResolvedValue({ id: 'REF-PARTIAL' });
    prisma.payment.update.mockResolvedValue(fakePayment({ status: 'PAID' }));
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.processRefund(1, dto({ amount: 500 }), 42);

    expect(result.success).toBe(true);
    expect(result.refundId).toBe('REF-PARTIAL');
    expect(pixAdapter.refundPix).toHaveBeenCalledWith({
      e2eId: 'ISelf123456789ABCDEF',
      amount: '500.00',
    });
    // Status permanece PAID em refund parcial
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ status: 'PAID' }),
    });
    expect(events.emit).not.toHaveBeenCalled(); // nao emite REFUNDED em parcial
  });

  // ===== refund amount exceeds total =====

  it('deve lancrar BadRequestException quando amount > total', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({ amount: { toString: () => '1000' } }),
    );
    await expect(
      service.processRefund(1, dto({ amount: 2000 }), 42),
    ).rejects.toThrow(BadRequestException);
  });

  // ===== full refund - emits event =====

  it('deve emitir payment.refunded quando estorno total', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({ amount: { toString: () => '1000' } }),
    );
    pixAdapter.refundPix.mockResolvedValue({ id: 'REF-FULL' });
    prisma.payment.update.mockResolvedValue(
      fakePayment({ status: 'REFUNDED' }),
    );
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.processRefund(1, dto(), 42);

    expect(result.success).toBe(true);
    expect(events.emit).toHaveBeenCalledWith(
      'payment.refunded',
      expect.objectContaining({ paymentId: 1 }),
    );
  });

  // ===== audit log retention 5 years =====

  it('deve criar AuditLog com retentionUntil de 5 anos', async () => {
    prisma.payment.findUnique.mockResolvedValue(fakePayment());
    pixAdapter.refundPix.mockResolvedValue({ id: 'REF-AUDIT' });
    prisma.payment.update.mockResolvedValue(
      fakePayment({ status: 'REFUNDED' }),
    );
    prisma.auditLog.create.mockResolvedValue({});

    await service.processRefund(1, dto(), 42);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PAYMENT_REFUNDED',
        entity: 'Payment',
        entityId: '1',
        newValue: expect.objectContaining({
          refundId: 'REF-AUDIT',
          amount: 1000,
          isPartial: false,
          retentionUntil: expect.stringMatching(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          ),
        }),
      }),
    });

    // Verifica que retentionUntil é ~5 anos no futuro
    const call = prisma.auditLog.create.mock.calls[0][0];
    const retentionUntil = new Date(call.data.newValue.retentionUntil);
    const now = new Date();
    const fiveYearsFromNow = new Date();
    fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);

    const diffMs = retentionUntil.getTime() - now.getTime();
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365);
    expect(diffYears).toBeGreaterThan(4.9);
    expect(diffYears).toBeLessThan(5.1);
  });

  it('não processa automaticamente estorno de cobrança de cartão EFI', async () => {
    prisma.payment.findUnique.mockResolvedValue(
      fakePayment({
        txid: 'EFI-CHARGE-123',
        efiChargeId: '123',
        amount: { toString: () => '500' },
      }),
    );

    const result = await service.processRefund(1, dto({ amount: 500 }), 42);

    expect(result.success).toBe(false);
    expect(result.error).toContain('painel EFI');
    expect(pixAdapter.refundPix).not.toHaveBeenCalled();
  });

  // ===== adapter failure =====

  it('deve retornar erro e logar audit quando adapter falha', async () => {
    prisma.payment.findUnique.mockResolvedValue(fakePayment());
    pixAdapter.refundPix.mockRejectedValue(new Error('EFI timeout'));
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.processRefund(1, dto(), 42);

    expect(result.success).toBe(false);
    expect(result.error).toBe('EFI timeout');
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PAYMENT_REFUND_FAILED',
        newValue: expect.objectContaining({ error: 'EFI timeout' }),
      }),
    });
  });
});
