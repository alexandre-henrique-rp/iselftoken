import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransparencyPost, TransparencyPostType } from '@prisma/client';
import { CreateTransparencyPostDto } from './dto/create-transparency-post.dto';
import { UpdateTransparencyPostDto } from './dto/update-transparency-post.dto';
import { ListTransparencyPostsQueryDto } from './dto/list-posts-query.dto';

/**
 * Service de transparencia: gerencia posts de transparencia das startups.
 *
 * Regras de negocio:
 * - Apenas o founder da startup (ou ADMIN) pode criar/editar/deletar posts
 * - Leitura exige Token ativo (delegada ao TokenGateGuard)
 * - Soft delete preserva historico para auditoria
 *
 * Referencia: scripts/PRD_PAGINA_TRANSPARENCIA.md
 */
@Injectable()
export class TransparencyService {
  private readonly logger = new Logger(TransparencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo post de transparencia.
   * authorId pode ser o founder (caso normal) ou um ADMIN (override).
   * Faz validacao cross-field: se periodMonth fornecido, periodYear tambem (e vice-versa).
   */
  async create(
    startupId: number,
    authorId: number,
    dto: CreateTransparencyPostDto,
  ): Promise<TransparencyPost> {
    // Validacao cross-field
    if (
      (dto.periodMonth && !dto.periodYear) ||
      (!dto.periodMonth && dto.periodYear)
    ) {
      throw new ForbiddenException(
        'periodMonth e periodYear devem ser fornecidos juntos (ou nenhum dos dois).',
      );
    }

    // Valida que a startup existe
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true },
    });
    if (!startup) {
      throw new NotFoundException('Startup nao encontrada');
    }

    // Cria post com anexos em transacao
    return this.prisma.$transaction(async (tx) => {
      const post = await tx.transparencyPost.create({
        data: {
          startupId,
          authorId,
          title: dto.title,
          content: dto.content,
          type: dto.type ?? TransparencyPostType.GENERAL,
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
        },
      });

      if (dto.attachmentIds && dto.attachmentIds.length > 0) {
        await tx.transparencyPostAttachment.createMany({
          data: dto.attachmentIds.map((uploadId) => ({
            postId: post.id,
            uploadId,
          })),
        });
      }

      this.logger.log(
        `[Transparency] Post criado: id=${post.id}, startupId=${startupId}, authorId=${authorId}, type=${post.type}`,
      );

      return post;
    });
  }

  /**
   * Lista posts paginados com filtros opcionais.
   * Sempre exclui soft-deleted.
   */
  async list(
    startupId: number,
    query: ListTransparencyPostsQueryDto,
  ): Promise<{
    data: TransparencyPost[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: Prisma.TransparencyPostWhereInput = {
      startupId,
      deletedAt: null,
    };

    if (query.type) where.type = query.type;
    if (query.year !== undefined) where.periodYear = query.year;
    if (query.month !== undefined) where.periodMonth = query.month;

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.transparencyPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        // Prisma nao permite `select` + `include` simultaneamente. Como
        // queremos explicitar sourceType/sourceId (FIN-09), usamos apenas
        // `select` e puxamos os relations via `select.attachments`.
        // FIN-09: expõe origem do post (auto-gerado por InstallmentRequest,
        // manual do founder, ou destaque mensal). Frontend usa para criar
        // a "Secao de Relatorios de Solicitacoes" em /founder/transparencia.
        select: {
          id: true,
          startupId: true,
          authorId: true,
          type: true,
          title: true,
          content: true,
          periodMonth: true,
          periodYear: true,
          publishedAt: true,
          updatedAt: true,
          deletedAt: true,
          sourceType: true,
          sourceId: true,
          attachments: {
            select: {
              uploadId: true,
              upload: {
                select: {
                  id: true,
                  publicId: true,
                  originalName: true,
                  mimeType: true,
                  url: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.transparencyPost.count({ where }),
    ]);

    return { data: data as unknown as TransparencyPost[], total, page, limit };
  }

  /**
   * Busca um post por ID. Retorna null se soft-deleted.
   */
  async findOne(postId: number): Promise<TransparencyPost | null> {
    return this.prisma.transparencyPost.findFirst({
      where: { id: postId, deletedAt: null },
      // FIN-09: expõe origem do post (auto-gerado por InstallmentRequest
      // vs manual do founder) para que a UI consiga distinguir e linkar
      // para a solicitacao original.
      select: {
        id: true,
        startupId: true,
        authorId: true,
        type: true,
        title: true,
        content: true,
        periodMonth: true,
        periodYear: true,
        publishedAt: true,
        updatedAt: true,
        deletedAt: true,
        sourceType: true,
        sourceId: true,
        attachments: {
          select: {
            uploadId: true,
            upload: {
              select: {
                id: true,
                publicId: true,
                originalName: true,
                mimeType: true,
                url: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Atualiza um post. Apenas o autor ou ADMIN podem editar.
   */
  async update(
    postId: number,
    userId: number,
    isAdmin: boolean,
    dto: UpdateTransparencyPostDto,
  ): Promise<TransparencyPost> {
    const post = await this.prisma.transparencyPost.findFirst({
      where: { id: postId, deletedAt: null },
    });
    if (!post) {
      throw new NotFoundException('Post nao encontrado');
    }
    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Voce nao e o autor deste post.');
    }

    // Validacao cross-field
    const hasMonth =
      dto.periodMonth !== undefined ? dto.periodMonth : post.periodMonth;
    const hasYear =
      dto.periodYear !== undefined ? dto.periodYear : post.periodYear;
    if ((hasMonth && !hasYear) || (!hasMonth && hasYear)) {
      throw new ForbiddenException(
        'periodMonth e periodYear devem ser fornecidos juntos (ou nenhum dos dois).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.transparencyPost.update({
        where: { id: postId },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.periodMonth !== undefined && {
            periodMonth: dto.periodMonth,
          }),
          ...(dto.periodYear !== undefined && { periodYear: dto.periodYear }),
        },
      });

      // Atualizar anexos se fornecido (substituicao completa)
      if (dto.attachmentIds !== undefined) {
        await tx.transparencyPostAttachment.deleteMany({
          where: { postId },
        });
        if (dto.attachmentIds.length > 0) {
          await tx.transparencyPostAttachment.createMany({
            data: dto.attachmentIds.map((uploadId) => ({ postId, uploadId })),
          });
        }
      }

      return updated;
    });
  }

  /**
   * Soft delete do post. Apenas o autor ou ADMIN podem deletar.
   */
  async remove(
    postId: number,
    userId: number,
    isAdmin: boolean,
  ): Promise<void> {
    const post = await this.prisma.transparencyPost.findFirst({
      where: { id: postId, deletedAt: null },
    });
    if (!post) {
      throw new NotFoundException('Post nao encontrado');
    }
    if (post.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('Voce nao e o autor deste post.');
    }

    await this.prisma.transparencyPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(
      `[Transparency] Post soft-deleted: id=${postId}, by userId=${userId}, isAdmin=${isAdmin}`,
    );
  }
}
