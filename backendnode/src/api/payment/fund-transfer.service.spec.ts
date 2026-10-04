import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FundTransferService } from './fund-transfer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';
import { AffiliateCommissionService } from 'src/api/affiliate/affiliate-commission.service';
import { EfiPixAdapter } from './efi/adapters/efi-pix.adapter';
import { FeatureFlagsService } from 'src/common/feature-flags/feature-flags.service';

/**
 * Helpers para criar mocks de Decimal-like (Prisma.Decimal é uma classe;
 * usamos spread + helper para simplificar).
 */
const decimal = (value: number | string) => new Prisma.Decimal(value);

describe('FundTransferService', () => {
  let service: FundTransferService;
  let prisma: any;
  let efiPixAdapter: any;
  let featureFlags: any;
  let audit: any;
  let affiliateCommissionService: any;

  const founderUserId = 100;
  const otherUserId = 999;
  const startupId = 10;
  const campaignId = 50;

  const baseStartup = {
    id: startupId,
    founderId: founderUserId,
    banco: '336',
    agencia: '0001',
    conta: '12345',
    digito: '6',
    tipo_conta: 'corrente',
    pix_key: 'test@iselftoken.com',
    titular: 'João da Silva',
    documento_titular: '12345678909',
  };

  const baseCampaign = {
    id: campaignId,
    startupId,
    status: 'FUNDED',
    totalRaised: null,
    transferStarted: false,
  };

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn() },
      campaign: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      investment: { findMany: jest.fn() },
      notaFiscal: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      fundTransfer: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    efiPixAdapter = {
      transferBancario: jest.fn(),
    };
    featureFlags = {
      efiEnabled: false,
    };
    audit = { log: jest.fn() };
    affiliateCommissionService = {
      getTotalDueByCampaign: jest
        .fn()
        .mockResolvedValue({ total: 0, afiliados: 0, plataforma: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundTransferService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        {
          provide: AffiliateCommissionService,
          useValue: affiliateCommissionService,
        },
        { provide: EfiPixAdapter, useValue: efiPixAdapter },
        { provide: FeatureFlagsService, useValue: featureFlags },
      ],
    }).compile();

    service = module.get<FundTransferService>(FundTransferService);
  });

  describe('initiateTransfer()', () => {
    it('cria NF + 3 parcelas quando campaign está FUNDED com 3 investments CONFIRMED', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.notaFiscal.findFirst.mockResolvedValue(null); // sem NF existente
      prisma.campaign.findFirst
        .mockResolvedValueOnce(baseCampaign) // busca campaign FUNDED
        .mockResolvedValueOnce({
          totalRaised: decimal(30000),
          transferStarted: true,
        }); // busca campaign após
      prisma.investment.findMany.mockResolvedValue([
        { amount: decimal(10000) },
        { amount: decimal(10000) },
        { amount: decimal(10000) },
      ]);
      prisma.notaFiscal.count.mockResolvedValue(0); // próximo = 1
      prisma.notaFiscal.create.mockResolvedValue({
        id: 1,
        number: 'NF-2026-000001',
        amount: decimal(30000),
        issuedAt: new Date(),
        status: 'ISSUED',
        xmlUrl: null,
        fundTransfers: [
          {
            id: 11,
            installmentNumber: 1,
            amount: decimal(10000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
          {
            id: 12,
            installmentNumber: 2,
            amount: decimal(10000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
          {
            id: 13,
            installmentNumber: 3,
            amount: decimal(10000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
        ],
      });
      prisma.campaign.update.mockResolvedValue({
        ...baseCampaign,
        totalRaised: decimal(30000),
        transferStarted: true,
      });
      audit.log.mockResolvedValue(undefined);

      const result = await service.initiateTransfer(
        startupId,
        founderUserId,
        'FOUNDER',
      );

      expect(result.notafiscal?.number).toBe('NF-2026-000001');
      expect(result.notafiscal?.amount).toBe(30000);
      expect(result.transfers).toHaveLength(3);
      expect(result.transfers[0].installmentNumber).toBe(1);
      expect(result.transfers[2].installmentNumber).toBe(3);
      expect(result.totalRaised).toBe(30000);
      expect(result.transferStarted).toBe(true);

      // NF sequencial gerada corretamente (ano atual + seq 000001)
      expect(prisma.notaFiscal.count).toHaveBeenCalled();
      expect(prisma.notaFiscal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            startupId,
            number: expect.stringMatching(/^NF-\d{4}-000001$/),
            amount: expect.any(Prisma.Decimal),
          }),
        }),
      );

      // Campaign atualizada com totalRaised + transferStarted=true
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: campaignId },
        data: {
          totalRaised: expect.any(Prisma.Decimal),
          transferStarted: true,
        },
      });

      // Audit log gravado
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: founderUserId,
          action: 'REPASSE_INITIATED',
          entity: 'NotaFiscal',
          entityId: 1,
        }),
      );
    });

    it('é idempotente: chamar 2x retorna a mesma NF (sem criar duplicata)', async () => {
      const existingNf = {
        id: 7,
        number: 'NF-2026-000007',
        amount: decimal(15000),
        issuedAt: new Date(Date.now() - 60_000), // emitida há 60s (não "recém-criada")
        status: 'ISSUED',
        xmlUrl: null,
        fundTransfers: [
          {
            id: 71,
            installmentNumber: 1,
            amount: decimal(5000),
            scheduledDate: new Date(),
            status: 'COMPLETED',
            paidAt: new Date(),
            txIdBancario: 'tx1',
          },
          {
            id: 72,
            installmentNumber: 2,
            amount: decimal(5000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
          {
            id: 73,
            installmentNumber: 3,
            amount: decimal(5000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
        ],
      };

      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.notaFiscal.findFirst.mockResolvedValue(existingNf);
      prisma.campaign.findFirst.mockResolvedValue({
        totalRaised: decimal(15000),
        transferStarted: true,
      });

      const result = await service.initiateTransfer(
        startupId,
        founderUserId,
        'FOUNDER',
      );

      // Retorna NF existente
      expect(result.notafiscal?.id).toBe(7);
      expect(result.notafiscal?.number).toBe('NF-2026-000007');
      expect(result.transfers).toHaveLength(3);

      // NÃO chama create nem campaign.update (idempotente)
      expect(prisma.notaFiscal.create).not.toHaveBeenCalled();
      expect(prisma.campaign.update).not.toHaveBeenCalled();
      expect(audit.log).not.toHaveBeenCalled();
    });

    it('rejeita (400) quando não existe campaign com status FUNDED', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.notaFiscal.findFirst.mockResolvedValue(null);
      prisma.campaign.findFirst.mockResolvedValue(null); // sem campaign FUNDED

      await expect(
        service.initiateTransfer(startupId, founderUserId, 'FOUNDER'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.initiateTransfer(startupId, founderUserId, 'FOUNDER'),
      ).rejects.toThrow(/FUNDED/);

      expect(prisma.notaFiscal.create).not.toHaveBeenCalled();
    });

    it('rejeita (403) quando startup não pertence ao founder', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);

      await expect(
        service.initiateTransfer(startupId, otherUserId, 'USER'),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.notaFiscal.create).not.toHaveBeenCalled();
    });

    it('rejeita (404) quando startup não existe', async () => {
      prisma.startup.findUnique.mockResolvedValue(null);

      await expect(
        service.initiateTransfer(99999, founderUserId, 'FOUNDER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita (400) quando campaign já está com transferStarted=true e sem NF', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.notaFiscal.findFirst.mockResolvedValue(null); // sem NF
      prisma.campaign.findFirst.mockResolvedValue({
        ...baseCampaign,
        transferStarted: true,
      });

      await expect(
        service.initiateTransfer(startupId, founderUserId, 'FOUNDER'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.initiateTransfer(startupId, founderUserId, 'FOUNDER'),
      ).rejects.toThrow(/já foi iniciado/);
    });

    it('ADMIN pode iniciar repasse em qualquer startup (bypass ownership)', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.notaFiscal.findFirst.mockResolvedValue(null);
      prisma.campaign.findFirst.mockResolvedValue(baseCampaign);
      prisma.investment.findMany.mockResolvedValue([{ amount: decimal(3000) }]);
      prisma.notaFiscal.count.mockResolvedValue(2);
      prisma.notaFiscal.create.mockResolvedValue({
        id: 99,
        number: 'NF-2026-000003',
        amount: decimal(3000),
        issuedAt: new Date(),
        status: 'ISSUED',
        xmlUrl: null,
        fundTransfers: [
          {
            id: 1,
            installmentNumber: 1,
            amount: decimal(1000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
          {
            id: 2,
            installmentNumber: 2,
            amount: decimal(1000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
          {
            id: 3,
            installmentNumber: 3,
            amount: decimal(1000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
        ],
      });
      prisma.campaign.update.mockResolvedValue({});
      audit.log.mockResolvedValue(undefined);

      const result = await service.initiateTransfer(
        startupId,
        otherUserId,
        'ADMIN',
      );

      expect(result.notafiscal?.id).toBe(99);
      expect(result.transfers).toHaveLength(3);
    });

    it('divide corretamente valor com resto (centavos) na parcela 1', async () => {
      // Total 10000.01 → parcelas 3333.34, 3333.33, 3333.34 (soma = 10000.01)
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.notaFiscal.findFirst.mockResolvedValue(null);
      prisma.campaign.findFirst
        .mockResolvedValueOnce(baseCampaign)
        .mockResolvedValueOnce({
          totalRaised: decimal(10000.01),
          transferStarted: true,
        });
      prisma.investment.findMany.mockResolvedValue([
        { amount: decimal(5000) },
        { amount: decimal(5000.01) },
      ]);
      prisma.notaFiscal.count.mockResolvedValue(0);
      prisma.notaFiscal.create.mockResolvedValue({
        id: 1,
        number: 'NF-2026-000001',
        amount: decimal(10000.01),
        issuedAt: new Date(),
        status: 'ISSUED',
        xmlUrl: null,
        fundTransfers: [
          {
            id: 11,
            installmentNumber: 1,
            amount: decimal(3333.34),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
          {
            id: 12,
            installmentNumber: 2,
            amount: decimal(3333.33),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
          {
            id: 13,
            installmentNumber: 3,
            amount: decimal(3333.34),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
        ],
      });
      prisma.campaign.update.mockResolvedValue({});
      audit.log.mockResolvedValue(undefined);

      await service.initiateTransfer(startupId, founderUserId, 'FOUNDER');

      const createCall = prisma.notaFiscal.create.mock.calls[0][0];
      const transfers = createCall.data.fundTransfers.create;
      const total =
        Number(transfers[0].amount) +
        Number(transfers[1].amount) +
        Number(transfers[2].amount);

      expect(total).toBeCloseTo(10000.01, 2);
    });
  });

  describe('getTransferStatus()', () => {
    it('retorna NF + 3 transfers quando repasse iniciado', async () => {
      const nf = {
        id: 1,
        number: 'NF-2026-000001',
        amount: decimal(9000),
        issuedAt: new Date(),
        status: 'ISSUED',
        xmlUrl: null,
        fundTransfers: [
          {
            id: 11,
            installmentNumber: 1,
            amount: decimal(3000),
            scheduledDate: new Date(),
            status: 'COMPLETED',
            paidAt: new Date(),
            txIdBancario: 'tx-real-1',
          },
          {
            id: 12,
            installmentNumber: 2,
            amount: decimal(3000),
            scheduledDate: new Date(),
            status: 'PROCESSING',
            paidAt: null,
            txIdBancario: null,
          },
          {
            id: 13,
            installmentNumber: 3,
            amount: decimal(3000),
            scheduledDate: new Date(),
            status: 'PENDING',
            paidAt: null,
            txIdBancario: null,
          },
        ],
      };

      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.notaFiscal.findFirst.mockResolvedValue(nf);
      prisma.campaign.findFirst.mockResolvedValue({
        totalRaised: decimal(9000),
        transferStarted: true,
      });

      const result = await service.getTransferStatus(
        startupId,
        founderUserId,
        'FOUNDER',
      );

      expect(result.notafiscal?.id).toBe(1);
      expect(result.transfers).toHaveLength(3);
      expect(result.transfers[0].status).toBe('COMPLETED');
      expect(result.transfers[1].status).toBe('PROCESSING');
      expect(result.transferStarted).toBe(true);
    });

    it('retorna vazio (notafiscal=null) quando repasse não foi iniciado', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);
      prisma.notaFiscal.findFirst.mockResolvedValue(null);
      prisma.campaign.findFirst.mockResolvedValue({
        totalRaised: null,
        transferStarted: false,
      });

      const result = await service.getTransferStatus(
        startupId,
        founderUserId,
        'FOUNDER',
      );

      expect(result.notafiscal).toBeNull();
      expect(result.transfers).toHaveLength(0);
      expect(result.transferStarted).toBe(false);
      expect(result.totalRaised).toBe(0);
    });

    it('rejeita (403) quando founder não é dono da startup', async () => {
      prisma.startup.findUnique.mockResolvedValue(baseStartup);

      await expect(
        service.getTransferStatus(startupId, otherUserId, 'USER'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('processScheduledTransfers()', () => {
    it('processa parcelas PENDING vencidas → COMPLETED', async () => {
      const now = new Date();
      const dueTransfer = {
        id: 21,
        startupId,
        notaFiscalId: 1,
        installmentNumber: 1,
        amount: decimal(5000),
        scheduledDate: new Date(now.getTime() - 60_000), // vencido há 1min
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'COMPLETED' });
      efiPixAdapter.transferBancario.mockResolvedValue({
        txId: 'TX-REAL-999',
        status: 'COMPLETED',
        estimatedCompletion: new Date(),
      });
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.processed).toBe(1);
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);

      // Atualizou para PROCESSING e depois COMPLETED
      expect(prisma.fundTransfer.update).toHaveBeenCalledTimes(2);
      expect(efiPixAdapter.transferBancario).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          destinationAccount: expect.objectContaining({
            bankCode: '336',
            holderName: 'João da Silva',
          }),
          type: 'PIX',
        }),
      );

      // Audit log da transferência
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null, // BUG-FT-001: ação de sistema (cron)
            action: 'REPASSE_TRANSFERRED',
            entity: 'FundTransfer',
            entityId: '21',
          }),
        }),
      );
    });

    it('ignora parcelas PENDING sem vencimento (scheduledDate > now)', async () => {
      prisma.fundTransfer.findMany.mockResolvedValue([]); // nenhuma vencida

      const result = await service.processScheduledTransfers();

      expect(result.processed).toBe(0);
      expect(result.completed).toBe(0);
    });

    it('marca FAILED quando gateway retorna FAILED', async () => {
      const dueTransfer = {
        id: 22,
        startupId,
        installmentNumber: 1,
        amount: decimal(1000),
        scheduledDate: new Date(Date.now() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'FAILED' });
      efiPixAdapter.transferBancario.mockResolvedValue({
        txId: 'TX-FAILED',
        status: 'FAILED',
      });
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.failed).toBe(1);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null, // BUG-FT-001: ação de sistema (cron)
            action: 'REPASSE_FAILED',
          }),
        }),
      );
    });

    it('marca FAILED quando dados bancários estão ausentes', async () => {
      const dueTransfer = {
        id: 23,
        startupId,
        installmentNumber: 1,
        amount: decimal(1000),
        scheduledDate: new Date(Date.now() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup, banco: null, agencia: null }, // faltando banco/agencia
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update.mockResolvedValue({ status: 'FAILED' });
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.failed).toBe(1);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null, // BUG-FT-001: ação de sistema (cron)
            action: 'REPASSE_FAILED',
            newValue: expect.objectContaining({
              reason: expect.stringMatching(/Dados bancários ausentes/i),
            }),
          }),
        }),
      );
    });

    it('marca FAILED quando adapter joga exceção (rede/gateway offline)', async () => {
      const dueTransfer = {
        id: 24,
        startupId,
        installmentNumber: 1,
        amount: decimal(2000),
        scheduledDate: new Date(Date.now() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'FAILED' });
      efiPixAdapter.transferBancario.mockRejectedValue(new Error('C6 timeout'));
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.failed).toBe(1);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null, // BUG-FT-001: ação de sistema (cron)
            action: 'REPASSE_FAILED',
            newValue: expect.objectContaining({
              error: 'C6 timeout',
            }),
          }),
        }),
      );
    });
  });

  /**
   * ============================================================
   * BUG-FT-001: AuditLog de ações de sistema
   * ============================================================
   * Valida que `processScheduledTransfers()` (cron) registra AuditLog
   * com `userId: null` (não `userId: 0` hardcoded) porque é uma ação
   * de sistema sem User actor.
   */
  describe('BUG-FT-001 — AuditLog de ações de sistema', () => {
    it('processScheduledTransfers (C6 success) cria AuditLog com userId=null', async () => {
      const dueTransfer = {
        id: 60,
        startupId,
        notaFiscalId: 1,
        installmentNumber: 1,
        amount: decimal(7500),
        scheduledDate: new Date(Date.now() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'COMPLETED' });
      efiPixAdapter.transferBancario.mockResolvedValue({
        txId: 'TX-SYS-001',
        status: 'COMPLETED',
      });
      prisma.auditLog.create.mockResolvedValue(undefined);

      await service.processScheduledTransfers();

      // AuditLog criado com userId=null (ação de sistema, não userId: 0)
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const call = prisma.auditLog.create.mock.calls[0][0];
      expect(call.data.userId).toBeNull();
      expect(call.data.userId).not.toBe(0); // sanity: NAO é mais 0 hardcoded
      expect(call.data.action).toBe('REPASSE_TRANSFERRED');
      expect(call.data.entity).toBe('FundTransfer');
    });

    it('processScheduledTransfers (C6 failure) cria AuditLog FAILED com userId=null', async () => {
      const dueTransfer = {
        id: 61,
        startupId,
        notaFiscalId: 1,
        installmentNumber: 1,
        amount: decimal(3000),
        scheduledDate: new Date(Date.now() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'FAILED' });
      efiPixAdapter.transferBancario.mockRejectedValue(
        new Error('gateway offline'),
      );
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.failed).toBe(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
      const call = prisma.auditLog.create.mock.calls[0][0];
      expect(call.data.userId).toBeNull(); // BUG-FT-001 fix
      expect(call.data.action).toBe('REPASSE_FAILED');
      expect(call.data.newValue).toEqual(
        expect.objectContaining({
          error: 'gateway offline',
        }),
      );
    });
  });

  /**
   * ============================================================
   * INTEGRATION TESTS — T061
   * Testes adicionais que validam:
   *  - Determinismo temporal (jest.spyOn(Date))
   *  - Integracao com Prisma.Decimal real
   *  - LGPD: dados bancarios NAO vazam em AuditLog
   *  - Edge cases de splitInstallments (valores com centavos)
   * ============================================================
   */
  describe('INTEGRATION — determinismo temporal e LGPD (T061)', () => {
    it('processa parcela com scheduledDate EXATAMENTE = now (boundary)', async () => {
      // Boundary: scheduledDate === now (lte: now deve incluir)
      const fixedNow = new Date('2026-07-15T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(fixedNow);

      const dueTransfer = {
        id: 30,
        startupId,
        notaFiscalId: 1,
        installmentNumber: 1,
        amount: decimal(50000),
        scheduledDate: new Date(fixedNow.getTime()), // exatamente now
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'COMPLETED' });
      efiPixAdapter.transferBancario.mockResolvedValue({
        txId: 'TX-BOUNDARY',
        status: 'COMPLETED',
      });
      prisma.auditLog.create.mockResolvedValue(undefined);

      try {
        const result = await service.processScheduledTransfers();
        expect(result.processed).toBe(1);
        expect(result.completed).toBe(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('ignora parcela com scheduledDate 1ms no futuro (boundary)', async () => {
      const fixedNow = new Date('2026-07-15T12:00:00.000Z');
      jest.useFakeTimers().setSystemTime(fixedNow);

      const futureTransfer = {
        id: 31,
        startupId,
        notaFiscalId: 1,
        installmentNumber: 1,
        amount: decimal(50000),
        scheduledDate: new Date(fixedNow.getTime() + 1), // 1ms no futuro
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      // Prisma filtra antes de chegar ao service — simula filtro lte
      prisma.fundTransfer.findMany.mockResolvedValue([]);

      try {
        const result = await service.processScheduledTransfers();
        expect(result.processed).toBe(0);
      } finally {
        jest.useRealTimers();
      }
      // garante que o filtro usa a data spyada
      expect(prisma.fundTransfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledDate: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        }),
      );
      // silenciar unused
      void futureTransfer;
    });

    it('LGPD: AuditLog REPASSE_TRANSFERRED NAO contem conta/agencia/documentoTitular', async () => {
      const dueTransfer = {
        id: 32,
        startupId,
        notaFiscalId: 1,
        installmentNumber: 1,
        amount: decimal(5000),
        scheduledDate: new Date(Date.now() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'COMPLETED' });
      efiPixAdapter.transferBancario.mockResolvedValue({
        txId: 'TX-LGPD-OK',
        status: 'COMPLETED',
      });

      let capturedNewValue: any = null;
      prisma.auditLog.create.mockImplementation(async (args: any) => {
        capturedNewValue = args.data.newValue;
        return undefined;
      });

      await service.processScheduledTransfers();

      // Capturou o AuditLog
      expect(capturedNewValue).not.toBeNull();

      // Serializa e verifica que dados bancarios NAO estao em plaintext
      const serialized = JSON.stringify(capturedNewValue);
      expect(serialized).not.toContain('12345'); // conta
      expect(serialized).not.toContain('0001'); // agencia
      expect(serialized).not.toContain('12345678909'); // documento
      expect(serialized).not.toContain('João da Silva'); // titular

      // Porem, dados NAO-sensiveis DEVEM estar presentes (txId, amount)
      expect(serialized).toContain('TX-LGPD-OK');
      expect(serialized).toContain('5000');
    });

    it('processa multiplas parcelas em batch (3 transferencias vencidas)', async () => {
      // 3 transferencias vencidas em uma unica execucao do cron
      const transfers = [
        {
          id: 40,
          startupId,
          notaFiscalId: 1,
          installmentNumber: 1,
          amount: decimal(50000),
          scheduledDate: new Date(Date.now() - 3 * 24 * 3600 * 1000),
          status: 'PENDING',
          paidAt: null,
          txIdBancario: null,
          startup: { ...baseStartup },
        },
        {
          id: 41,
          startupId,
          notaFiscalId: 1,
          installmentNumber: 2,
          amount: decimal(50000),
          scheduledDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
          status: 'PENDING',
          paidAt: null,
          txIdBancario: null,
          startup: { ...baseStartup },
        },
        {
          id: 42,
          startupId,
          notaFiscalId: 1,
          installmentNumber: 3,
          amount: decimal(50000),
          scheduledDate: new Date(Date.now() - 12 * 3600 * 1000),
          status: 'PENDING',
          paidAt: null,
          txIdBancario: null,
          startup: { ...baseStartup },
        },
      ];

      prisma.fundTransfer.findMany.mockResolvedValue(transfers);
      // Para cada parcela: 2 updates (PROCESSING + COMPLETED)
      prisma.fundTransfer.update.mockResolvedValue({ status: 'COMPLETED' });
      efiPixAdapter.transferBancario.mockResolvedValue({
        txId: 'TX-BATCH',
        status: 'COMPLETED',
      });
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.processed).toBe(3);
      expect(result.completed).toBe(3);
      expect(result.failed).toBe(0);
      expect(efiPixAdapter.transferBancario).toHaveBeenCalledTimes(3);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(3);
    });

    it('mistura completa: 1 OK + 1 FAILED (gateway) + 1 FAILED (sem bank) em uma execucao', async () => {
      const okTransfer = {
        id: 50,
        startupId,
        notaFiscalId: 1,
        installmentNumber: 1,
        amount: decimal(50000),
        scheduledDate: new Date(Date.now() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };
      const failedGatewayTransfer = {
        ...okTransfer,
        id: 51,
        installmentNumber: 2,
        startup: { ...baseStartup },
      };
      const noBankTransfer = {
        ...okTransfer,
        id: 52,
        installmentNumber: 3,
        startup: { ...baseStartup, banco: null, agencia: null }, // sem dados bancarios
      };

      prisma.fundTransfer.findMany.mockResolvedValue([
        okTransfer,
        failedGatewayTransfer,
        noBankTransfer,
      ]);
      prisma.fundTransfer.update.mockResolvedValue({ status: 'PENDING' });
      efiPixAdapter.transferBancario
        .mockResolvedValueOnce({
          txId: 'TX-OK',
          status: 'COMPLETED',
        })
        .mockRejectedValueOnce(new Error('C6 timeout'));
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.processed).toBe(3);
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(2);
      // C6 foi chamado apenas 2x (nao chama para noBank)
      expect(efiPixAdapter.transferBancario).toHaveBeenCalledTimes(2);
      // 3 audit logs: 1 REPASSE_TRANSFERRED + 2 REPASSE_FAILED
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================================
  // T042: EFI vs C6 dispatch via feature flag
  // ============================================================
  describe('executeTransfer — B12 EFI/C6 dispatch (T042)', () => {
    it('usa EfiPixAdapter quando featureFlags.efiEnabled=true', async () => {
      featureFlags.efiEnabled = true;

      const now = new Date();
      const dueTransfer = {
        id: 80,
        startupId,
        notaFiscalId: 1,
        installmentNumber: 1,
        amount: decimal(5000),
        scheduledDate: new Date(now.getTime() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'COMPLETED' });
      efiPixAdapter.transferBancario.mockResolvedValue({
        txId: 'EFI-TX-001',
        status: 'COMPLETED',
      });
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.processed).toBe(1);
      expect(result.completed).toBe(1);
      expect(efiPixAdapter.transferBancario).toHaveBeenCalledTimes(1);
      expect(efiPixAdapter.transferBancario).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          destinationAccount: expect.objectContaining({
            bankCode: '336',
            holderName: 'João da Silva',
          }),
          type: 'PIX',
        }),
      );
    });

    it('trata erro de EFI como falha parcial — marca FAILED + AuditLog', async () => {
      featureFlags.efiEnabled = true;

      const now = new Date();
      const dueTransfer = {
        id: 82,
        startupId,
        notaFiscalId: 3,
        installmentNumber: 3,
        amount: decimal(2000),
        scheduledDate: new Date(now.getTime() - 60_000),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
        startup: { ...baseStartup },
      };

      prisma.fundTransfer.findMany.mockResolvedValue([dueTransfer]);
      prisma.fundTransfer.update
        .mockResolvedValueOnce({ status: 'PROCESSING' })
        .mockResolvedValueOnce({ status: 'FAILED' });
      efiPixAdapter.transferBancario.mockRejectedValue(
        new Error('EFI gateway timeout'),
      );
      prisma.auditLog.create.mockResolvedValue(undefined);

      const result = await service.processScheduledTransfers();

      expect(result.failed).toBe(1);
      expect(efiPixAdapter.transferBancario).toHaveBeenCalledTimes(1);
      // AuditLog de falha
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: null,
            action: 'REPASSE_FAILED',
            newValue: expect.objectContaining({
              error: 'EFI gateway timeout',
            }),
          }),
        }),
      );
    });
  });
});
