/**
 * Specs FIN-09 — RepassesService
 * Regra: Compliance delibera quantidade, Financeiro configura valor + intervalo.
 * Eventos: 'installment.approved' | 'installment.completed' (FIN-10 escuta).
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from 'src/s3/s3.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RepassesService } from './repasses.service';

const dec = (n: number) => ({ toString: () => n.toFixed(2) });

describe('RepassesService', () => {
  let service: RepassesService;
  let prisma: any;
  let events: { emit: jest.Mock };

  const USER_ID = 100;

  beforeEach(async () => {
    prisma = {
      campaign: { findUnique: jest.fn() },
      repasse: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      installment: {
        findUnique: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
      },
      installmentRequest: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      startup: { findUnique: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    events = { emit: jest.fn() };

    // Por padrao, $transaction executa a callback
    prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));

    const m: TestingModule = await Test.createTestingModule({
      providers: [
        RepassesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        {
          provide: S3Service,
          useValue: {
            upload: jest.fn().mockResolvedValue({ key: 'k', size: 1 }),
          },
        },
      ],
    }).compile();
    service = m.get(RepassesService);
  });

  // ============ deliberate ============

  describe('deliberate', () => {
    it('1. cria Repasse e seta complianceApprovedAt', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 1,
        status: 'FUNDED',
        totalRaised: dec(120000),
      });
      prisma.repasse.upsert.mockResolvedValue({
        id: 50,
        campaignId: 1,
        numeroParcelas: 12,
        complianceApprovedAt: new Date(),
        complianceApprovedByUserId: USER_ID,
        complianceObservacao: 'ok',
      });

      const result = await service.deliberate(
        1,
        { numeroParcelas: 12, observacao: 'ok' },
        USER_ID,
      );

      expect(result.numeroParcelas).toBe(12);
      expect(prisma.repasse.upsert).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'REPASS_DELIBERATED' }),
        }),
      );
    });

    it('2. rejeita se Campaign nao esta FUNDED', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: 1,
        status: 'OPEN',
        totalRaised: dec(50000),
      });

      await expect(
        service.deliberate(1, { numeroParcelas: 12 }, USER_ID),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.repasse.upsert).not.toHaveBeenCalled();
    });

    it('3. rejeita se Campaign nao existe', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);

      await expect(
        service.deliberate(99, { numeroParcelas: 12 }, USER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============ configure ============

  describe('configure', () => {
    const baseRepasse = {
      id: 50,
      campaignId: 1,
      numeroParcelas: 3,
      valorParcela: dec(33333),
      valorUltimaParcela: dec(33335),
      intervaloDias: 30,
      valorTotalCaptacao: dec(100001),
      complianceApprovedAt: new Date(),
      campaign: { startupId: 1 },
      financeiroConfiguredAt: null,
      financeiroConfiguredByUserId: null,
      status: 'CONFIGURED',
    };

    it('4. rejeita se complianceApprovedAt e null', async () => {
      prisma.repasse.findUnique.mockResolvedValue({
        ...baseRepasse,
        complianceApprovedAt: null,
      });

      await expect(
        service.configure(
          50,
          { valorParcela: 33333, intervaloDias: 30 },
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. valida consistencia valorTotal (tolerance 0.01)', async () => {
      // 33333 * 2 + 33333 = 99999 → totalSnap precisa ser 99999 (sem valorUltima)
      prisma.repasse.findUnique.mockResolvedValue({
        ...baseRepasse,
        valorTotalCaptacao: dec(99999),
      });
      prisma.installment.deleteMany.mockResolvedValue({ count: 0 });
      prisma.installment.createMany.mockResolvedValue({ count: 3 });
      prisma.repasse.update.mockResolvedValue({});

      await expect(
        service.configure(
          50,
          { valorParcela: 33333, intervaloDias: 30 },
          USER_ID,
        ),
      ).resolves.toBeDefined();
      expect(prisma.installment.createMany).toHaveBeenCalled();
    });

    it('6. cria N Installments com valor FIXO (sem valorUltimaParcela)', async () => {
      prisma.repasse.findUnique.mockResolvedValue({
        ...baseRepasse,
        valorTotalCaptacao: dec(90000),
        valorUltimaParcela: null,
        numeroParcelas: 3,
      });
      prisma.installment.deleteMany.mockResolvedValue({ count: 0 });
      prisma.installment.createMany.mockResolvedValue({ count: 3 });
      prisma.repasse.update.mockResolvedValue({});

      await service.configure(
        50,
        { valorParcela: 30000, intervaloDias: 30 },
        USER_ID,
      );

      expect(prisma.installment.createMany).toHaveBeenCalled();
      const installments = prisma.installment.createMany.mock.calls[0][0].data;
      expect(installments).toHaveLength(3);
      expect(installments[0].numero).toBe(1);
      expect(installments[0].valor).toBe(30000);
      expect(installments[1].numero).toBe(2);
      expect(installments[2].numero).toBe(3);
      expect(installments[2].valor).toBe(30000);
      expect(prisma.auditLog.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'REPASS_CONFIGURED' }),
        }),
      );
    });

    it('7. valorUltimaParcela absorve centavos', async () => {
      prisma.repasse.findUnique.mockResolvedValue({
        ...baseRepasse,
        valorTotalCaptacao: dec(100001),
        numeroParcelas: 3,
      });
      prisma.installment.deleteMany.mockResolvedValue({ count: 0 });
      prisma.installment.createMany.mockResolvedValue({ count: 3 });
      prisma.repasse.update.mockResolvedValue({});

      await service.configure(
        50,
        { valorParcela: 33333, valorUltimaParcela: 33335, intervaloDias: 30 },
        USER_ID,
      );

      const installments = prisma.installment.createMany.mock.calls[0][0].data;
      expect(installments[0].valor).toBe(33333);
      expect(installments[1].valor).toBe(33333);
      expect(installments[2].valor).toBe(33335);
    });

    it('7b. inconsistencia > tolerancia 0.01 rejeita', async () => {
      prisma.repasse.findUnique.mockResolvedValue({
        ...baseRepasse,
        valorTotalCaptacao: dec(100),
      });

      await expect(
        service.configure(
          50,
          { valorParcela: 33333, intervaloDias: 30 },
          USER_ID,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    // ============ primeiraParcelaDias (Sprint S36) ============
    describe('primeiraParcelaDias', () => {
      // FIX: congela a data de hoje para assercoes deterministicas (evita
      // dependencia de timezone do CI runner).
      const FROZEN_NOW = new Date('2026-10-04T00:00:00.000Z');

      beforeEach(() => {
        jest.useFakeTimers().setSystemTime(FROZEN_NOW);
      });
      afterEach(() => {
        jest.useRealTimers();
      });

      it('usa primeiraParcelaDias=7 quando informado (parcela 1 em 7d, demais a cada 30d)', async () => {
        prisma.repasse.findUnique.mockResolvedValue({
          ...baseRepasse,
          numeroParcelas: 3,
          valorTotalCaptacao: dec(90000),
          valorUltimaParcela: null,
        });
        prisma.installment.deleteMany.mockResolvedValue({ count: 0 });
        prisma.installment.createMany.mockResolvedValue({ count: 3 });
        prisma.repasse.update.mockResolvedValue({});

        await service.configure(
          50,
          {
            valorParcela: 30000,
            intervaloDias: 30,
            primeiraParcelaDias: 7,
          },
          USER_ID,
        );

        const installments =
          prisma.installment.createMany.mock.calls[0][0].data;
        // Parcela 1: baseDate + 7 dias (2026-10-11)
        expect(installments[0].scheduledDate.toISOString().slice(0, 10)).toBe(
          '2026-10-11',
        );
        // Parcela 2: baseDate + 7 + 30 = +37 dias (2026-11-10)
        expect(installments[1].scheduledDate.toISOString().slice(0, 10)).toBe(
          '2026-11-10',
        );
        // Parcela 3: baseDate + 7 + 60 = +67 dias (2026-12-10)
        expect(installments[2].scheduledDate.toISOString().slice(0, 10)).toBe(
          '2026-12-10',
        );

        // Audit deve registrar primeiraParcelaDias=7.
        expect(prisma.auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              newValue: expect.objectContaining({
                primeiraParcelaDias: 7,
                intervaloDias: 30,
              }),
            }),
          }),
        );

        // Repasse deve persistir primeiraParcelaDias=7.
        expect(prisma.repasse.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ primeiraParcelaDias: 7 }),
          }),
        );
      });

      it('fallback para intervaloDias quando primeiraParcelaDias nao informado (regra antiga)', async () => {
        prisma.repasse.findUnique.mockResolvedValue({
          ...baseRepasse,
          numeroParcelas: 3,
          valorTotalCaptacao: dec(90000),
          valorUltimaParcela: null,
        });
        prisma.installment.deleteMany.mockResolvedValue({ count: 0 });
        prisma.installment.createMany.mockResolvedValue({ count: 3 });
        prisma.repasse.update.mockResolvedValue({});

        await service.configure(
          50,
          { valorParcela: 30000, intervaloDias: 30 },
          USER_ID,
        );

        const installments =
          prisma.installment.createMany.mock.calls[0][0].data;
        // Parcela 1: baseDate + 30 (regra antiga: 1 * intervaloDias).
        expect(installments[0].scheduledDate.toISOString().slice(0, 10)).toBe(
          '2026-11-03',
        );
        // Repasse deve persistir primeiraParcelaDias = intervaloDias = 30.
        expect(prisma.repasse.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({ primeiraParcelaDias: 30 }),
          }),
        );
      });

      it('gera datas normalizadas em UTC midnight (consistencia founder/admin)', async () => {
        prisma.repasse.findUnique.mockResolvedValue({
          ...baseRepasse,
          numeroParcelas: 2,
          valorTotalCaptacao: dec(60000),
          valorUltimaParcela: null,
        });
        prisma.installment.deleteMany.mockResolvedValue({ count: 0 });
        prisma.installment.createMany.mockResolvedValue({ count: 2 });
        prisma.repasse.update.mockResolvedValue({});

        await service.configure(
          50,
          {
            valorParcela: 30000,
            intervaloDias: 30,
            primeiraParcelaDias: 14,
          },
          USER_ID,
        );

        const installments =
          prisma.installment.createMany.mock.calls[0][0].data;
        // Cada scheduledDate DEVE ser UTC midnight (00:00:00.000Z) —
        // fundamental para evitar drift entre o founder
        // (/founder/campaigns/:id/financeiro) e o admin (/admin/payouts).
        for (const inst of installments) {
          expect(inst.scheduledDate.getUTCHours()).toBe(0);
          expect(inst.scheduledDate.getUTCMinutes()).toBe(0);
          expect(inst.scheduledDate.getUTCSeconds()).toBe(0);
          expect(inst.scheduledDate.getUTCMilliseconds()).toBe(0);
        }
      });
    });
  });

  // ============ approveInstallment ============

  describe('approveInstallment', () => {
    const installmentBase = {
      id: 200,
      repasseId: 50,
      numero: 2,
      valor: 33333,
      status: 'REQUESTED',
      scheduledDate: null,
      paidAt: null,
      repasse: {
        id: 50,
        campaignId: 1,
        status: 'CONFIGURED',
      },
    };

    it('8. rejeita se parcela N-1 nao esta COMPLETED', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        ...installmentBase,
        numero: 2,
      });

      await expect(
        service.approveInstallment(200, {}, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });

    it('9. aceita primeira parcela sem validar N-1', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        ...installmentBase,
        numero: 1,
        status: 'REQUESTED',
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: 1,
        startupId: 5,
        startup: { founderId: 7 },
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.installmentRequest.upsert.mockResolvedValue({
        id: 300,
        installmentId: 200,
        status: 'APPROVED',
      });

      await service.approveInstallment(200, {}, USER_ID);

      expect(events.emit).toHaveBeenCalledWith(
        'installment.approved',
        expect.objectContaining({ installmentId: 200 }),
      );
      expect(prisma.auditLog.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTALLMENT_REQUEST_APPROVED',
          }),
        }),
      );
    });

    it('10. emite evento installment.approved', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        ...installmentBase,
        numero: 1,
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: 1,
        startupId: 5,
        startup: { founderId: 7 },
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.installmentRequest.upsert.mockResolvedValue({
        id: 300,
        installmentId: 200,
      });

      await service.approveInstallment(200, {}, USER_ID);

      expect(events.emit).toHaveBeenCalledWith(
        'installment.approved',
        expect.objectContaining({
          installmentId: 200,
          startupId: 5,
        }),
      );
    });

    it('10b. usa upsert (NÃO create) para preservar dados do fundador quando já existe', async () => {
      // Quando o founder JÁ criou o InstallmentRequest via /request, o admin
      // clica em Aprovar e o backend NAO pode dar Unique constraint — precisa
      // atualizar preservando allocationPercents/observacao do fundador.
      prisma.installment.findUnique.mockResolvedValue({
        ...installmentBase,
        numero: 1,
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: 1,
        startupId: 5,
        startup: { founderId: 7 },
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.installmentRequest.upsert.mockResolvedValue({
        id: 300,
        installmentId: 200,
        status: 'APPROVED',
      });

      await service.approveInstallment(200, {}, USER_ID);

      expect(prisma.installmentRequest.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { installmentId: 200 },
          create: expect.objectContaining({ status: 'APPROVED' }),
          update: expect.objectContaining({
            status: 'APPROVED',
            // Limpa dados de rejeicao previa (se vier de um reject+approve)
            rejectedAt: null,
            rejectedByUserId: null,
            rejectionReason: null,
          }),
        }),
      );
      expect(prisma.installmentRequest.create).not.toHaveBeenCalled();
    });

    it('10c. re-aprovacao de parcela ja PROCESSING e idempotente (no-op com upsert)', async () => {
      // Bug Sprint S34: admin clica Aprovar 2x (ou o status ja esta PROCESSING
      // de um approve anterior). Backend nao pode dar 400 — precisa no-op.
      prisma.installment.findUnique.mockResolvedValue({
        ...installmentBase,
        numero: 1,
        status: 'PROCESSING',
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: 1,
        startupId: 5,
        startup: { founderId: 7 },
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.installmentRequest.upsert.mockResolvedValue({
        id: 300,
        installmentId: 200,
        status: 'APPROVED',
      });

      await expect(
        service.approveInstallment(200, {}, USER_ID),
      ).resolves.toBeDefined();
      expect(prisma.installmentRequest.upsert).toHaveBeenCalled();
    });

    it('10d. bloqueia re-aprovacao de parcela ja COMPLETED (ja foi paga)', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        ...installmentBase,
        numero: 1,
        status: 'COMPLETED',
      });

      await expect(
        service.approveInstallment(200, {}, USER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============ rejectInstallment ============

  describe('rejectInstallment', () => {
    it('11. rejeicao NAO emite evento', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        id: 200,
        status: 'REQUESTED',
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.installmentRequest.updateMany.mockResolvedValue({ count: 1 });

      await service.rejectInstallment(200, 'falta docs', USER_ID);

      expect(events.emit).not.toHaveBeenCalledWith(
        'installment.approved',
        expect.anything(),
      );
      expect(events.emit).not.toHaveBeenCalledWith(
        'installment.completed',
        expect.anything(),
      );
      expect(prisma.auditLog.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'INSTALLMENT_REQUEST_REJECTED',
          }),
        }),
      );
    });
  });

  // ============ markInstallmentPaid ============

  describe('markInstallmentPaid', () => {
    const installmentBase = {
      id: 200,
      repasseId: 50,
      numero: 1,
      valor: 33333,
      status: 'PROCESSING',
      repasse: {
        id: 50,
        campaignId: 1,
        status: 'IN_PROGRESS',
        valorTotalCaptacao: dec(100001),
        numeroParcelas: 3,
      },
      request: { id: 300 },
    };

    it('12. emite evento installment.completed', async () => {
      prisma.installment.findUnique.mockResolvedValue(installmentBase);
      prisma.installment.update.mockResolvedValue({});
      prisma.installmentRequest.findUnique.mockResolvedValue({
        id: 300,
        installmentId: 200,
      });
      prisma.installmentRequest.update.mockResolvedValue({});

      await service.markInstallmentPaid(200, 'TXID-1', 'E2E-1', USER_ID);

      expect(events.emit).toHaveBeenCalledWith(
        'installment.completed',
        expect.objectContaining({ installmentId: 200 }),
      );
    });

    it('13. na ultima parcela marca Repasse como COMPLETED', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        ...installmentBase,
        numero: 3,
      });
      prisma.installment.update.mockResolvedValue({});
      prisma.installmentRequest.findUnique.mockResolvedValue({ id: 300 });
      prisma.installmentRequest.update.mockResolvedValue({});
      prisma.repasse.update.mockResolvedValue({});

      await service.markInstallmentPaid(200, 'TXID-1', 'E2E-1', USER_ID);

      expect(prisma.repasse.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 50 },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'REPASS_COMPLETED' }),
        }),
      );
    });
  });

  // ============ cancel ============

  describe('cancel', () => {
    it('14. cancela Repasse e marca installments pendentes como REJECTED', async () => {
      prisma.repasse.findUnique.mockResolvedValue({
        id: 50,
        status: 'CONFIGURED',
        installments: [
          { id: 1, status: 'AWAITING_REQUEST' },
          { id: 2, status: 'REQUESTED' },
          { id: 3, status: 'COMPLETED' },
        ],
      });
      prisma.repasse.update.mockResolvedValue({});
      prisma.installment.update.mockResolvedValue({});

      await service.cancel(50, 'campanha cancelada', USER_ID);

      expect(prisma.repasse.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
      expect(prisma.installment.update).toHaveBeenCalledTimes(2);
      expect(prisma.auditLog.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'REPASS_CANCELLED' }),
        }),
      );
    });
  });
});
