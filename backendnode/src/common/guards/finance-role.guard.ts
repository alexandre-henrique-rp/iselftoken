import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  FINANCE_ACCESS_KEY,
  type FinanceAccessMode,
} from '../decorators/finance-access.decorator';

const ROLES_WRITE = new Set(['ADMIN', 'FINANCEIRO']);
const ROLES_READ = new Set(['ADMIN', 'FINANCEIRO', 'COMPLIANCE']);

/**
 * Gate de acesso ao painel financeiro. Roda DEPOIS do `AuthGuard` (que
 * popula `req.user`).
 *
 * - `@FinanceAccess('write')` → exige `ADMIN` ou `FINANCEIRO`.
 * - `@FinanceAccess('read')` (ou ausente) → aceita `COMPLIANCE` também.
 *
 * Qualquer outra role recebe 403. Não chega aqui sem autenticação porque
 * o `AuthGuard` já cuida disso.
 */
@Injectable()
export class FinanceRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const mode =
      this.reflector.getAllAndOverride<FinanceAccessMode>(FINANCE_ACCESS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'read';

    const request = context.switchToHttp().getRequest();
    const role: string | undefined = request?.user?.role;
    if (!role) {
      throw new ForbiddenException('Sem role definida');
    }

    const allowed = mode === 'write' ? ROLES_WRITE : ROLES_READ;
    if (!allowed.has(role)) {
      throw new ForbiddenException(
        `Role ${role} não tem acesso ${mode} ao painel financeiro`,
      );
    }
    return true;
  }
}
