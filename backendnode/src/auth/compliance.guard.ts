import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class ComplianceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Nao autenticado');
    }

    if (user.role !== 'COMPLIANCE') {
      throw new ForbiddenException('Acesso restrito a usuarios compliance');
    }

    return true;
  }
}
