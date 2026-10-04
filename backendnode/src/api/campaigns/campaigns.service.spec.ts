/**
 * Specs para CampaignsService - T032 (requestNewRound) + T033 (executeAction).
 */
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { CampaignsService } from './campaigns.service';
import { CampaignAction } from './dto/action-campaign.dto';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: {
    startup: { findUnique: jest.Mock };
    campaign: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  const FOUNDER_ID = 42;
  const user = { id: FOUNDER_ID, role: 'FOUNDER' } as any;

  beforeEach(async () => {
    prisma = {
      startup: { findUnique: jest.fn() },
      campaign: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const m: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = m.get(CampaignsService);
  });

  // ============ T032 (B05) ============

  describe('requestNewRound (T032)', () => {
    it('1. sem campanha anterior -> cria direto (primeira rodada)', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
        status: 'APPROVED',
      });
      prisma.campaign.findFirst.mockResolvedValueOnce(null);
      prisma.campaign.create.mockResolvedValueOnce({
        id: 99,
        title: 'R1',
        status: 'OPEN',
      });

      const result = await service.requestNewRound(
        1,
        {
          title: 'R1',
          targetAmount: 100000,
          minInvestment: 100,
          valuation: 1000000,
          tokenPrice: 200,
          totalTokens: 1000,
          deadline: new Date(),
        },
        user,
      );

      expect(result.codigo).toBe(201);
      expect(prisma.campaign.create).toHaveBeenCalled();
    });

    it('2. rodada anterior < 100% vendida -> BadRequest', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
        status: 'APPROVED',
      });
      prisma.campaign.findFirst.mockResolvedValueOnce({
        id: 50,
        tokensSold: 500,
        totalTokens: 1000,
        closedAt: new Date(Date.now() - 1000 * 24 * 60 * 60 * 200),
        status: 'FUNDED',
      });

      await expect(
        service.requestNewRound(
          1,
          {
            title: 'R2',
            targetAmount: 100000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'RODADA_ANTERIOR_NAO_VENDIDA' },
      });
    });

    it('3. rodada anterior < 3 meses -> BadRequest', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
        status: 'APPROVED',
      });
      prisma.campaign.findFirst.mockResolvedValueOnce({
        id: 50,
        tokensSold: 1000,
        totalTokens: 1000,
        closedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        status: 'FUNDED',
      });

      await expect(
        service.requestNewRound(
          1,
          {
            title: 'R2',
            targetAmount: 100000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toMatchObject({
        response: { code: 'INTERVALO_MINIMO_3_MESES' },
      });
    });

    it('4. rodada anterior 100% vendida + > 3 meses -> cria nova', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: FOUNDER_ID,
        status: 'APPROVED',
      });
      prisma.campaign.findFirst.mockResolvedValueOnce({
        id: 50,
        tokensSold: 1000,
        totalTokens: 1000,
        closedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
        status: 'FUNDED',
      });
      prisma.campaign.create.mockResolvedValueOnce({ id: 99 });

      const result = await service.requestNewRound(
        1,
        {
          title: 'R2',
          targetAmount: 100000,
          minInvestment: 100,
          valuation: 1000000,
          tokenPrice: 200,
          totalTokens: 1000,
          deadline: new Date(),
        },
        user,
      );

      expect(result.codigo).toBe(201);
    });

    it('5. startup nao pertence ao user -> Forbidden', async () => {
      prisma.startup.findUnique.mockResolvedValueOnce({
        id: 1,
        founderId: 999,
      });

      await expect(
        service.requestNewRound(
          1,
          {
            title: 'R',
            targetAmount: 100000,
            minInvestment: 100,
            valuation: 1000000,
            tokenPrice: 200,
            totalTokens: 1000,
            deadline: new Date(),
          },
          user,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  // ============ T033 (B06) ============

  describe('executeAction (T033)', () => {
    it('1. OPEN + PAUSE -> PAUSED', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'OPEN',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1, status: 'PAUSED' });

      const r = await service.executeAction(1, CampaignAction.PAUSE, user);
      expect(r.data!.status).toBe('PAUSED');
    });

    it('2. PAUSED + RESUME -> OPEN', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'PAUSED',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1, status: 'OPEN' });

      const r = await service.executeAction(1, CampaignAction.RESUME, user);
      expect(r.data!.status).toBe('OPEN');
    });

    it('3. OPEN + FINISH -> 403 (so PAUSE permitido)', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'OPEN',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });

      await expect(
        service.executeAction(1, CampaignAction.FINISH, user),
      ).rejects.toMatchObject({
        response: { code: 'ACAO_NAO_PERMITIDA_POS_RODADA' },
      });
    });

    it('4. CLOSED + FINISH -> CLOSED (setta closedAt)', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'CLOSED',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1, status: 'CLOSED' });

      const r = await service.executeAction(1, CampaignAction.FINISH, user);
      expect(r.data!.status).toBe('CLOSED');
      expect(prisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ closedAt: expect.any(Date) }),
        }),
      );
    });

    it('5. FUNDED + qualquer -> 403', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'FUNDED',
        closedAt: new Date(),
        startup: { founderId: FOUNDER_ID },
      });

      await expect(
        service.executeAction(1, CampaignAction.PAUSE, user),
      ).rejects.toMatchObject({
        response: { code: 'ACAO_NAO_PERMITIDA_POS_RODADA' },
      });
    });

    it('6. PAUSED + FINISH -> CLOSED', async () => {
      prisma.campaign.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'PAUSED',
        closedAt: null,
        startup: { founderId: FOUNDER_ID },
      });
      prisma.campaign.update.mockResolvedValueOnce({ id: 1, status: 'CLOSED' });

      const r = await service.executeAction(1, CampaignAction.FINISH, user);
      expect(r.data!.status).toBe('CLOSED');
    });
  });
});
