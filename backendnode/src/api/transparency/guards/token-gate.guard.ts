import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Guard que valida acesso a pagina de transparencia de uma startup.
 *
 * Regras (em ordem):
 * 1. User autenticado (AuthGuard deve ter rodado antes) — senao 401
 * 2. ADMIN sempre tem acesso
 * 3. Founder da startup (Startup.founderId === req.user.id) — allow
 * 4. Token-holder: existe Token onde userId = req.user.id E startupId = :startupId — allow
 * 5. Senao: 403 com mensagem clara
 *
 * Implementado como guard global (pode ser aplicado via @UseGuards em rotas especificas).
 * Funciona tanto para rotas :startupId (lista/create) quanto :postId (detalhe/update/delete),
 * pois resolve o startupId via lookup do post quando necessario.
 *
 * Referencia: scripts/PRD_PAGINA_TRANSPARENCIA.md §5.4
 */
@Injectable()
export class TokenGateGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { id: number; role: string } | undefined;

    // 1. Autenticacao
    if (!user || !user.id) {
      throw new UnauthorizedException('Autenticacao obrigatoria');
    }

    // 2. ADMIN passa
    if (user.role === 'ADMIN') {
      return true;
    }

    // Resolver startupId: vem do param da rota
    let startupId = Number(req.params?.startupId);
    if (!Number.isFinite(startupId) || startupId <= 0) {
      // Pode vir do postId em rotas de detalhe
      const postId = Number(req.params?.postId);
      if (Number.isFinite(postId) && postId > 0) {
        const post = await this.prisma.transparencyPost.findUnique({
          where: { id: postId },
          select: { startupId: true, deletedAt: true },
        });
        if (!post || post.deletedAt) {
          throw new NotFoundException('Post nao encontrado');
        }
        startupId = post.startupId;
      } else {
        return false; // sem param, gate nao pode validar - bloqueia por seguranca
      }
    }

    // 3. Founder da startup
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { founderId: true },
    });
    if (!startup) {
      throw new NotFoundException('Startup nao encontrada');
    }
    if (startup.founderId === user.id) {
      return true;
    }

    // 4. Token-holder (existencia de Token nao importa status da campaign)
    const token = await this.prisma.token.findFirst({
      where: { userId: user.id, startupId },
      select: { id: true },
    });
    if (token) {
      return true;
    }

    // 5. Bloqueia
    throw new ForbiddenException(
      'Voce precisa comprar tokens desta startup para acessar a area de transparencia.',
    );
  }
}
