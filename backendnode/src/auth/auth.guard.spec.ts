import { UnauthorizedException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CookiesService } from './cookies/cookies.service';
import { SessionService } from './session/session.service';
import { Reflector } from '@nestjs/core';

describe('AuthGuard', () => {
  const buildCtx = (req: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
      getHandler: () => () => undefined,
      getClass: () => class {},
    }) as unknown as ExecutionContext;

  const mockCookies = {
    getSessionId: jest.fn(),
  } as unknown as CookiesService;

  const mockSession = {
    getSession: jest.fn(),
    updateSession: jest.fn(),
    getRevocationTimestamp: jest.fn().mockResolvedValue(null),
  } as unknown as SessionService;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  let guard: AuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AuthGuard(mockCookies, mockSession, mockReflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('deve lançar UnauthorizedException quando não há sessionId no cookie', async () => {
    (mockCookies.getSessionId as jest.Mock).mockReturnValue(null);
    await expect(guard.canActivate(buildCtx({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve lançar UnauthorizedException quando sessão não existe no Redis', async () => {
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue(null);
    await expect(guard.canActivate(buildCtx({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve lançar UnauthorizedException quando usuário está inativo', async () => {
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 1,
      role: 'USER',
      isActive: false,
      af2Verified: true,
      lastAccessAt: new Date().toISOString(),
    });
    await expect(guard.canActivate(buildCtx({}))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve lançar UnauthorizedException com redirect /2fa quando usuário não é admin e não tem af2Verified', async () => {
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 1,
      role: 'USER',
      isActive: true,
      af2Verified: false,
      lastAccessAt: new Date().toISOString(),
    });
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    try {
      await guard.canActivate(buildCtx({}));
      fail('Deveria ter lançado UnauthorizedException');
    } catch (err: any) {
      expect(err).toBeInstanceOf(UnauthorizedException);
      const body = err.getResponse();
      expect(body.redirect).toBe('/2fa');
      expect(body.codigo).toBe(401);
    }
  });

  it('deve liberar acesso para ADMIN mesmo sem af2Verified', async () => {
    const req = {} as any;
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 1,
      role: 'ADMIN',
      isActive: true,
      af2Verified: false,
      lastAccessAt: new Date().toISOString(),
    });
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    const ok = await guard.canActivate(buildCtx(req));
    expect(ok).toBe(true);
    expect(req.user.id).toBe(1);
  });

  it('deve liberar acesso para FINANCEIRO/COMPLIANCE sem af2Verified', async () => {
    const req = {} as any;
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 2,
      role: 'FINANCEIRO',
      isActive: true,
      af2Verified: false,
      lastAccessAt: new Date().toISOString(),
    });
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    const ok = await guard.canActivate(buildCtx(req));
    expect(ok).toBe(true);
  });

  it('deve lançar redirect /2fa quando lastAccessAt > 7 dias e não é admin', async () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 1,
      role: 'USER',
      isActive: true,
      af2Verified: true,
      lastAccessAt: old.toISOString(),
    });
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    try {
      await guard.canActivate(buildCtx({}));
      fail('Deveria ter lançado');
    } catch (err: any) {
      const body = err.getResponse();
      expect(body.redirect).toBe('/2fa');
      expect(body.message).toContain('expirado');
    }
  });

  it('deve lançar "Acesso expirado" quando af2Verified=true e lastAccessAt > 7 dias (comportamento atual)', async () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 1,
      role: 'USER',
      isActive: true,
      af2Verified: true,
      lastAccessAt: old.toISOString(),
    });
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
    (mockSession.updateSession as jest.Mock).mockResolvedValue(undefined);

    try {
      await guard.canActivate(buildCtx({}));
      fail('Deveria ter lançado');
    } catch (err: any) {
      const body = err.getResponse();
      expect(body.message).toContain('expirado');
    }
    expect(mockSession.updateSession).not.toHaveBeenCalled();
  });

  it('deve respeitar @SkipSessionFilter() e pular validação 2FA/expiração', async () => {
    const old = new Date();
    old.setDate(old.getDate() - 10);
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 1,
      role: 'USER',
      isActive: true,
      af2Verified: false,
      lastAccessAt: old.toISOString(),
      subscriptions: [
        {
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ],
    });
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

    const req = {} as any;
    const ok = await guard.canActivate(buildCtx(req));
    expect(ok).toBe(true);
    expect(req.user.id).toBe(1);
  });

  it('deve liberar usuário USER af2Verified com acesso recente e subscription ativa', async () => {
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 1,
      role: 'USER',
      isActive: true,
      af2Verified: true,
      lastAccessAt: new Date().toISOString(),
      subscriptions: [
        {
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ],
    });
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    const req = {} as any;
    const ok = await guard.canActivate(buildCtx(req));
    expect(ok).toBe(true);
    expect(req.user.id).toBe(1);
  });

  it('deve lançar redirect /plans quando user sem subscription ativa', async () => {
    (mockCookies.getSessionId as jest.Mock).mockReturnValue('session-xyz');
    (mockSession.getSession as jest.Mock).mockResolvedValue({
      id: 1,
      role: 'USER',
      isActive: true,
      af2Verified: true,
      lastAccessAt: new Date().toISOString(),
      subscriptions: [],
    });
    (mockReflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

    try {
      await guard.canActivate(buildCtx({}));
      fail('Deveria ter lançado');
    } catch (err: any) {
      const body = err.getResponse();
      expect(body.redirect).toBe('/plans');
    }
  });
});
