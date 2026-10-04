import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  const guard = new AdminGuard();

  const contextWithUser = (user?: { role: string }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as ExecutionContext;

  it.each(['ADMIN', 'FINANCEIRO', 'COMPLIANCE'])(
    'permite a role %s',
    (role) => {
      expect(guard.canActivate(contextWithUser({ role }))).toBe(true);
    },
  );

  it('bloqueia usuário comum', () => {
    expect(() => guard.canActivate(contextWithUser({ role: 'USER' }))).toThrow(
      new ForbiddenException('Acesso restrito a administradores'),
    );
  });

  it('bloqueia requisição sem usuário autenticado', () => {
    expect(() => guard.canActivate(contextWithUser())).toThrow(
      new ForbiddenException('Não autenticado'),
    );
  });
});
