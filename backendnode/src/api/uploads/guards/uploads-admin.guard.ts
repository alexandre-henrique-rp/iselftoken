/**
 * Guard para verificar role ADMIN em uploads.
 *
 * Permite acesso apenas para usuarios com role ADMIN.
 * Nao permite COMPLIANCE ou FINANCEIRO.
 *
 * @guard UploadsAdminGuard
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard que permite apenas role ADMIN.
 *
 * Diferenca para AdminGuard: este guard permite APENAS ADMIN,
 * enquanto AdminGuard tambem permite FINANCEIRO e COMPLIANCE.
 *
 * @example
 * @UseGuards(AuthGuard, UploadsAdminGuard)
 * async deleteUpload(@Req() req) { ... }
 */
@Injectable()
export class UploadsAdminGuard implements CanActivate {
  /**
   * Verifica se o usuario tem role ADMIN.
   *
   * @param context - Contexto de execucao do NestJS
   * @returns true se usuario tem role ADMIN
   * @throws {ForbiddenException} Se usuario nao tem role ADMIN ou nao esta autenticado
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Nao autenticado');
    }

    if (user.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso restrito a administradores');
    }

    return true;
  }
}
