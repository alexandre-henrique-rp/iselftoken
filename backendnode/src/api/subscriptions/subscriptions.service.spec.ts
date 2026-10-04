import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from 'src/auth/session/session.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  // mock do PrismaService
  const mockPrismaService = {
    subscription: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    plan: {
      findUnique: jest.fn(),
    },
  };

  const mockAuditService = {
    log: jest.fn(),
  };

  const mockSessionService = {
    refreshUserSubscriptions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);

    // limpa os mocks antes de cada teste
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUserPlan', () => {
    const userId: number = 1;
    const planId: number = 1;

    it('deve lançar ForbiddenException quando usuário não possui plano', async () => {
      // mock: nenhuma assinatura encontrada
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      // executa e espera exceção
      await expect(service.validateUserPlan(userId, planId)).rejects.toThrow(
        ForbiddenException,
      );

      // verifica mensagem de erro
      await expect(service.validateUserPlan(userId, planId)).rejects.toThrow(
        `Acesso negado. Você precisa de um plano ativo "${planId}" para acessar este recurso.`,
      );

      // verifica se chamou o prisma corretamente
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: userId,
          status: 'ACTIVE',
          planId: planId,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
        include: {
          plan: true,
        },
      });
    });

    it('deve lançar ForbiddenException quando plano está vencido', async () => {
      // mock: assinatura com data expirada (não será retornada pela query)
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      // executa e espera exceção
      await expect(service.validateUserPlan(userId, planId)).rejects.toThrow(
        ForbiddenException,
      );

      // verifica se a query incluiu filtro de data maior que atual
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: {
              gt: expect.any(Date),
            },
          }),
        }),
      );
    });

    it('deve lançar ForbiddenException quando status não é ACTIVE', async () => {
      // mock: nenhuma assinatura ativa encontrada
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      // executa e espera exceção
      await expect(service.validateUserPlan(userId, planId)).rejects.toThrow(
        ForbiddenException,
      );

      // verifica se a query incluiu filtro de status ACTIVE
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('deve passar quando usuário possui plano ativo e válido (sucesso)', async () => {
      // mock: assinatura ativa e válida
      const mockSubscription = {
        id: 1,
        userId: userId,
        planId: planId,
        status: 'ACTIVE',
        startedAt: new Date('2024-01-01'),
        expiresAt: new Date('2025-12-31'), // válido até fim de 2025
        plan: {
          id: planId,
          nome: 'Investor Pro',
          slug: 'investor_pro',
          preco: 299.9,
        },
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(
        mockSubscription,
      );

      // executa e não deve lançar exceção
      await expect(
        service.validateUserPlan(userId, planId),
      ).resolves.not.toThrow();

      // verifica se chamou o prisma
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledTimes(1);
    });

    it('deve validar com planId diferente', async () => {
      const differentId: number = 2;

      // mock: assinatura ativa para outro plano
      const mockSubscription = {
        id: 2,
        userId: userId,
        planId: differentId,
        status: 'ACTIVE',
        startedAt: new Date('2024-01-01'),
        expiresAt: new Date('2025-12-31'),
        plan: {
          id: differentId,
          nome: 'Basic Plan',
          slug: 'basic_plan',
          preco: 99.9,
        },
      };

      mockPrismaService.subscription.findFirst.mockResolvedValue(
        mockSubscription,
      );

      // executa e não deve lançar exceção
      await expect(
        service.validateUserPlan(userId, differentId),
      ).resolves.not.toThrow();

      // verifica se chamou com o planId correto
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            planId: differentId,
          }),
        }),
      );
    });

    it('deve lançar ForbiddenException quando plano expira hoje (edge case)', async () => {
      // mock: plano que expira exatamente agora não será retornado (gt = greater than)
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);

      // executa e espera exceção
      await expect(service.validateUserPlan(userId, planId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('create — regra anti-duplicata (CASE.md §Planos)', () => {
    const userId = 1;
    const planId = 10;
    const otherPlanId = 20;

    it('deve bloquear (409) quando já existe Subscription ACTIVE para o mesmo userId+planId', async () => {
      // arrange — assinatura ATIVA duplicada para o mesmo plano
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 99,
        userId,
        planId,
        status: 'ACTIVE',
      });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: planId,
        periodoMeses: 12,
      });

      // act + assert — espera ConflictException
      await expect(
        service.create({
          userId,
          planId,
          status: 'PENDING' as any,
        }),
      ).rejects.toThrow(ConflictException);

      // garante que NÃO chamou create do Prisma (não persistiu nada)
      expect(mockPrismaService.subscription.create).not.toHaveBeenCalled();
    });

    it('deve gravar audit log SUBSCRIPTION_DUPLICATE_BLOCKED quando bloqueia', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue({
        id: 99,
        userId,
        planId,
        status: 'ACTIVE',
      });
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: planId,
        periodoMeses: 12,
      });

      await expect(
        service.create({
          userId,
          planId,
          status: 'PENDING' as any,
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'SUBSCRIPTION_DUPLICATE_BLOCKED',
          entity: 'Subscription',
          entityId: 99,
        }),
      );
    });

    it('deve PERMITIR compra quando usuário já tem plano DIFERENTE ativo', async () => {
      // arrange — assinatura ATIVA para OUTRO plano
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: planId,
        periodoMeses: 12,
      });
      mockPrismaService.subscription.create.mockResolvedValue({
        id: 1,
        userId,
        planId,
        status: 'PENDING',
      });

      // act — chama create para o planId atual, usuário tem otherPlanId ativo (não bloqueia)
      await service.create({
        userId,
        planId,
        status: 'PENDING' as any,
      });

      // assert — criou normalmente
      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            planId,
          }),
        }),
      );
      // sanity: o findFirst usou o planId certo (não otherPlanId)
      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          planId,
          status: 'ACTIVE',
        },
      });
      void otherPlanId;
    });

    it('deve PERMITIR nova compra quando assinatura anterior está CANCELED/EXPIRED', async () => {
      // arrange — findFirst retorna null porque filtra status=ACTIVE
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.plan.findUnique.mockResolvedValue({
        id: planId,
        periodoMeses: 12,
      });
      mockPrismaService.subscription.create.mockResolvedValue({
        id: 2,
        userId,
        planId,
        status: 'PENDING',
      });

      await expect(
        service.create({
          userId,
          planId,
          status: 'PENDING' as any,
        }),
      ).resolves.toBeDefined();

      expect(mockPrismaService.subscription.create).toHaveBeenCalled();
    });
  });

  describe('handlePaymentConfirmed (listener — notificação)', () => {
    const basePayment = {
      id: 1,
      userId: 1,
      purpose: 'SUBSCRIPTION',
      status: 'PAID',
      amount: '299.90',
      subscriptionId: 10,
      investmentId: null,
      campaignId: null,
      endToEndId: 'e2e-123',
      txid: 'tx-456',
      paidAt: new Date(),
    };

    beforeEach(() => jest.clearAllMocks());

    // A ativação da Subscription foi movida para PaymentService.
    // processPaymentEffects (fonte única, transacional). Este listener
    // agora é apenas notificação/observabilidade e NÃO escreve no banco.
    it('não ativa subscription (ativação é do PaymentService)', () => {
      service.handlePaymentConfirmed({ paymentId: 1, payment: basePayment });
      expect(mockPrismaService.subscription.update).not.toHaveBeenCalled();
      expect(mockPrismaService.subscription.findUnique).not.toHaveBeenCalled();
    });

    it('é resiliente a payload sem payment', () => {
      expect(() =>
        service.handlePaymentConfirmed({ paymentId: 1 } as any),
      ).not.toThrow();
      expect(mockPrismaService.subscription.update).not.toHaveBeenCalled();
    });
  });

  describe('findHistoryByUser — perfil /plans (CASE.md §Planos)', () => {
    const userId = 7;

    it('retorna todas as subscriptions do usuario com plan + payments ordenadas por createdAt desc', async () => {
      // arrange
      const mockSubs = [
        {
          id: 12,
          userId,
          planId: 3,
          status: 'ACTIVE',
          startedAt: new Date('2026-02-20'),
          expiresAt: new Date('2027-02-20'),
          createdAt: new Date('2026-02-20'),
          updatedAt: new Date('2026-02-20'),
          plan: {
            id: 3,
            nome: 'Investidor',
            slug: 'plano-investidor',
            preco: '50.00',
            periodo: 'Mensal',
            periodoMeses: 1,
            beneficios: ['Dashboard', 'Reports'],
          },
          payments: [
            {
              id: 99,
              amount: '50.00',
              method: 'PIX',
              status: 'PAID',
              paidAt: new Date('2026-02-20'),
              txid: 'tx-abc',
            },
          ],
        },
      ];
      mockPrismaService.subscription.findMany.mockResolvedValue(mockSubs);

      // act
      const result = await service.findHistoryByUser(userId);

      // assert
      expect(result).toEqual(mockSubs);
      expect(mockPrismaService.subscription.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          plan: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('retorna array vazio quando o usuario nunca teve subscription', async () => {
      mockPrismaService.subscription.findMany.mockResolvedValue([]);
      const result = await service.findHistoryByUser(userId);
      expect(result).toEqual([]);
    });
  });

  describe('cancelOwn — sincronização da sessão Redis', () => {
    const userId = 7;
    const subscriptionId = 12;
    const plan = { id: 3, nome: 'Investidor', slug: 'investidor' };
    const freshSubscription = {
      id: subscriptionId,
      userId,
      planId: plan.id,
      status: 'CANCELED',
      startedAt: new Date('2026-02-20'),
      expiresAt: new Date('2026-09-06'),
      createdAt: new Date('2026-02-20'),
      updatedAt: new Date('2026-09-06'),
      plan,
    };

    beforeEach(() => {
      mockSessionService.refreshUserSubscriptions.mockResolvedValue(1);
      mockPrismaService.subscription.findMany.mockResolvedValue([
        freshSubscription,
      ]);
      mockPrismaService.subscription.update.mockResolvedValue(
        freshSubscription,
      );
    });

    it('atualiza Prisma, auditoria e todas as sessões Redis ao cancelar', async () => {
      const currentSubscription = {
        ...freshSubscription,
        status: 'ACTIVE',
        expiresAt: new Date('2027-02-20'),
      };
      mockPrismaService.subscription.findUnique.mockResolvedValue(
        currentSubscription,
      );

      await service.cancelOwn(subscriptionId, userId);

      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: subscriptionId },
        data: {
          status: 'CANCELED',
          expiresAt: expect.any(Date),
        },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          action: 'SUBSCRIPTION_USER_CANCEL',
          entityId: subscriptionId,
        }),
      );
      expect(mockPrismaService.subscription.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { plan: { select: { id: true, nome: true, slug: true } } },
        take: 20,
      });
      expect(mockSessionService.refreshUserSubscriptions).toHaveBeenCalledWith(
        userId,
        [
          expect.objectContaining({
            id: subscriptionId,
            userId,
            planId: plan.id,
            status: 'CANCELED',
            plan,
          }),
        ],
      );
    });

    it('não atualiza Prisma nem Redis quando a assinatura pertence a outro usuário', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        ...freshSubscription,
        userId: 99,
        status: 'ACTIVE',
      });

      await expect(service.cancelOwn(subscriptionId, userId)).rejects.toThrow(
        'Acesso negado',
      );

      expect(mockPrismaService.subscription.update).not.toHaveBeenCalled();
      expect(mockPrismaService.subscription.findMany).not.toHaveBeenCalled();
      expect(
        mockSessionService.refreshUserSubscriptions,
      ).not.toHaveBeenCalled();
    });

    it('repara o Redis quando a assinatura já está CANCELED', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(
        freshSubscription,
      );

      await service.cancelOwn(subscriptionId, userId);

      expect(mockPrismaService.subscription.update).not.toHaveBeenCalled();
      expect(mockSessionService.refreshUserSubscriptions).toHaveBeenCalledWith(
        userId,
        [expect.objectContaining({ id: subscriptionId, status: 'CANCELED' })],
      );
    });

    it('mantém o cancelamento bem-sucedido se o Redis falhar', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        ...freshSubscription,
        status: 'ACTIVE',
      });
      mockSessionService.refreshUserSubscriptions.mockRejectedValue(
        new Error('Redis indisponível'),
      );

      await expect(service.cancelOwn(subscriptionId, userId)).resolves.toEqual(
        expect.objectContaining({ error: false }),
      );

      expect(mockPrismaService.subscription.update).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalled();
    });
  });

  describe('isolamento por usuário', () => {
    it('ignora o userId enviado no body e usa o usuário da sessão', async () => {
      mockPrismaService.subscription.findFirst.mockResolvedValue(null);
      mockPrismaService.plan.findUnique.mockResolvedValue({ periodoMeses: 1 });
      mockPrismaService.subscription.create.mockResolvedValue({ id: 50 });

      await service.create(
        { userId: 999, planId: 10, status: 'PENDING' } as any,
        7,
      );

      expect(mockPrismaService.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId: 7, planId: 10, status: 'ACTIVE' },
      });
      expect(mockPrismaService.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 7 }),
        }),
      );
    });

    it('filtra a listagem pela sessão autenticada', async () => {
      mockPrismaService.subscription.findMany.mockResolvedValue([]);
      mockPrismaService.subscription.count.mockResolvedValue(0);

      await service.findAll({ page: 1, limit: 10 }, 7);

      expect(mockPrismaService.subscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 7 } }),
      );
      expect(mockPrismaService.subscription.count).toHaveBeenCalledWith({
        where: { userId: 7 },
      });
    });

    it('retorna 404 e não remove assinatura de outra conta', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 50,
        userId: 8,
      });

      const result = await service.remove(50, 7);

      expect(result).toEqual(expect.objectContaining({ codigo: 404 }));
      expect(mockPrismaService.subscription.delete).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentCancelled (listener)', () => {
    const basePayment = {
      id: 1,
      userId: 1,
      purpose: 'SUBSCRIPTION',
      status: 'CANCELED',
      amount: '299.90',
      subscriptionId: 10,
      investmentId: null,
      campaignId: null,
      endToEndId: 'e2e-123',
      txid: 'tx-456',
      paidAt: null,
    };

    beforeEach(() => jest.clearAllMocks());

    it('deve ignorar se purpose !== SUBSCRIPTION', async () => {
      await service.handlePaymentCancelled({
        paymentId: 1,
        payment: { ...basePayment, purpose: 'INVESTMENT' },
        reason: 'test',
      });
      expect(mockPrismaService.subscription.findUnique).not.toHaveBeenCalled();
    });

    it('deve ignorar se subscriptionId eh null', async () => {
      await service.handlePaymentCancelled({
        paymentId: 1,
        payment: { ...basePayment, subscriptionId: null },
        reason: 'test',
      });
      expect(mockPrismaService.subscription.findUnique).not.toHaveBeenCalled();
    });

    it('deve ignorar se subscription nao encontrada', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue(null);
      await service.handlePaymentCancelled({
        paymentId: 1,
        payment: basePayment,
        reason: 'test',
      });
      expect(mockPrismaService.subscription.update).not.toHaveBeenCalled();
    });

    it('deve ignorar se subscription ja esta CANCELED (idempotente)', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 10,
        status: 'CANCELED',
      });
      await service.handlePaymentCancelled({
        paymentId: 1,
        payment: basePayment,
        reason: 'test',
      });
      expect(mockPrismaService.subscription.update).not.toHaveBeenCalled();
    });

    it('deve cancelar subscription com status ACTIVE', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 10,
        status: 'ACTIVE',
      });
      mockPrismaService.subscription.update.mockResolvedValue({});

      await service.handlePaymentCancelled({
        paymentId: 1,
        payment: basePayment,
        reason: 'Cancelado por admin',
      });

      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'CANCELED' },
      });
    });

    it('deve cancelar subscription com status PENDING', async () => {
      mockPrismaService.subscription.findUnique.mockResolvedValue({
        id: 10,
        status: 'PENDING',
      });
      mockPrismaService.subscription.update.mockResolvedValue({});

      await service.handlePaymentCancelled({
        paymentId: 1,
        payment: basePayment,
        reason: 'C6 CHECKOUT CANCELLED',
      });

      expect(mockPrismaService.subscription.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'CANCELED' },
      });
    });
  });
});
