import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsGateway } from './notifications.gateway';
import { SessionService } from 'src/auth/session/session.service';

describe('NotificationsGateway', () => {
  const mockSessionService = {
    getSession: jest.fn(),
  } as unknown as SessionService;

  // Mock mínimo do EventEmitter2 — usado apenas para satisfazer o DI.
  // Os métodos @OnEvent registram listeners no gateway via decorator,
  // mas em runtime esses listeners são invocados manualmente nos testes
  // (ver describe('payment event relay') abaixo).
  const mockEventEmitter = {} as unknown as EventEmitter2;

  const buildSocket = (
    cookieHeader: string | undefined,
    socketId = 'sock-1',
  ): any => {
    const join = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn();
    return {
      id: socketId,
      handshake: {
        headers: { cookie: cookieHeader ?? '' },
      },
      data: {},
      join,
      disconnect,
    };
  };

  let gateway: NotificationsGateway;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: SessionService, useValue: mockSessionService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();
    gateway = moduleRef.get(NotificationsGateway);
    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
    } as any;
  });

  describe('handleConnection', () => {
    it('disconnecta quando não há cookie', async () => {
      const socket = buildSocket('');
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('disconnecta quando cookie não tem session_id', async () => {
      const socket = buildSocket('foo=bar; baz=qux');
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnecta quando sessão não existe no Redis', async () => {
      (mockSessionService.getSession as jest.Mock).mockResolvedValue(null);
      const socket = buildSocket('session_id=abc');
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnecta quando usuário está inativo', async () => {
      (mockSessionService.getSession as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'USER',
        isActive: false,
        af2Verified: true,
      });
      const socket = buildSocket('session_id=abc');
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnecta USER sem af2Verified', async () => {
      (mockSessionService.getSession as jest.Mock).mockResolvedValue({
        id: 1,
        role: 'USER',
        isActive: true,
        af2Verified: false,
      });
      const socket = buildSocket('session_id=abc');
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('aceita ADMIN sem af2Verified (bypass 2FA)', async () => {
      (mockSessionService.getSession as jest.Mock).mockResolvedValue({
        id: 7,
        role: 'ADMIN',
        isActive: true,
        af2Verified: false,
      });
      const socket = buildSocket('session_id=abc');
      await gateway.handleConnection(socket);
      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith('user:7');
      expect(socket.data.user).toEqual({ id: 7, role: 'ADMIN' });
    });

    it('aceita USER com af2Verified', async () => {
      (mockSessionService.getSession as jest.Mock).mockResolvedValue({
        id: 42,
        role: 'USER',
        isActive: true,
        af2Verified: true,
        lastAccessAt: new Date().toISOString(),
      });
      const socket = buildSocket('session_id=abc');
      await gateway.handleConnection(socket);
      expect(socket.join).toHaveBeenCalledWith('user:42');
    });

    it('disconnecta USER com lastAccessAt > 7 dias', async () => {
      const old = new Date();
      old.setDate(old.getDate() - 8);
      (mockSessionService.getSession as jest.Mock).mockResolvedValue({
        id: 42,
        role: 'USER',
        isActive: true,
        af2Verified: true,
        lastAccessAt: old.toISOString(),
      });
      const socket = buildSocket('session_id=abc');
      await gateway.handleConnection(socket);
      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('emitToUser', () => {
    it('mira a sala user:{userId}', () => {
      const to = jest.fn().mockReturnValue({ emit: jest.fn() });
      gateway.server = { to } as any;
      gateway.emitToUser(99, 'notification', { id: 1 });
      expect(to).toHaveBeenCalledWith('user:99');
    });

    it('engole exceção do adapter (best-effort)', () => {
      gateway.server = {
        to: () => {
          throw new Error('redis down');
        },
      } as any;
      expect(() =>
        gateway.emitToUser(1, 'notification', { id: 1 }),
      ).not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('log-only quando socket tem user anexado', () => {
      const socket = buildSocket('session_id=abc');
      socket.data.user = { id: 1, role: 'USER' };
      expect(() => gateway.handleDisconnect(socket)).not.toThrow();
    });

    it('log-only silencioso quando socket.data.user ausente', () => {
      const socket = buildSocket('session_id=abc');
      expect(() => gateway.handleDisconnect(socket)).not.toThrow();
    });

    it('remove socket do userSockets Map', async () => {
      (mockSessionService.getSession as jest.Mock).mockResolvedValue({
        id: 5,
        role: 'USER',
        isActive: true,
        af2Verified: true,
        lastAccessAt: new Date().toISOString(),
      });
      const serverSockets = new Map<string, any>();
      const to = jest.fn().mockReturnValue({ emit: jest.fn() });
      gateway.server = {
        to,
        sockets: { sockets: serverSockets },
      } as any;

      const sockA = buildSocket('session_id=abc', 'sa');
      await gateway.handleConnection(sockA);
      expect(sockA.join).toHaveBeenCalledWith('user:5');

      gateway.handleDisconnect(sockA);

      // Reconectar deve entrar direto sem rate limit
      const sockB = buildSocket('session_id=abc', 'sb');
      await gateway.handleConnection(sockB);
      expect(sockB.disconnect).not.toHaveBeenCalledWith(true);
    });
  });

  describe('rate limit por userId', () => {
    it('derruba socket mais antigo ao exceder MAX_CONNECTIONS_PER_USER', async () => {
      (mockSessionService.getSession as jest.Mock).mockResolvedValue({
        id: 9,
        role: 'USER',
        isActive: true,
        af2Verified: true,
        lastAccessAt: new Date().toISOString(),
      });
      const serverSockets = new Map<string, any>();
      const to = jest.fn().mockReturnValue({ emit: jest.fn() });
      gateway.server = {
        to,
        sockets: { sockets: serverSockets },
      } as any;

      const sockA = buildSocket('session_id=abc', 'sa');
      const sockB = buildSocket('session_id=abc', 'sb');
      const sockC = buildSocket('session_id=abc', 'sc');
      const sockD = buildSocket('session_id=abc', 'sd');
      const sockE = buildSocket('session_id=abc', 'se');
      const sockF = buildSocket('session_id=abc', 'sf');

      const oldestDisconnect = jest.fn();
      serverSockets.set('sa', { disconnect: oldestDisconnect });

      for (const s of [sockA, sockB, sockC, sockD, sockE, sockF]) {
        await gateway.handleConnection(s);
      }
      expect(oldestDisconnect).toHaveBeenCalledWith(true);
    });
  });

  // Sprint S34-c — relay de payment.confirmed/payment.cancelled para a
  // sala user:{userId} via emitToUser. O frontend usa isso para
  // invalidar [me] no TanStack Query e refletir o plano recém-ativado
  // imediatamente (sem esperar staleTime).
  describe('payment event relay', () => {
    it('emite payment.confirmed para a sala do user com payload mínimo', () => {
      const to = jest.fn().mockReturnValue({ emit: jest.fn() });
      gateway.server = { to } as any;
      const emitSpy = jest.fn();
      to.mockReturnValue({ emit: emitSpy });

      gateway.onPaymentConfirmed({
        paymentId: 42,
        payment: {
          id: 42,
          userId: 7,
          purpose: 'SUBSCRIPTION',
          status: 'PAID',
          amount: '100.00',
          subscriptionId: 99,
          investmentId: null,
          campaignId: null,
          endToEndId: 'e2e-1',
          txid: 'tx-1',
          paidAt: new Date('2026-09-30T00:00:00Z'),
        },
      });

      expect(to).toHaveBeenCalledWith('user:7');
      expect(emitSpy).toHaveBeenCalledWith('payment.confirmed', {
        paymentId: 42,
        purpose: 'SUBSCRIPTION',
        subscriptionId: 99,
        investmentId: null,
      });
    });

    it('NÃO inclui PII do user no payload (LGPD)', () => {
      const to = jest.fn().mockReturnValue({ emit: jest.fn() });
      gateway.server = { to } as any;

      gateway.onPaymentConfirmed({
        paymentId: 1,
        payment: {
          id: 1,
          userId: 99,
          purpose: 'INVESTMENT',
          status: 'PAID',
          amount: '500.00',
          subscriptionId: null,
          investmentId: 555,
          campaignId: 10,
          endToEndId: null,
          txid: null,
          paidAt: null,
        },
      });

      const call = (to as jest.Mock).mock.results[0].value.emit as jest.Mock;
      const payload = call.mock.calls[0][1];
      // Garante que NÃO há campos sensíveis (email, cpf, nome, etc).
      expect(payload).not.toHaveProperty('userId');
      expect(payload).not.toHaveProperty('amount');
      expect(payload).not.toHaveProperty('endToEndId');
      expect(payload).not.toHaveProperty('txid');
      expect(payload).toEqual({
        paymentId: 1,
        purpose: 'INVESTMENT',
        subscriptionId: null,
        investmentId: 555,
      });
    });

    it('emite payment.cancelled com payload mínimo', () => {
      const to = jest.fn().mockReturnValue({ emit: jest.fn() });
      gateway.server = { to } as any;
      const emitSpy = jest.fn();
      to.mockReturnValue({ emit: emitSpy });

      gateway.onPaymentCancelled({
        paymentId: 12,
        payment: {
          id: 12,
          userId: 33,
          purpose: 'SUBSCRIPTION',
          status: 'CANCELED',
          amount: '0',
          subscriptionId: 88,
          investmentId: null,
          campaignId: null,
          endToEndId: null,
          txid: 'tx-2',
          paidAt: null,
        },
      });

      expect(to).toHaveBeenCalledWith('user:33');
      expect(emitSpy).toHaveBeenCalledWith('payment.cancelled', {
        paymentId: 12,
        purpose: 'SUBSCRIPTION',
      });
    });

    it('emitToUser não propaga erro (best-effort)', () => {
      const to = jest.fn().mockImplementation(() => {
        throw new Error('WS down');
      });
      gateway.server = { to } as any;

      expect(() =>
        gateway.onPaymentConfirmed({
          paymentId: 1,
          payment: {
            id: 1,
            userId: 1,
            purpose: 'SUBSCRIPTION',
            status: 'PAID',
            amount: '0',
            subscriptionId: null,
            investmentId: null,
            campaignId: null,
            endToEndId: null,
            txid: null,
            paidAt: null,
          },
        }),
      ).not.toThrow();
    });
  });

  // Realtime multi-conector — relay de kyc.user.decided para a sala
  // user:{userId} via emitToUser. O frontend usa isso para invalidar
  // [me] + queries de KYC no TanStack Query e refletir a decisão de
  // compliance imediatamente (sem reload da página).
  describe('kyc event relay', () => {
    it('emite kyc.decided para a sala do user com payload mínimo', () => {
      const to = jest.fn();
      const emitSpy = jest.fn();
      to.mockReturnValue({ emit: emitSpy });
      gateway.server = { to } as any;

      gateway.onKycDecided({
        userId: 7,
        decision: 'APPROVED',
        kycStatus: 'APPROVED',
      });

      expect(to).toHaveBeenCalledWith('user:7');
      expect(emitSpy).toHaveBeenCalledWith('kyc.decided', {
        decision: 'APPROVED',
        kycStatus: 'APPROVED',
      });
    });

    it('emite kyc.decided para REJECTED', () => {
      const to = jest.fn();
      const emitSpy = jest.fn();
      to.mockReturnValue({ emit: emitSpy });
      gateway.server = { to } as any;

      gateway.onKycDecided({
        userId: 33,
        decision: 'REJECTED',
        kycStatus: 'REJECTED',
      });

      expect(to).toHaveBeenCalledWith('user:33');
      expect(emitSpy).toHaveBeenCalledWith('kyc.decided', {
        decision: 'REJECTED',
        kycStatus: 'REJECTED',
      });
    });

    it('NÃO inclui PII do user no payload (LGPD)', () => {
      const to = jest.fn();
      const emitSpy = jest.fn();
      to.mockReturnValue({ emit: emitSpy });
      gateway.server = { to } as any;

      gateway.onKycDecided({
        userId: 99,
        decision: 'APPROVED',
        kycStatus: 'APPROVED',
      });

      const payload = emitSpy.mock.calls[0][1];
      expect(payload).not.toHaveProperty('userId');
      expect(payload).not.toHaveProperty('email');
      expect(payload).not.toHaveProperty('cpf');
      expect(payload).not.toHaveProperty('nome');
      expect(payload).toEqual({
        decision: 'APPROVED',
        kycStatus: 'APPROVED',
      });
    });

    it('não propaga erro quando o adapter falha (best-effort)', () => {
      gateway.server = {
        to: () => {
          throw new Error('WS down');
        },
      } as any;

      expect(() =>
        gateway.onKycDecided({
          userId: 1,
          decision: 'APPROVED',
          kycStatus: 'APPROVED',
        }),
      ).not.toThrow();
    });
  });
});
