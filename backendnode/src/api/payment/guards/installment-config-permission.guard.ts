/**
 * @description Permite apenas ADMIN ou FINANCEIRO gerenciar configuracoes de parcelamento.
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class InstallmentConfigPermissionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('not_authenticated');
    }
    if (user.role !== 'ADMIN' && user.role !== 'FINANCEIRO') {
      throw new ForbiddenException({
        code: 'installment_config_admin_only',
        message:
          'Apenas ADMIN/FINANCEIRO pode gerenciar configs de parcelamento',
      });
    }
    return true;
  }
}
