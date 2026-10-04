/**
 * Testes unitarios do UserPlanHelper.
 *
 * Cobre o mapeamento Subscription.active + plan.slug -> UserPlan.PRO/FREE,
 * cache em memoria (TTL 5min) e fallback defensivo em caso de erro de DB.
 *
 * @see PRD scripts/PRD_UPLOAD_DE_ARQUIVOS.md (T5)
 */
import { Test } from '@nestjs/testing';
import { UserPlanHelper } from './user-plan.helper';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserPlan } from '../services/quota.service';

describe('UserPlanHelper', () => {
  let helper: UserPlanHelper;
  let prisma: { subscription: { findFirst: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      subscription: {
        findFirst: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [UserPlanHelper, { provide: PrismaService, useValue: prisma }],
    }).compile();

    helper = module.get<UserPlanHelper>(UserPlanHelper);
  });

  describe('getPlan', () => {
    it('deve retornar FREE para userId invalido (0 ou negativo)', async () => {
      expect(await helper.getPlan(0)).toBe(UserPlan.FREE);
      expect(await helper.getPlan(-1)).toBe(UserPlan.FREE);
      expect(prisma.subscription.findFirst).not.toHaveBeenCalled();
    });

    it('deve retornar FREE quando usuario nao tem subscription ACTIVE', async () => {
      prisma.subscription.findFirst.mockResolvedValueOnce(null);

      const plan = await helper.getPlan(42);

      expect(plan).toBe(UserPlan.FREE);
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId: 42, status: 'ACTIVE' },
        include: { plan: { select: { slug: true } } },
      });
    });

    it('deve retornar FREE quando subscription existe mas slug nao contem "pro"', async () => {
      prisma.subscription.findFirst.mockResolvedValueOnce({
        plan: { slug: 'investor_free' },
      });

      const plan = await helper.getPlan(42);

      expect(plan).toBe(UserPlan.FREE);
    });

    it('deve retornar PRO quando subscription ativa tem slug contendo "pro"', async () => {
      prisma.subscription.findFirst.mockResolvedValueOnce({
        plan: { slug: 'investor_pro' },
      });

      const plan = await helper.getPlan(42);

      expect(plan).toBe(UserPlan.PRO);
    });

    it('deve retornar PRO independente de case (slug uppercase)', async () => {
      prisma.subscription.findFirst.mockResolvedValueOnce({
        plan: { slug: 'FOUNDER_PRO' },
      });

      const plan = await helper.getPlan(42);

      expect(plan).toBe(UserPlan.PRO);
    });

    it('deve cachear resultado em memoria (TTL 5min)', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        plan: { slug: 'investor_pro' },
      });

      // 1a chamada: consulta DB
      expect(await helper.getPlan(42)).toBe(UserPlan.PRO);
      // 2a chamada: cache hit (sem nova query)
      expect(await helper.getPlan(42)).toBe(UserPlan.PRO);

      expect(prisma.subscription.findFirst).toHaveBeenCalledTimes(1);
    });

    it('deve invalidar cache via invalidate()', async () => {
      prisma.subscription.findFirst.mockResolvedValueOnce({
        plan: { slug: 'investor_pro' },
      });

      await helper.getPlan(42);
      helper.invalidate(42);

      // Proxima chamada deve consultar DB de novo
      prisma.subscription.findFirst.mockResolvedValueOnce({
        plan: { slug: 'investor_free' },
      });
      expect(await helper.getPlan(42)).toBe(UserPlan.FREE);
      expect(prisma.subscription.findFirst).toHaveBeenCalledTimes(2);
    });

    it('deve fazer fallback para FREE em caso de erro no Prisma', async () => {
      const loggerWarn = jest
        .spyOn(helper['logger'], 'warn')
        .mockImplementation();
      prisma.subscription.findFirst.mockRejectedValueOnce(
        new Error('DB indisponivel'),
      );

      const plan = await helper.getPlan(42);

      expect(plan).toBe(UserPlan.FREE);
      expect(loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining(
          '[UserPlanHelper] Falha ao resolver plano userId=42',
        ),
      );
    });
  });

  describe('clear', () => {
    it('deve limpar todo o cache', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        plan: { slug: 'investor_pro' },
      });

      await helper.getPlan(1);
      await helper.getPlan(2);
      helper.clear();
      await helper.getPlan(1);
      await helper.getPlan(2);

      expect(prisma.subscription.findFirst).toHaveBeenCalledTimes(4);
    });
  });
});
