import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransparencyPostType } from '@prisma/client';

/**
 * Service do "Post Principal Vigente" — relatorio financeiro do mes atual.
 *
 * Regra: o mais recente TransparencyPost com type=FINANCEIRO cujo
 * periodMonth/periodYear coincide com o mes calendario vigente (server-side).
 *
 * Cache Redis 5min, chave `transparency:vigente:{startupId}`.
 *
 * Se Redis nao estiver disponivel, faz fallback para query direta (sem cache).
 *
 * Referencia: CASE.md §[Transparencia] - Discussao e Relatorio Vigente
 *             todo/todo.json -> TRANSP-03 endpoint dedicated.
 */
export const FEATURED_REPORT_CACHE_TTL_S = 300;
const CACHE_KEY_PREFIX = 'transparency:vigente:';

export interface FeaturedReportPost {
  id: number;
  startupId: number;
  type: TransparencyPostType;
  title: string;
  content: string;
  periodMonth: number | null;
  periodYear: number | null;
  publishedAt: Date;
  updatedAt: Date;
  author: { id: number; nome: string } | null;
  attachments: Array<{
    uploadId: number;
    upload: {
      id: number;
      publicId: string;
      originalName: string | null;
      mimeType: string | null;
      url: string | null;
    };
  }>;
}

@Injectable()
export class FeaturedReportService {
  private readonly logger = new Logger(FeaturedReportService.name);

  /**
   * Cliente Redis opcional. Injetado via token 'IOREDIS_CLIENT' (mesmo usado
   * por outros modulos do projeto) - se nao houver, fallback para query DB.
   */
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('IOREDIS_CLIENT') private readonly redis: any,
  ) {}

  protected cacheKey(startupId: number): string {
    return `${CACHE_KEY_PREFIX}${startupId}`;
  }

  /**
   * Retorna o post vigente. Null se nao houver post do mes atual.
   */
  async getFeaturedReport(
    startupId: number,
    now: Date = new Date(),
  ): Promise<FeaturedReportPost | null> {
    const month = now.getMonth() + 1; // getMonth eh 0-based
    const year = now.getFullYear();

    const cacheKey = this.cacheKey(startupId);
    let cached: string | null = null;

    // Tenta ler do Redis. Se nao conseguir (off/disconnected), segue para DB.
    if (this.redis) {
      try {
        cached = await this.redis.get(cacheKey);
      } catch (err) {
        this.logger.warn(
          `[FeaturedReport] Redis GET falhou (continuando sem cache): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (cached !== null && cached !== undefined) {
      if (cached === '__null__') return null;
      try {
        return JSON.parse(cached) as FeaturedReportPost;
      } catch {
        // valor invalido no cache - ignora e segue
      }
    }

    const post = await this.prisma.transparencyPost.findFirst({
      where: {
        startupId,
        type: TransparencyPostType.FINANCIAL_REPORT,
        periodMonth: month,
        periodYear: year,
        deletedAt: null,
      },
      orderBy: { publishedAt: 'desc' },
      include: {
        author: { select: { id: true, nome: true } },
        attachments: {
          include: {
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
    });

    if (!post) {
      if (this.redis) {
        try {
          await this.redis.set(
            cacheKey,
            '__null__',
            'EX',
            FEATURED_REPORT_CACHE_TTL_S,
          );
        } catch {
          /* sem-op */
        }
      }
      return null;
    }

    if (this.redis) {
      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(post),
          'EX',
          FEATURED_REPORT_CACHE_TTL_S,
        );
      } catch (err) {
        this.logger.warn(
          `[FeaturedReport] Redis SET falhou (cache miss perpetuado): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return post as unknown as FeaturedReportPost;
  }

  /**
   * Invalida o cache (usar apos create/update/remove de TransparencyPost).
   */
  async invalidate(startupId: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(this.cacheKey(startupId));
    } catch (err) {
      this.logger.warn(
        `[FeaturedReport] Falha ao invalidar cache: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
