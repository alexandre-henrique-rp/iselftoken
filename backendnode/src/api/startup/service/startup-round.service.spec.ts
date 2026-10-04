import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { StartupRoundService } from './startup-round.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RefundService } from 'src/api/payment/refund.service';
import { InvestmentsService } from 'src/api/investments/investments.service';

describe('StartupRoundService', () => {
  let service: StartupRoundService;
  let prisma: any;
  let refundService: any;
  let investmentsService: any;

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn() },
      campaign: { update: jest.fn() },
      investment: { findMany: jest.fn(), update: jest.fn() },
    };

    refundService = {
      refundPayment: jest.fn(),
    };

    investmentsService = {
      refundInvestment: jest.fn().mockResolvedValue({ error: false }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StartupRoundService,
        { provide: PrismaService, useValue: prisma },
        { provide: RefundService, useValue: refundService },
        { provide: InvestmentsService, useValue: investmentsService },
      ],
    }).compile();

    service = module.get(StartupRoundService);
  });

  describe('pauseRound()', () => {
    it('deve pausar campanha OPEN', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'OPEN' }],
      });
      prisma.campaign.update.mockResolvedValue({ id: 10, status: 'PAUSED' });

      const result = await service.pauseRound(1, 10, { id: 42 } as any);
      expect(result.error).toBe(false);
      expect(result.data.roundStatus).toBe('pausada');
    });

    it('deve lancar ConflictException se nao esta ativa', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });

      await expect(
        service.pauseRound(1, 10, { id: 42 } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('deve retornar 404 se startup nao existe', async () => {
      prisma.startup.findUnique.mockResolvedValue(null);
      const result = await service.pauseRound(999, 10, { id: 42 } as any);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });
  });

  describe('cancelRound()', () => {
    it('deve cancelar campanha PAUSED', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });
      prisma.investment.findMany.mockResolvedValue([]);
      prisma.campaign.update.mockResolvedValue({ id: 10, status: 'CLOSED' });

      const result = await service.cancelRound(1, 10, { id: 42 } as any);
      expect(result.error).toBe(false);
      expect(result.data.roundStatus).toBe('cancelada');
      expect(result.data.refundsProcessed).toBe(0);
    });

    it('deve lancar ConflictException se esta ativa', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'OPEN' }],
      });

      await expect(
        service.cancelRound(1, 10, { id: 42 } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('deve retornar 404 se startup nao existe', async () => {
      prisma.startup.findUnique.mockResolvedValue(null);
      const result = await service.cancelRound(999, 10, { id: 42 } as any);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });

    it('deve retornar 403 se usuario nao e founder nem admin', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });

      const result = await service.cancelRound(1, 10, {
        id: 99,
        role: 'USER',
      } as any);
      expect(result.error).toBe(true);
      expect(result.codigo).toBe(403);
    });

    it('deve processar refunds de 3 investments PAID e fechar campaign', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });

      const investments = [
        {
          id: 1,
          payment: {
            id: 101,
            txid: 'TX01',
            purpose: 'INVESTMENT',
            amount: 500,
            status: 'PAID',
          },
        },
        {
          id: 2,
          payment: {
            id: 102,
            txid: 'TX02',
            purpose: 'INVESTMENT',
            amount: 300,
            status: 'PAID',
          },
        },
        {
          id: 3,
          payment: {
            id: 103,
            txid: 'TX03',
            purpose: 'INVESTMENT',
            amount: 200,
            status: 'PAID',
          },
        },
      ];
      prisma.investment.findMany.mockResolvedValue(investments);
      refundService.refundPayment
        .mockResolvedValueOnce({ success: true, refundId: 'R01' })
        .mockResolvedValueOnce({ success: true, refundId: 'R02' })
        .mockResolvedValueOnce({ success: true, refundId: 'R03' });
      prisma.investment.update.mockResolvedValue({});
      prisma.campaign.update.mockResolvedValue({ id: 10, status: 'CLOSED' });

      const result = await service.cancelRound(1, 10, { id: 42 } as any);

      expect(result.error).toBe(false);
      expect(result.data.refundsProcessed).toBe(3);
      expect(refundService.refundPayment).toHaveBeenCalledTimes(3);
      // Estorno integral delegado ao InvestmentsService.refundInvestment
      expect(investmentsService.refundInvestment).toHaveBeenCalledTimes(3);
      expect(investmentsService.refundInvestment).toHaveBeenCalledWith(
        1,
        42,
        'CANCEL_ROUND',
      );
      expect(investmentsService.refundInvestment).toHaveBeenCalledWith(
        3,
        42,
        'CANCEL_ROUND',
      );
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'CLOSED', closedAt: expect.any(Date) },
      });
    });

    it('deve cancelar sem refund se nao ha investments PAID', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });

      // Investments existem mas sem payment ou com status != PAID
      prisma.investment.findMany.mockResolvedValue([
        { id: 1, payment: { id: 101, status: 'PENDING' } },
        { id: 2, payment: null },
      ]);
      prisma.campaign.update.mockResolvedValue({ id: 10, status: 'CLOSED' });

      const result = await service.cancelRound(1, 10, { id: 42 } as any);

      expect(result.error).toBe(false);
      expect(result.data.refundsProcessed).toBe(0);
      expect(refundService.refundPayment).not.toHaveBeenCalled();
    });

    it('deve abortar e retornar erro se 1 refund falhar', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });

      const investments = [
        {
          id: 1,
          payment: {
            id: 101,
            txid: 'TX01',
            purpose: 'INVESTMENT',
            amount: 500,
            status: 'PAID',
          },
        },
        {
          id: 2,
          payment: {
            id: 102,
            txid: 'TX02',
            purpose: 'INVESTMENT',
            amount: 300,
            status: 'PAID',
          },
        },
      ];
      prisma.investment.findMany.mockResolvedValue(investments);
      refundService.refundPayment
        .mockResolvedValueOnce({ success: true, refundId: 'R01' })
        .mockResolvedValueOnce({ success: false, error: 'C6 timeout' });

      const result = await service.cancelRound(1, 10, { id: 42 } as any);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(502);
      expect(result.message).toContain('Refund falhou');
      // Campaign NÃO deve ser fechada
      expect(prisma.campaign.update).not.toHaveBeenCalled();
      // Apenas 1 investment estornado (o do refund que succeedeu antes da falha)
      expect(investmentsService.refundInvestment).toHaveBeenCalledTimes(1);
      expect(investmentsService.refundInvestment).toHaveBeenCalledWith(
        1,
        42,
        'CANCEL_ROUND',
      );
    });

    it('deve permitir ADMIN cancelar rodada de outra startup', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });
      prisma.investment.findMany.mockResolvedValue([]);
      prisma.campaign.update.mockResolvedValue({ id: 10, status: 'CLOSED' });

      const result = await service.cancelRound(1, 10, {
        id: 99,
        role: 'ADMIN',
      } as any);
      expect(result.error).toBe(false);
    });

    // ===== Cenarios de integracao (B11/T055) =====

    it('cenario MISTO: PIX + Checkout — deve rotear corretamente', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });

      const investments = [
        {
          id: 1,
          payment: {
            id: 101,
            txid: 'TX_PIX_1',
            purpose: 'INVESTMENT',
            amount: 1000,
            status: 'PAID',
          },
        },
        {
          id: 2,
          payment: {
            id: 102,
            txid: null, // sem txid → checkout
            purpose: 'INVESTMENT',
            amount: 500,
            status: 'PAID',
          },
        },
        {
          id: 3,
          payment: {
            id: 103,
            txid: 'TX_PIX_2',
            purpose: 'INVESTMENT',
            amount: 750,
            status: 'PAID',
          },
        },
      ];
      prisma.investment.findMany.mockResolvedValue(investments);
      refundService.refundPayment
        .mockResolvedValueOnce({ success: true, refundId: 'R_PIX_1' })
        .mockResolvedValueOnce({ success: true, refundId: 'R_CHK_1' })
        .mockResolvedValueOnce({ success: true, refundId: 'R_PIX_2' });
      prisma.investment.update.mockResolvedValue({});
      prisma.campaign.update.mockResolvedValue({ id: 10, status: 'CLOSED' });

      const result = await service.cancelRound(1, 10, { id: 42 } as any);

      expect(result.error).toBe(false);
      expect(result.data.refundsProcessed).toBe(3);

      // PIX recebeu txid 'TX_PIX_1' no 1o call
      expect(refundService.refundPayment).toHaveBeenNthCalledWith(
        1,
        investments[0].payment,
        42,
      );
      // Checkout (sem txid) recebeu payment-102 no 2o call
      expect(refundService.refundPayment).toHaveBeenNthCalledWith(
        2,
        investments[1].payment,
        42,
      );
      // PIX recebeu txid 'TX_PIX_2' no 3o call
      expect(refundService.refundPayment).toHaveBeenNthCalledWith(
        3,
        investments[2].payment,
        42,
      );

      // 3 investments estornados via refundInvestment + campaign CLOSED
      expect(investmentsService.refundInvestment).toHaveBeenCalledTimes(3);
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'CLOSED', closedAt: expect.any(Date) },
      });
    });

    it('cenario DRAFT (criada_aguardando_reserva): permite cancelar sem investments', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'DRAFT' }],
      });
      prisma.investment.findMany.mockResolvedValue([]);
      prisma.campaign.update.mockResolvedValue({ id: 10, status: 'CLOSED' });

      const result = await service.cancelRound(1, 10, { id: 42 } as any);

      expect(result.error).toBe(false);
      expect(result.data.roundStatus).toBe('cancelada');
      expect(result.data.refundsProcessed).toBe(0);
      expect(refundService.refundPayment).not.toHaveBeenCalled();
    });

    it('deve falhar com 404 se campanha nao pertence a startup', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }], // campaign 999 nao existe
      });

      const result = await service.cancelRound(1, 999, { id: 42 } as any);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
      expect(result.message).toContain('Rodada nao encontrada');
      expect(refundService.refundPayment).not.toHaveBeenCalled();
    });

    it('deve manter Investment CONFIRMED quando 3o refund falha (apos 1o e 2o OK)', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        founderId: 42,
        campaigns: [{ id: 10, status: 'PAUSED' }],
      });

      const investments = [
        {
          id: 1,
          payment: {
            id: 101,
            txid: 'TX01',
            purpose: 'INVESTMENT',
            amount: 100,
            status: 'PAID',
          },
        },
        {
          id: 2,
          payment: {
            id: 102,
            txid: 'TX02',
            purpose: 'INVESTMENT',
            amount: 200,
            status: 'PAID',
          },
        },
        {
          id: 3,
          payment: {
            id: 103,
            txid: 'TX03',
            purpose: 'INVESTMENT',
            amount: 300,
            status: 'PAID',
          },
        },
      ];
      prisma.investment.findMany.mockResolvedValue(investments);
      refundService.refundPayment
        .mockResolvedValueOnce({ success: true, refundId: 'R1' })
        .mockResolvedValueOnce({ success: true, refundId: 'R2' })
        .mockResolvedValueOnce({ success: false, error: 'C6 500' });

      const result = await service.cancelRound(1, 10, { id: 42 } as any);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(502);

      // 1o e 2o investments FORAM estornados — service so aborta no 3o
      expect(investmentsService.refundInvestment).toHaveBeenCalledTimes(2);
      expect(investmentsService.refundInvestment).toHaveBeenNthCalledWith(
        1,
        1,
        42,
        'CANCEL_ROUND',
      );
      expect(investmentsService.refundInvestment).toHaveBeenNthCalledWith(
        2,
        2,
        42,
        'CANCEL_ROUND',
      );

      // 3o investment NAO foi tocado (rollback parcial)
      expect(investmentsService.refundInvestment).not.toHaveBeenCalledWith(
        3,
        expect.anything(),
        expect.anything(),
      );

      // Campaign NAO foi fechada
      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });

    it('deve retornar 404 se startup nao existe (cancelRound)', async () => {
      prisma.startup.findUnique.mockResolvedValue(null);

      const result = await service.cancelRound(999, 10, { id: 42 } as any);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
      expect(result.message).toContain('Startup nao encontrada');
    });
  });
});
