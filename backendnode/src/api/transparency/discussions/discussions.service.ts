import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DiscussionCategory, Prisma } from '@prisma/client';
import { CreateDiscussionDto } from './dto/create-discussion.dto';
import { UpdateDiscussionDto } from './dto/update-discussion.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import {
  DiscussionSort,
  ListDiscussionsQueryDto,
} from './dto/list-discussions-query.dto';
import { AuditService } from '../../../common/audit/audit.service';

/**
 * Service de Discussao da area de Transparencia (TRANSP-03 / TRANSP-05).
 *
 * Regras de negocio:
 * - Apenas investidores com Token ativo + founder + ADMIN podem ler/escrever (gating via TokenGateGuard).
 * - 1 thread fixada por startup (atomicidade via transaction em `pin`).
 * - 1 upvote por user/thread (UNIQUE no DB; toggle idempotente).
 * - Edicao limitada a 24h para autor; ADMIN sempre pode.
 * - Delete exige `force: true` se houver replies.
 * - LGPD: NUNCA retorna `User.cpf` / `email` / `telefone`; usa `buildAuthorPublicId()`.
 *
 * Limites:
 * - MAX_THREADS_PER_USER_PER_DAY = 5
 * - MAX_REPLIES_PER_THREAD = 200
 *
 * Referencia: CASE.md §[Transparencia] - Discussao e Relatorio Vigente
 */
export const MAX_THREADS_PER_USER_PER_DAY = 5;
export const MAX_REPLIES_PER_THREAD = 200;
export const MAX_UPVOTES_PER_THREAD = 10_000;
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

interface AuthorLike {
  nome: string;
}

