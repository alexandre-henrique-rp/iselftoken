import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { InstallmentConfigPermissionGuard } from './installment-config-permission.guard';

const mockRequest = (role: string) => ({
  user: { id: 1, role },
});

const mockContext = (role: string): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => mockRequest(role),
    }),
  }) as any;

describe('InstallmentConfigPermissionGuard', () => {
  let guard: InstallmentConfigPermissionGuard;

  beforeEach(() => {
    guard = new InstallmentConfigPermissionGuard();
  });

  it('allows ADMIN', () => {
    const ctx = mockContext('ADMIN');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows FINANCEIRO', () => {
    const ctx = mockContext('FINANCEIRO');
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws 401 when no user', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: null }),
      }),
    } as ExecutionContext;
    expect(() => guard.canActivate(ctx)).toThrow('not_authenticated');
  });

  it('throws 403 for USER role', () => {
    const ctx = mockContext('USER');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 for FOUNDER role', () => {
    const ctx = mockContext('FOUNDER');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 for INVESTOR role', () => {
    const ctx = mockContext('INVESTOR');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws 403 for COMPLIANCE role', () => {
    const ctx = mockContext('COMPLIANCE');
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
