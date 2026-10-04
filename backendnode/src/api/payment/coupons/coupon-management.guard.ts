import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Escrita do catálogo de cupons é exclusiva do papel ADMIN.
 * FINANCEIRO e COMPLIANCE possuem acesso de consulta e auditoria.
 */
@Injectable()
export class CouponManagementGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores podem alterar cupons',
      );
    }
    return true;
  }
}