@Injectable()
export class DiscussionsService {
  private readonly logger = new Logger(DiscussionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Constroi o `authorPublicId` derivado para exibicao publica.
   *
   * - isAnonymous=true: retorna `PrimeiraPalavra + ' ' + Inicial(segunda palavra) + '.'`
   *   Ex.: "Ana Silva" -> "Ana S.". Se `nome` tiver 1 so token, retorna "PrimeiraPalavra".
   * - isAnonymous=false: retorna `nome` completo.
   *
   * LGPD: NUNCA retorna cpf/email/telefone/documento. Funcao pura, sem I/O.
   */
  buildAuthorPublicId(user: AuthorLike, isAnonymous: boolean): string {
    const nome = (user?.nome ?? '').trim();
    if (!isAnonymous) {
      return nome || 'Anonimo';
    }
    if (!nome) return 'Anonimo';
    const tokens = nome.split(/\s+/);
    if (tokens.length === 1) return tokens[0];
    const lastInitial = (tokens[tokens.length - 1] ?? '')
      .charAt(0)
      .toUpperCase();
    return lastInitial ? `${tokens[0]} ${lastInitial}.` : tokens[0];
  }

  /**
   * Helper de validacao: o user eh founder da startup OU ADMIN?
   * Usado em endpoints de pin.
   */
  async canPin(
    userId: number,
    isAdmin: boolean,
    startupId: number,
  ): Promise<boolean> {
    if (isAdmin) return true;
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { founderId: true },
    });
    return !!startup && startup.founderId === userId;
  }

  /**
   * Lista threads de uma startup com filtros + ordenacao.
   * Pinned sempre separado e listado primeiro; demais seguem `sort` aplicado.
   *
   * LGPD: select exclui cpf/email/telefone do User.author.
   */
  async list(startupId: number, query: ListDiscussionsQueryDto) {
    const where: Prisma.TransparencyDiscussionWhereInput = {
      startupId,
      deletedAt: null,
    };

    if (query.category) where.category = query.category;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { content: { contains: query.q } },
      ];
    }

    const sort: DiscussionSort = query.sort ?? 'recent';
    const orderBy: Prisma.TransparencyDiscussionOrderByWithRelationInput[] =
      sort === 'top'
        ? [{ upvotesCount: 'desc' }, { createdAt: 'desc' }]
        : sort === 'oldest'
          ? [{ createdAt: 'asc' }]
          : [{ createdAt: 'desc' }];

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.transparencyDiscussion.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: { select: { id: true, nome: true, publicId: true } },
          _count: { select: { replies: { where: { deletedAt: null } } } },
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
      this.prisma.transparencyDiscussion.count({ where }),
    ]);

    const pinnedItems = items.filter((i) => i.isPinned);
    const unpinnedItems = items.filter((i) => !i.isPinned);

    const mapThread = (t: (typeof items)[number]) => {
      const replyCount = t._count?.replies ?? 0;
      const lastReply = t.replies?.[0]?.createdAt ?? null;
      const lastActivityAt =
        lastReply && lastReply > t.updatedAt ? lastReply : t.updatedAt;
      return {
        id: t.id,
        startupId: t.startupId,
        title: t.title,
        content: t.content,
        category: t.category,
        isAnonymous: t.isAnonymous,
        authorPublicId: this.buildAuthorPublicId(t.author, t.isAnonymous),
        upvotesCount: t.upvotesCount,
        isPinned: t.isPinned,
        pinnedAt: t.pinnedAt,
        repliesCount: replyCount,
        lastActivityAt,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    };

    return {
      data: [...pinnedItems.map(mapThread), ...unpinnedItems.map(mapThread)],
      total,
      page,
      limit,
    };
  }

  /**
   * Cria thread. Autor = req.user.id.
   * Rate limit simples: MAX_THREADS_PER_USER_PER_DAY 429.
   */
  async create(startupId: number, authorId: number, dto: CreateDiscussionDto) {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true },
    });
    if (!startup) throw new NotFoundException('Startup nao encontrada');

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.prisma.transparencyDiscussion.count({
      where: { authorId, createdAt: { gte: cutoff } },
    });
    if (recentCount >= MAX_THREADS_PER_USER_PER_DAY) {
      throw new ForbiddenException(
        `Limite diario de ${MAX_THREADS_PER_USER_PER_DAY} threads por usuario atingido.`,
      );
    }

    const created = await this.prisma.transparencyDiscussion.create({
      data: {
        startupId,
        authorId,
        title: dto.title,
        content: dto.content,
        category: dto.category ?? DiscussionCategory.GERAL,
        isAnonymous: dto.isAnonymous ?? false,
      },
    });

    await this.audit.log({
      userId: authorId,
      action: 'CREATE_DISCUSSION',
      entity: 'TransparencyDiscussion',
      entityId: created.id,
      newValue: { startupId, title: created.title },
    });

    this.logger.log(
      `[Discussions] Thread criada: id=${created.id}, startupId=${startupId}, authorId=${authorId}`,
    );
    return created;
  }

  /**
   * Detalhe de thread + replies paginadas + `viewerHasUpvoted`.
   */
  async findOne(discussionId: string, viewerId: number) {
    const discussion = await this.prisma.transparencyDiscussion.findFirst({
      where: { id: discussionId, deletedAt: null },
      include: {
        author: { select: { id: true, nome: true, publicId: true } },
      },
    });
    if (!discussion) return null;

    const viewerHasUpvoted = !!(await this.prisma.discussionUpvote.findUnique({
      where: { discussionId_userId: { discussionId, userId: viewerId } },
    }));

    const replies = await this.prisma.transparencyReply.findMany({
      where: { discussionId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, nome: true, publicId: true } } },
    });

    const mappedReplies = replies.map((r) => ({
      id: r.id,
      discussionId: r.discussionId,
      authorId: r.authorId,
      authorPublicId: r.author
        ? this.buildAuthorPublicId(r.author, false)
        : 'Anonimo',
      content: r.content,
      createdAt: r.createdAt,
    }));

    return {
      id: discussion.id,
      startupId: discussion.startupId,
      title: discussion.title,
      content: discussion.content,
      category: discussion.category,
      isAnonymous: discussion.isAnonymous,
      authorPublicId: this.buildAuthorPublicId(
        discussion.author,
        discussion.isAnonymous,
      ),
      upvotesCount: discussion.upvotesCount,
      isPinned: discussion.isPinned,
      pinnedAt: discussion.pinnedAt,
      repliesCount: mappedReplies.length,
      replies: mappedReplies,
      viewerHasUpvoted,
      createdAt: discussion.createdAt,
      updatedAt: discussion.updatedAt,
    };
  }

  /**
   * Edita thread. Validacao: autor com <24h OU ADMIN (ja garantido pelo guard).
   */
  async update(
    discussionId: string,
    userId: number,
    isAdmin: boolean,
    dto: UpdateDiscussionDto,
  ) {
    const discussion = await this.prisma.transparencyDiscussion.findFirst({
      where: { id: discussionId, deletedAt: null },
    });
    if (!discussion) throw new NotFoundException('Discussion nao encontrada');

    if (!isAdmin) {
      if (discussion.authorId !== userId) {
        throw new ForbiddenException('Voce nao e o autor desta thread.');
      }
      if (Date.now() - discussion.createdAt.getTime() > EDIT_WINDOW_MS) {
        throw new ForbiddenException('Janela de edicao de 24h expirada.');
      }
    }

    const updated = await this.prisma.transparencyDiscussion.update({
      where: { id: discussionId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.isAnonymous !== undefined && { isAnonymous: dto.isAnonymous }),
      },
    });

    await this.audit.log({
      userId,
      action: 'UPDATE_DISCUSSION',
      entity: 'TransparencyDiscussion',
      entityId: discussionId,
      newValue: { changed: Object.keys(dto) },
    });

    return updated;
  }

  /**
   * Soft delete. force=true necessario se houver replies.
   */
  async remove(
    discussionId: string,
    userId: number,
    isAdmin: boolean,
    force: boolean,
  ) {
    const discussion = await this.prisma.transparencyDiscussion.findFirst({
      where: { id: discussionId, deletedAt: null },
      include: { _count: { select: { replies: true } } },
    });
    if (!discussion) throw new NotFoundException('Discussion nao encontrada');

    if (!isAdmin) {
      if (discussion.authorId !== userId) {
        throw new ForbiddenException('Voce nao e o autor desta thread.');
      }
      if (Date.now() - discussion.createdAt.getTime() > EDIT_WINDOW_MS) {
        throw new ForbiddenException('Janela de edicao de 24h expirada.');
      }
    }

    if (discussion._count.replies > 0 && !force) {
      throw new BadRequestException({
        success: false,
        code: 'REPLIES_PRESENT',
        message:
          'Thread possui replies. Para deletar, envie { force: true } confirmando ciencia.',
      });
    }

    await this.prisma.transparencyDiscussion.update({
      where: { id: discussionId },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      userId,
      action: 'DELETE_DISCUSSION',
      entity: 'TransparencyDiscussion',
      entityId: discussionId,
      newValue: { force, repliesCount: discussion._count.replies },
    });
  }

  /**
   * Toggle upvote idempotente. Retorna novo upvotesCount + viewerHasUpvoted.
   */
  async toggleUpvote(discussionId: string, userId: number) {
    const discussion = await this.prisma.transparencyDiscussion.findFirst({
      where: { id: discussionId, deletedAt: null },
      select: { id: true, upvotesCount: true },
    });
    if (!discussion) throw new NotFoundException('Discussion nao encontrada');

    const existing = await this.prisma.discussionUpvote.findUnique({
      where: { discussionId_userId: { discussionId, userId } },
    });

    if (existing) {
      const [, upd] = await this.prisma.$transaction([
        this.prisma.discussionUpvote.delete({ where: { id: existing.id } }),
        this.prisma.transparencyDiscussion.update({
          where: { id: discussionId },
          data: { upvotesCount: { decrement: 1 } },
          select: { upvotesCount: true },
        }),
      ]);
      await this.audit.log({
        userId,
        action: 'DISCUSSION_UNVOTE',
        entity: 'DiscussionUpvote',
        entityId: discussionId,
      });
      return { upvotesCount: upd.upvotesCount, viewerHasUpvoted: false };
    }

    if (discussion.upvotesCount >= MAX_UPVOTES_PER_THREAD) {
      // cap atingido: ainda cria vote (para nao perder toggle do user) mas nao incrementa.
      await this.prisma.discussionUpvote.create({
        data: { discussionId, userId },
      });
      await this.audit.log({
        userId,
        action: 'DISCUSSION_UPVOTE',
        entity: 'DiscussionUpvote',
        entityId: discussionId,
      });
      return { upvotesCount: discussion.upvotesCount, viewerHasUpvoted: true };
    }

    const [, upd] = await this.prisma.$transaction([
      this.prisma.discussionUpvote.create({ data: { discussionId, userId } }),
      this.prisma.transparencyDiscussion.update({
        where: { id: discussionId },
        data: { upvotesCount: { increment: 1 } },
        select: { upvotesCount: true },
      }),
    ]);
    await this.audit.log({
      userId,
      action: 'DISCUSSION_UPVOTE',
      entity: 'DiscussionUpvote',
      entityId: discussionId,
    });
    return { upvotesCount: upd.upvotesCount, viewerHasUpvoted: true };
  }

  /**
   * Fixar thread. Atomicidade: 1 thread fixada por startup.
   * Em transacao: (a) UPDATE todas as outras isPinned=false; (b) UPDATE target.
   */
  async pin(discussionId: string, userId: number, isAdmin: boolean) {
    const discussion = await this.prisma.transparencyDiscussion.findFirst({
      where: { id: discussionId, deletedAt: null },
      select: { id: true, startupId: true },
    });
    if (!discussion) throw new NotFoundException('Discussion nao encontrada');

    const can = await this.canPin(userId, isAdmin, discussion.startupId);
    if (!can) {
      throw new ForbiddenException(
        'Apenas o founder da startup ou ADMIN pode fixar threads.',
      );
    }

    const pinned = await this.prisma.$transaction(async (tx) => {
      await tx.transparencyDiscussion.updateMany({
        where: {
          startupId: discussion.startupId,
          isPinned: true,
          NOT: { id: discussionId },
        },
        data: { isPinned: false },
      });
      const updated = await tx.transparencyDiscussion.update({
        where: { id: discussionId },
        data: { isPinned: true, pinnedAt: new Date(), pinnedByUserId: userId },
      });
      return updated;
    });

    await this.audit.log({
      userId,
      action: 'DISCUSSION_PIN',
      entity: 'TransparencyDiscussion',
      entityId: discussionId,
    });

    this.logger.log(
      `[Discussions] Thread fixada: id=${discussionId}, startupId=${discussion.startupId}, by userId=${userId}`,
    );
    return pinned;
  }

  /**
   * Desfixar thread. Apenas founder/admin.
   */
  async unpin(discussionId: string, userId: number, isAdmin: boolean) {
    const discussion = await this.prisma.transparencyDiscussion.findFirst({
      where: { id: discussionId, deletedAt: null },
      select: { id: true, startupId: true },
    });
    if (!discussion) throw new NotFoundException('Discussion nao encontrada');

    const can = await this.canPin(userId, isAdmin, discussion.startupId);
    if (!can) {
      throw new ForbiddenException(
        'Apenas o founder da startup ou ADMIN pode desfixar threads.',
      );
    }

    const updated = await this.prisma.transparencyDiscussion.update({
      where: { id: discussionId },
      data: { isPinned: false, pinnedAt: null, pinnedByUserId: null },
    });

    await this.audit.log({
      userId,
      action: 'DISCUSSION_UNPIN',
      entity: 'TransparencyDiscussion',
      entityId: discussionId,
    });
    return updated;
  }

  /**
   * Cria reply. Limite de 200 replies/thread.
   */
  async createReply(
    discussionId: string,
    authorId: number,
    dto: CreateReplyDto,
  ) {
    const discussion = await this.prisma.transparencyDiscussion.findFirst({
      where: { id: discussionId, deletedAt: null },
      select: { id: true },
    });
    if (!discussion) throw new NotFoundException('Discussion nao encontrada');

    const replyCount = await this.prisma.transparencyReply.count({
      where: { discussionId, deletedAt: null },
    });
    if (replyCount >= MAX_REPLIES_PER_THREAD) {
      throw new BadRequestException(
        `Limite de ${MAX_REPLIES_PER_THREAD} replies por thread atingido.`,
      );
    }

    const reply = await this.prisma.transparencyReply.create({
      data: { discussionId, authorId, content: dto.content },
    });

    // Bump updatedAt da thread para refletir atividade
    await this.prisma.transparencyDiscussion.update({
      where: { id: discussionId },
      data: { updatedAt: new Date() },
    });

    await this.audit.log({
      userId: authorId,
      action: 'CREATE_REPLY',
      entity: 'TransparencyReply',
      entityId: reply.id,
      newValue: { discussionId },
    });
    return reply;
  }

  /**
   * Soft delete de reply. Autor<24h OU ADMIN (ja garantido pelo guard).
   */
  async removeReply(replyId: string, userId: number, isAdmin: boolean) {
    const reply = await this.prisma.transparencyReply.findFirst({
      where: { id: replyId, deletedAt: null },
      select: { id: true, authorId: true, createdAt: true },
    });
    if (!reply) throw new NotFoundException('Reply nao encontrada');

    if (!isAdmin) {
      if (reply.authorId !== userId) {
        throw new ForbiddenException('Voce nao e o autor desta reply.');
      }
      if (Date.now() - reply.createdAt.getTime() > EDIT_WINDOW_MS) {
        throw new ForbiddenException('Janela de edicao de 24h expirada.');
      }
    }

    await this.prisma.transparencyReply.update({
      where: { id: replyId },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      userId,
      action: 'DELETE_REPLY',
      entity: 'TransparencyReply',
      entityId: replyId,
    });
  }
}
