import type { ExecutionContext } from '@nestjs/common';
import { CouponManagementGuard } from './coupon-management.guard';

describe('CouponManagementGuard', () => {
  const guard = new CouponManagementGuard();

  function contextWithRole(role: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role } }),
      }),
    } as ExecutionContext;
  }

  it('permite mutações somente para ADMIN', () => {
    expect(guard.canActivate(contextWithRole('ADMIN'))).toBe(true);
  });

  it.each(['COMPLIANCE', 'FINANCEIRO', 'USER'])(
    'bloqueia o papel %s',
    (role) => {
      expect(() => guard.canActivate(contextWithRole(role))).toThrow(
        'Apenas administradores podem alterar cupons',
      );
    },
  );
});
