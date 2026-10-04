import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class ComplianceOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Nao autenticado');
    }

    if (user.role !== 'COMPLIANCE' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Acesso restrito a usuarios compliance / admin',
      );
    }

    return true;
  }
}
