import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SealCategory } from '@prisma/client';
import type { SealCategory as SealCategoryType } from '@prisma/client';
import {
  AssignSealDto,
  CreateSealDto,
  SealCatalogItemDto,
  StartupSealDto,
  UpdateSealDto,
} from './dto/seal.dto';

const VALID_CATEGORIES = new Set(Object.keys(SealCategory));
const ICONS_DIR = path.join(process.cwd(), 'icons');
const SLUG_REGEX = /^[a-z0-9_]+$/;

const STAGE_MAP: Record<string, string> = {
  ideação: 'ideacao',
  ideacao: 'ideacao',
  mvp: 'mvp',
  tração: 'tracao',
  tracao: 'tracao',
  operação: 'operacao',
  operacao: 'operacao',
  'break-even': 'breakeven',
  breakeven: 'breakeven',
  acelerada: 'acelerada',
  acelerado: 'acelerada',
};

@Injectable()
export class SealsService {
  private readonly logger = new Logger(SealsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // Públicos
  // ============================================================

  async getCatalog() {
    const items = await this.prisma.seal.findMany({
      where: { active: true },
      orderBy: [{ category: 'asc' }, { slug: 'asc' }],
      take: 200,
    });
    const data: SealCatalogItemDto[] = items.map((s) => this.toCatalogDto(s));
    return ResponseDto.success(
      'Catálogo de selos retornado com sucesso',
      200,
      data,
    );
  }

  /**
   * Lista TODOS os selos (ativos e inativos) para o painel de compliance.
   * Inclui contagem de atribuições por selo para dar contexto operacional.
   */
  async listAllForAdmin() {
    const seals = await this.prisma.seal.findMany({
      orderBy: [{ active: 'desc' }, { category: 'asc' }, { slug: 'asc' }],
      take: 200,
    });
    const counts = await this.prisma.startupSeal.groupBy({
      by: ['sealId'],
      _count: { _all: true },
    });
    const countMap = new Map(counts.map((c) => [c.sealId, c._count._all]));
    const data = seals.map((s) => ({
      ...this.toCatalogDto(s),
      active: s.active,
      imagePath: s.imagePath,
      issuedCount: countMap.get(s.id) ?? 0,
    }));
    return ResponseDto.success('Selos listados', 200, data);
  }

  async getByStartup(startupId: number) {
    const rows = await this.prisma.startupSeal.findMany({
      where: { startupId, seal: { active: true } },
      include: {
        seal: true,
      },
      orderBy: { issuedAt: 'desc' },
    });

    const issuerIds = Array.from(
      new Set(rows.map((r) => r.issuedBy).filter((id): id is number => !!id)),
    );
    const issuers = issuerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: issuerIds } },
          select: { id: true, nome: true },
        })
      : [];
    const issuerMap = new Map(issuers.map((u) => [u.id, u]));

    const data: StartupSealDto[] = rows.map((r) => ({
      ...this.toCatalogDto(r.seal),
      issuedAt: r.issuedAt.toISOString(),
      issuedBy: r.issuedBy ? (issuerMap.get(r.issuedBy) ?? null) : null,
    }));
    return ResponseDto.success(
      'Selos da startup retornados com sucesso',
      200,
      data,
    );
  }

  // ============================================================
  // Admin - Catálogo
  // ============================================================

  async createCustom(
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    dto: CreateSealDto,
  ) {
    if (!file) {
      return ResponseDto.error('Imagem do selo é obrigatória', 400);
    }
    if (file.mimetype !== 'image/png') {
      return ResponseDto.error('Apenas PNG é aceito', 400);
    }
    if (file.size > 200 * 1024) {
      return ResponseDto.error('Imagem deve ter no máximo 200KB', 400);
    }
    if (!SLUG_REGEX.test(dto.slug)) {
      return ResponseDto.error('Slug inválido. Use apenas a-z, 0-9 e _', 400);
    }
    const category = dto.category ?? 'CUSTOM';
    if (!VALID_CATEGORIES.has(category)) {
      return ResponseDto.error('Categoria inválida', 400);
    }

    const existing = await this.prisma.seal.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      return ResponseDto.error(`Slug já existe: ${dto.slug}`, 409);
    }

    await fs.mkdir(ICONS_DIR, { recursive: true });
    const filePath = path.join(ICONS_DIR, `${dto.slug}.png`);
    await fs.writeFile(filePath, file.buffer);

    const created = await this.prisma.seal.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        description: dto.description ?? null,
        imagePath: `/icons/${dto.slug}.png`,
        category: category as SealCategoryType,
      },
    });
    return ResponseDto.success(
      'Selo criado com sucesso',
      201,
      this.toCatalogDto(created),
    );
  }

  async updateMeta(id: number, dto: UpdateSealDto) {
    const existing = await this.prisma.seal.findUnique({ where: { id } });
    if (!existing) {
      return ResponseDto.error('Selo não encontrado', 404);
    }
    const updated = await this.prisma.seal.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });
    return ResponseDto.success(
      'Selo atualizado com sucesso',
      200,
      this.toCatalogDto(updated),
    );
  }

  async softDelete(id: number) {
    const existing = await this.prisma.seal.findUnique({ where: { id } });
    if (!existing) {
      return ResponseDto.error('Selo não encontrado', 404);
    }
    await this.prisma.seal.update({
      where: { id },
      data: { active: false },
    });
    return ResponseDto.success('Selo desativado', 200);
  }

  // ============================================================
  // Admin - Atribuição
  // ============================================================

  async assignToStartup(
    startupId: number,
    dto: AssignSealDto,
    issuedBy: number,
  ) {
    const seal = await this.prisma.seal.findUnique({
      where: { slug: dto.sealSlug },
    });
    if (!seal || !seal.active) {
      return ResponseDto.error('Selo não encontrado ou inativo', 404);
    }
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
    });
    if (!startup) {
      return ResponseDto.error('Startup não encontrada', 404);
    }
    const existing = await this.prisma.startupSeal.findUnique({
      where: { startupId_sealId: { startupId, sealId: seal.id } },
    });
    if (existing) {
      return ResponseDto.error('Selo já atribuído a esta startup', 409);
    }
    const created = await this.prisma.startupSeal.create({
      data: {
        startupId,
        sealId: seal.id,
        issuedBy,
        metadata: dto.metadata
          ? (dto.metadata as object)
          : { source: 'manual' },
      },
    });
    return ResponseDto.success('Selo atribuído com sucesso', 201, created);
  }

  async removeFromStartup(startupId: number, sealId: number) {
    const row = await this.prisma.startupSeal.findUnique({
      where: { startupId_sealId: { startupId, sealId } },
    });
    if (!row) {
      return ResponseDto.error('Atribuição não encontrada', 404);
    }
    await this.prisma.startupSeal.delete({ where: { id: row.id } });
    return ResponseDto.success('Selo removido', 200);
  }

  // ============================================================
  // Auto-attribution (chamado por hooks)
  // ============================================================

  async autoAssignStage(startupId: number, estagio: string | null | undefined) {
    if (!estagio) return;
    const slug = STAGE_MAP[estagio.trim().toLowerCase()];
    if (!slug) return;

    const seal = await this.prisma.seal.findUnique({ where: { slug } });
    if (!seal) {
      this.logger.warn(`Auto-assign STAGE: seal '${slug}' não encontrado`);
      return;
    }

    // Remove outros selos de STAGE da mesma startup
    const existingStages = await this.prisma.startupSeal.findMany({
      where: { startupId, seal: { category: 'STAGE' as SealCategoryType } },
      include: { seal: { select: { id: true, slug: true } } },
    });
    const idsToRemove = existingStages
      .filter((es) => es.seal.id !== seal.id)
      .map((es) => es.id);
    if (idsToRemove.length) {
      await this.prisma.startupSeal.deleteMany({
        where: { id: { in: idsToRemove } },
      });
    }

    // Atribui o novo (se não existe)
    const already = existingStages.some((es) => es.seal.id === seal.id);
    if (!already) {
      await this.prisma.startupSeal.create({
        data: {
          startupId,
          sealId: seal.id,
          issuedBy: null,
          metadata: { source: 'auto', trigger: 'estagio_change' },
        },
      });
    }
  }

  async autoAssignVerified(startupId: number) {
    const seal = await this.prisma.seal.findUnique({
      where: { slug: 'startup_verificada' },
    });
    if (!seal) return;
    const existing = await this.prisma.startupSeal.findUnique({
      where: { startupId_sealId: { startupId, sealId: seal.id } },
    });
    if (existing) return;
    await this.prisma.startupSeal.create({
      data: {
        startupId,
        sealId: seal.id,
        issuedBy: null,
        metadata: { source: 'auto', trigger: 'status_approved' },
      },
    });
  }

  /**
   * BUG-FT-007: atribui o selo "Lançamento" (slug `lancamento`, categoria
   * PARTNERSHIP) à startup que contratou o serviço FAST_DEPLOY
   * (Publicação Rápida). Best-effort — se o selo não existir no banco
   * (seed não rodou, ou foi soft-deletado), apenas loga aviso e segue
   * sem falhar a aprovação. Idempotente — no-op se já atribuído.
   *
   * Trigger esperado: chamado por `AdminService.updateStartupStatus`
   * quando `phase === 3` + `status === 'APPROVED'` +
   * `campaignOpenResult.fastDeploy === true` + `campaignOpenResult.ok`.
   */
  async autoAssignFastDeploy(startupId: number): Promise<void> {
    const seal = await this.prisma.seal.findUnique({
      where: { slug: 'lancamento' },
    });
    if (!seal) {
      this.logger.warn(
        `Auto-assign FAST_DEPLOY: selo "lancamento" não encontrado no banco. ` +
          'Rode `npm run seed` (ou seed-email-templates.ts) para popular.',
      );
      return;
    }
    const existing = await this.prisma.startupSeal.findUnique({
      where: { startupId_sealId: { startupId, sealId: seal.id } },
    });
    if (existing) return;
    await this.prisma.startupSeal.create({
      data: {
        startupId,
        sealId: seal.id,
        issuedBy: null,
        metadata: { source: 'auto', trigger: 'fast_deploy' },
      },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private toCatalogDto(s: {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    imagePath: string;
    category: string;
  }): SealCatalogItemDto {
    return {
      id: s.id,
      slug: s.slug,
      name: s.name,
      description: s.description ?? undefined,
      imagePath: s.imagePath,
      category: s.category,
    };
  }
}
