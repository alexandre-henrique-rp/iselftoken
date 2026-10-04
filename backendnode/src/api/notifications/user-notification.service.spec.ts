import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EmailQueuePublisher } from 'src/messaging/email-queue.publisher';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { UserNotificationService } from './user-notification.service';

/**
 * Unit tests para UserNotificationService.
 *
 * Cobertura dos 6 listeners:
 *  - onTokenPurchaseConfirmed: INVESTMENT confirmado
 *  - onPlanPaymentConfirmed (SUBSCRIPTION): 1ª assinatura vs adicional
 *  - onUserActivated / onUserSuspended
 *  - onKycApproved (kyc.user.decided)
 *
 * Cada um deve: (a) criar in-app PRIMEIRO; (b) enfileirar e-mail DEPOIS.
 */
describe('UserNotificationService', () => {
  let service: UserNotificationService;
  let prisma: any;
  let notifications: jest.Mocked<Pick<NotificationsService, 'create'>>;
  let emailQueue: jest.Mocked<Pick<EmailQueuePublisher, 'publishSend'>>;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      investment: { findUnique: jest.fn() },
      subscription: {
        findUnique: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      startup: { findUnique: jest.fn() },
    };
    notifications = { create: jest.fn() } as any;
    emailQueue = { publishSend: jest.fn() } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserNotificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: EmailQueuePublisher, useValue: emailQueue },
      ],
    }).compile();

    service = moduleRef.get(UserNotificationService);
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─── onTokenPurchaseConfirmed ─────────────────────────────────

  describe('onTokenPurchaseConfirmed', () => {
    const event = {
      paymentId: 1,
      payment: {
        id: 1,
        userId: 10,
        purpose: 'INVESTMENT',
        amount: '100.00',
        investmentId: 100,
        campaignId: 5,
        subscriptionId: null,
        endToEndId: null,
        txid: null,
        paidAt: new Date(),
        status: 'PAID',
      },
    };

    it('cria in-app e enfileira e-mail para compra de tokens', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 10,
        nome: 'Maria',
        email: 'maria@test.com',
      });
      prisma.investment.findUnique.mockResolvedValueOnce({
        tokensQty: 50,
        amount: 1000,
        campaign: {
          id: 5,
          title: 'Rodada Semente 2026',
          startup: { id: 1, nome: 'Acme Tech' },
        },
      });
      notifications.create.mockResolvedValueOnce({} as any);
      emailQueue.publishSend.mockResolvedValueOnce(true);

      await service.onTokenPurchaseConfirmed(event);

      expect(notifications.create).toHaveBeenCalledWith(
        10,
        'Compra de tokens confirmada',
        expect.stringContaining('Acme Tech'),
        'token_purchased',
      );
      expect(emailQueue.publishSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'maria@test.com',
          slug: 'compra-tokens',
          ctx: expect.objectContaining({
            startupName: 'Acme Tech',
            quantity: 50,
          }),
        }),
      );
    });

    it('ignora pagamento que não é INVESTMENT', async () => {
      await service.onTokenPurchaseConfirmed({
        ...event,
        payment: { ...event.payment, purpose: 'SUBSCRIPTION' },
      });
      expect(notifications.create).not.toHaveBeenCalled();
      expect(emailQueue.publishSend).not.toHaveBeenCalled();
    });

    it('não quebra quando user não é encontrado', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null);
      prisma.investment.findUnique.mockResolvedValueOnce({} as any);
      await service.onTokenPurchaseConfirmed(event);
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  // ─── onPlanPaymentConfirmed (SUBSCRIPTION) ────────────────────

  describe('onPlanPaymentConfirmed', () => {
    const event = {
      paymentId: 1,
      payment: {
        id: 1,
        userId: 10,
        purpose: 'SUBSCRIPTION',
        subscriptionId: 200,
      },
    };

    it('cria in-app "Novo perfil ativado" + email plan-purchased quando é 1ª assinatura', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 10,
        nome: 'João',
        email: 'joao@test.com',
      });
      prisma.subscription.findUnique.mockResolvedValueOnce({
        id: 200,
        status: 'ACTIVE',
        plan: { id: 1, nome: 'Investidor Pro', slug: 'plano-investidor' },
      });
      prisma.subscription.count.mockResolvedValueOnce(0); // nenhuma outra ACTIVE
      notifications.create.mockResolvedValueOnce({} as any);
      emailQueue.publishSend.mockResolvedValueOnce(true);

      await service.onPlanPaymentConfirmed(event);

      expect(notifications.create).toHaveBeenCalledWith(
        10,
        'Novo perfil ativado',
        expect.stringContaining('Investidor Pro'),
        'plan_purchased',
      );
      expect(emailQueue.publishSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@test.com',
          slug: 'plan-purchased',
        }),
      );
    });

    it('cria in-app "Perfil adicional ativado" + email plan-added quando já tem outra ACTIVE', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 10,
        nome: 'João',
        email: 'joao@test.com',
      });
      prisma.subscription.findUnique.mockResolvedValueOnce({
        id: 200,
        status: 'ACTIVE',
        plan: { id: 1, nome: 'Fundador', slug: 'plano-fundador' },
      });
      prisma.subscription.count.mockResolvedValueOnce(1); // 1 outra ACTIVE
      prisma.subscription.findFirst.mockResolvedValueOnce({
        plan: { nome: 'Investidor Pro' },
      });
      notifications.create.mockResolvedValueOnce({} as any);
      emailQueue.publishSend.mockResolvedValueOnce(true);

      await service.onPlanPaymentConfirmed(event);

      expect(notifications.create).toHaveBeenCalledWith(
        10,
        'Perfil adicional ativado',
        expect.stringContaining('anterior'),
        'plan_added',
      );
      expect(emailQueue.publishSend).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'plan-added',
          ctx: expect.objectContaining({
            planName: 'Fundador',
            previousPlanName: 'Investidor Pro',
            totalActiveProfiles: 2,
          }),
        }),
      );
    });

    it('ignora pagamento que não é SUBSCRIPTION', async () => {
      await service.onPlanPaymentConfirmed({
        ...event,
        payment: { ...event.payment, purpose: 'INVESTMENT' },
      });
      expect(notifications.create).not.toHaveBeenCalled();
    });
  });

  // ─── onUserActivated / onUserSuspended ───────────────────────

  describe('onUserActivated', () => {
    it('cria in-app + e-mail user-approved', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 10,
        nome: 'João',
        email: 'joao@test.com',
      });
      notifications.create.mockResolvedValueOnce({} as any);
      emailQueue.publishSend.mockResolvedValueOnce(true);

      await service.onUserActivated({ userId: 10 });

      expect(notifications.create).toHaveBeenCalledWith(
        10,
        'Conta aprovada',
        expect.any(String),
        'user_approved',
      );
      expect(emailQueue.publishSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'joao@test.com',
          slug: 'user-approved',
        }),
      );
    });
  });

  describe('onUserSuspended', () => {
    it('cria in-app + e-mail user-suspended com motivo', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 10,
        nome: 'João',
        email: 'joao@test.com',
      });
      notifications.create.mockResolvedValueOnce({} as any);
      emailQueue.publishSend.mockResolvedValueOnce(true);

      await service.onUserSuspended({
        userId: 10,
        reason: 'documentos expirados',
      });

      expect(notifications.create).toHaveBeenCalledWith(
        10,
        'Conta suspensa',
        expect.stringContaining('documentos expirados'),
        'user_suspended',
      );
      expect(emailQueue.publishSend).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'user-suspended',
          ctx: expect.objectContaining({ reason: 'documentos expirados' }),
        }),
      );
    });
  });

  // ─── onKycApproved ────────────────────────────────────────────

  describe('onKycApproved', () => {
    it('cria in-app + e-mail kyc-approved quando decision=APPROVED', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 10,
        nome: 'João',
        email: 'joao@test.com',
      });
      notifications.create.mockResolvedValueOnce({} as any);
      emailQueue.publishSend.mockResolvedValueOnce(true);

      await service.onKycApproved({
        userId: 10,
        decision: 'APPROVED',
        kycStatus: 'APPROVED',
      });

      expect(notifications.create).toHaveBeenCalledWith(
        10,
        'KYC aprovado',
        expect.any(String),
        'kyc_approved',
      );
      expect(emailQueue.publishSend).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'kyc-approved',
        }),
      );
    });

    it('ignora quando decision não é APPROVED', async () => {
      await service.onKycApproved({
        userId: 10,
        decision: 'REJECTED',
        kycStatus: 'REJECTED',
      });
      expect(notifications.create).not.toHaveBeenCalled();
      expect(emailQueue.publishSend).not.toHaveBeenCalled();
    });
  });

  // ─── Regra de ORDEM: in-app ANTES de email ───────────────────

  it('garante a ordem: in-app criado ANTES do e-mail enfileirado', async () => {
    const order: string[] = [];
    notifications.create.mockImplementationOnce(async () => {
      order.push('in-app');
      return {} as any;
    });
    emailQueue.publishSend.mockImplementationOnce(async () => {
      order.push('email');
      return true;
    });

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 10,
      nome: 'João',
      email: 'joao@test.com',
    });
    prisma.subscription.findUnique.mockResolvedValueOnce({
      id: 200,
      status: 'ACTIVE',
      plan: { id: 1, nome: 'Investidor', slug: 'plano-investidor' },
    });
    prisma.subscription.count.mockResolvedValueOnce(0);

    await service.onPlanPaymentConfirmed({
      paymentId: 1,
      payment: {
        id: 1,
        userId: 10,
        purpose: 'SUBSCRIPTION',
        subscriptionId: 200,
      },
    });

    expect(order).toEqual(['in-app', 'email']);
  });
});
