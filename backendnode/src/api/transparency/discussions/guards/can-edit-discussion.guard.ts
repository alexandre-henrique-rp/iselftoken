import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';

/**
 * Guard que valida edicao/delete de discussion ou reply.
 *
 * Regras:
 * - ADMIN sempre pode.
 * - Autor pode se a thread/reply foi criada ha menos de 24h.
 * - Caso contrario: 403.
 *
 * Resolve o threadId/replyId do param da rota:
 * - :discussionId -> carrega TransparencyDiscussion
 * - :replyId       -> carrega TransparencyReply
 *
 * NAO re-checa TokenGateGuard (deve rodar DEPOIS dele).
 *
 * Janela de 24h para preservar auditoria; apos isso, somente ADMIN edita.
 */
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CanEditDiscussionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { id: number; role: string } | undefined;
    if (!user || !user.id) {
      throw new ForbiddenException('Autenticacao obrigatoria');
    }

    if (user.role === 'ADMIN') {
      return true;
    }

    const discussionId = req.params?.discussionId as string | undefined;
    const replyId = req.params?.replyId as string | undefined;

    if (replyId) {
      const reply = await this.prisma.transparencyReply.findFirst({
        where: { id: replyId, deletedAt: null },
        select: { authorId: true, createdAt: true },
      });
      if (!reply) {
        throw new ForbiddenException('Reply nao encontrada');
      }
      if (reply.authorId !== user.id) {
        throw new ForbiddenException('Voce nao e o autor desta reply.');
      }
      if (Date.now() - reply.createdAt.getTime() > EDIT_WINDOW_MS) {
        throw new ForbiddenException(
          'Janela de edicao de 24h expirada. Apenas ADMIN pode remover.',
        );
      }
      return true;
    }

    if (discussionId) {
      const discussion = await this.prisma.transparencyDiscussion.findFirst({
        where: { id: discussionId, deletedAt: null },
        select: { authorId: true, createdAt: true },
      });
      if (!discussion) {
        throw new ForbiddenException('Discussion nao encontrada');
      }
      if (discussion.authorId !== user.id) {
        throw new ForbiddenException('Voce nao e o autor desta thread.');
      }
      if (Date.now() - discussion.createdAt.getTime() > EDIT_WINDOW_MS) {
        throw new ForbiddenException(
          'Janela de edicao de 24h expirada. Apenas ADMIN pode editar.',
        );
      }
      return true;
    }

    throw new ForbiddenException('Parametro discussionId ou replyId ausente.');
  }
}
