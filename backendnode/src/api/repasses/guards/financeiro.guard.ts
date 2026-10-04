import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class FinanceiroGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Nao autenticado');
    }

    if (user.role !== 'FINANCEIRO' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Acesso restrito a usuarios financeiro / admin',
      );
    }

    return true;
  }
}
