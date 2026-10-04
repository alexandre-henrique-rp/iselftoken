import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TwoFactorGuard } from './two-factor.guard';

const mockContext = (user: any): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as unknown as ExecutionContext;

describe('TwoFactorGuard', () => {
  let guard: TwoFactorGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new TwoFactorGuard(reflector);
  });

  const setRequireFresh = (value: boolean) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(value);
  };

  // ===== rejects no user =====

  it('deve rejecting request sem user', () => {
    setRequireFresh(false);
    const ctx = mockContext(null);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow('not_authenticated');
  });

  // ===== rejects missing af2VerifiedAt =====

  it('deve rejecting user sem af2VerifiedAt (2FA nunca feito)', () => {
    setRequireFresh(false);
    const ctx = mockContext({ id: 1, role: 'ADMIN' });
    try {
      guard.canActivate(ctx);
      fail('expected UnauthorizedException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(UnauthorizedException);
      const resp = e.getResponse();
      expect(resp).toHaveProperty('code', 'af2_required');
    }
  });

  // ===== rejects expired 2FA =====

  it('deve rejecting 2FA expirado (>5min) quando requireFresh=true', () => {
    setRequireFresh(true);
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const ctx = mockContext({
      id: 1,
      role: 'ADMIN',
      af2VerifiedAt: sixMinutesAgo,
    });
    try {
      guard.canActivate(ctx);
      fail('expected UnauthorizedException');
    } catch (e: any) {
      expect(e).toBeInstanceOf(UnauthorizedException);
      const resp = e.getResponse();
      expect(resp).toHaveProperty('code', 'af2_expired');
    }
  });

  // ===== allows recent 2FA =====

  it('deve allowing 2FA recente (<5min) com requireFresh=true', () => {
    setRequireFresh(true);
    const now = new Date().toISOString();
    const ctx = mockContext({ id: 1, role: 'ADMIN', af2VerifiedAt: now });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ===== allows without requireFresh =====

  it('deve allowing com 2FA antigo quando requireFresh=false', () => {
    setRequireFresh(false);
    const oldDate = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const ctx = mockContext({ id: 1, role: 'ADMIN', af2VerifiedAt: oldDate });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ===== allows no 2FA required when not set =====

  it('deve allowing user sem 2FA quando metadata nao define requireFresh', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const ctx = mockContext({
      id: 1,
      role: 'ADMIN',
      af2VerifiedAt: new Date().toISOString(),
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  // ===== edge: exactly 5 minutes =====

  it('deve allowing 2FA exatamente 5 minutes ago (boundary)', () => {
    setRequireFresh(true);
    const exactly5MinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const ctx = mockContext({
      id: 1,
      role: 'ADMIN',
      af2VerifiedAt: exactly5MinAgo,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
