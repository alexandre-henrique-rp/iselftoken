import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionService } from 'src/auth/session/session.service';
import { EmailRenderService, RenderedEmail } from './email-render.service';
import { validateNoPII } from './lgpd-email-template.validator';
import { CreateVersionDto } from './dto/create-version.dto';
import { UpdateVersionDto } from './dto/update-version.dto';
import { CreateTemplateDto } from './dto/create-template.dto';

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'email-template:active:';

export interface EmailTemplateSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  currentVersion: {
    id: string;
    version: number;
    subject: string;
    status: string;
    publishedAt: Date | null;
  } | null;
  createdAt: Date;
}

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
    private readonly render: EmailRenderService,
  ) {}

  // ─── renderBySlug ─────────────────────────────────────────────────────────

  /**
   * Fetches a template by slug from the database and renders it with provided data.
   * Returns null if template not found (no throw) — caller can fall back.
   */
  async renderBySlug(
    slug: string,
    data: Record<string, any>,
  ): Promise<RenderedEmail | null> {
    try {
      const template = await this.prisma.emailTemplate.findUnique({
        where: { slug },
        include: { currentVersion: true },
      });

      if (!template || !template.currentVersion) {
        return null;
      }

      const v = template.currentVersion;
      return this.render.render(
        v.htmlTemplate,
        v.textTemplate,
        v.subject,
        v.variablesSchema as Record<string, any>,
        data,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to render db template '${slug}', will use fallback: ${error.message}`,
      );
      return null;
    }
  }

  // ─── getActiveBySlug ───────────────────────────────────────────────────────

  /**
   * Returns the active (published) version of a template, with Redis cache.
   */
  async getActiveBySlug(slug: string): Promise<RenderedEmail> {
    const cacheKey = `${CACHE_PREFIX}${slug}`;

    // Try cache first
    try {
      const cached = await this.session.getRedisClient().get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for template '${slug}'`);
        return JSON.parse(cached) as RenderedEmail;
      }
    } catch {
      // Redis unavailable — continue without cache
    }

    const template = await this.prisma.emailTemplate.findUnique({
      where: { slug },
      include: {
        currentVersion: true,
      },
    });

    if (!template || !template.currentVersion) {
      throw new NotFoundException(
        `Template '${slug}' nao encontrado ou sem versao publicada`,
      );
    }

    const v = template.currentVersion;
    const rendered = this.render.render(
      v.htmlTemplate,
      v.textTemplate,
      v.subject,
      v.variablesSchema as Record<string, any>,
      {}, // No data provided — return template structure
    );

    // Cache result
    try {
      await this.session
        .getRedisClient()
        .set(cacheKey, JSON.stringify(rendered), 'EX', CACHE_TTL);
    } catch {
      // Redis unavailable — continue without cache
    }

    return rendered;
  }

  // ─── getBySlug ────────────────────────────────────────────────────────────

  async getBySlug(slug: string) {
    const template = await this.prisma.emailTemplate.findUnique({
      where: { slug },
      include: {
        versions: { orderBy: { version: 'desc' } },
        currentVersion: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Template '${slug}' nao encontrado`);
    }

    return template;
  }

  // ─── listAll ─────────────────────────────────────────────────────────────

  async listAll(): Promise<EmailTemplateSummary[]> {
    const templates = await this.prisma.emailTemplate.findMany({
      orderBy: { name: 'asc' },
      take: 100,
      include: {
        currentVersion: {
          select: {
            id: true,
            version: true,
            subject: true,
            status: true,
            publishedAt: true,
          },
        },
      },
    });

    return templates.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description,
      isActive: t.isActive,
      currentVersion: t.currentVersion
        ? {
            id: t.currentVersion.id,
            version: t.currentVersion.version,
            subject: t.currentVersion.subject,
            status: t.currentVersion.status,
            publishedAt: t.currentVersion.publishedAt,
          }
        : null,
      createdAt: t.createdAt,
    }));
  }

  // ─── createTemplate ───────────────────────────────────────────────────────

  async createTemplate(dto: CreateTemplateDto, userId: number) {
    const existing = await this.prisma.emailTemplate.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new BadRequestException(
        `Já existe um template com o slug '${dto.slug}'`,
      );
    }

    const defaultHtml =
      dto.htmlTemplate ??
      `<h2 style="color: #1f2937; margin-bottom: 20px;">${dto.subject}</h2>\n<p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>\n<p style="margin-bottom: 16px;">Este é um novo e-mail da iSelfToken.</p>\n<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`;

    const defaultText =
      dto.textTemplate ??
      `${dto.subject}\n\nOlá {{userName}},\n\nEste é um novo e-mail da iSelfToken.\n\nAtenciosamente,\nEquipe iSelfToken`;

    // LGPD check
    validateNoPII(defaultHtml, dto.subject, defaultText);

    const variablesSchema = dto.variablesSchema ?? {
      type: 'object',
      properties: {
        userName: { type: 'string' },
      },
      required: ['userName'],
      additionalProperties: true,
    };

    const template = await this.prisma.emailTemplate.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        isActive: true,
        createdByUserId: userId,
      },
    });

    const version = await this.prisma.emailTemplateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        subject: dto.subject,
        htmlTemplate: defaultHtml,
        textTemplate: defaultText,
        variablesSchema: variablesSchema as any,
        status: 'DRAFT',
        changeNote: 'Criação inicial do template',
        createdByUserId: userId,
      },
    });

    const updatedTemplate = await this.prisma.emailTemplate.update({
      where: { id: template.id },
      data: { currentVersionId: version.id },
      include: {
        versions: true,
        currentVersion: true,
      },
    });

    this.logger.log(
      `EmailTemplate '${dto.slug}' criado com versão inicial v1 (DRAFT) pelo usuário ${userId}`,
    );

    return updatedTemplate;
  }

  // ─── createDraft ────────────────────────────────────────────────────────

  async createDraft(slug: string, dto: CreateVersionDto, userId: number) {
    // LGPD check
    validateNoPII(dto.htmlTemplate, dto.subject, dto.textTemplate);

    // Get or create template
    let template = await this.prisma.emailTemplate.findUnique({
      where: { slug },
    });

    if (!template) {
      template = await this.prisma.emailTemplate.create({
        data: {
          slug,
          name: slug
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          createdByUserId: userId,
        },
      });
    }

    // Get next version number
    const lastVersion = await this.prisma.emailTemplateVersion.findFirst({
      where: { templateId: template.id },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    const version = await this.prisma.emailTemplateVersion.create({
      data: {
        templateId: template.id,
        version: nextVersion,
        subject: dto.subject,
        htmlTemplate: dto.htmlTemplate,
        textTemplate: dto.textTemplate,
        variablesSchema: dto.variablesSchema as any,
        status: 'DRAFT',
        changeNote: dto.changeNote ?? null,
        createdByUserId: userId,
      },
    });

    this.logger.log(
      `Draft v${nextVersion} created for template '${slug}' by user ${userId}`,
    );

    return version;
  }

  // ─── updateDraft ────────────────────────────────────────────────────────

  async updateDraft(
    slug: string,
    versionId: string,
    dto: UpdateVersionDto,
    userId: number,
  ) {
    const version = await this.prisma.emailTemplateVersion.findUnique({
      where: { id: versionId },
      include: { template: true },
    });

    if (!version) {
      throw new NotFoundException(`Versao ${versionId} nao encontrada`);
    }

    if (version.template.slug !== slug) {
      throw new BadRequestException('Versao nao pertence a este template');
    }

    if (version.status !== 'DRAFT') {
      throw new BadRequestException('Apenas versoes DRAFT podem ser editadas');
    }

    // LGPD check
    if (dto.htmlTemplate || dto.subject || dto.textTemplate) {
      validateNoPII(
        dto.htmlTemplate ?? version.htmlTemplate,
        dto.subject ?? version.subject,
        dto.textTemplate ?? version.textTemplate,
      );
    }

    const updated = await this.prisma.emailTemplateVersion.update({
      where: { id: versionId },
      data: {
        subject: dto.subject ?? version.subject,
        htmlTemplate: dto.htmlTemplate ?? version.htmlTemplate,
        textTemplate: dto.textTemplate ?? version.textTemplate,
        variablesSchema: dto.variablesSchema
          ? (dto.variablesSchema as any)
          : version.variablesSchema,
        changeNote: dto.changeNote ?? version.changeNote,
      },
    });

    this.logger.log(
      `Draft v${version.version} updated for template '${slug}' by user ${userId}`,
    );

    return updated;
  }

  // ─── publishVersion ──────────────────────────────────────────────────────

  async publishVersion(slug: string, versionId: string, userId: number) {
    const version = await this.prisma.emailTemplateVersion.findUnique({
      where: { id: versionId },
      include: { template: true },
    });

    if (!version) {
      throw new NotFoundException(`Versao ${versionId} nao encontrada`);
    }

    if (version.template.slug !== slug) {
      throw new BadRequestException('Versao nao pertence a este template');
    }

    if (version.status !== 'DRAFT') {
      throw new BadRequestException(
        'Apenas versoes DRAFT podem ser publicadas',
      );
    }

    // LGPD final check before publish
    validateNoPII(version.htmlTemplate, version.subject, version.textTemplate);

    // Transaction: mark version PUBLISHED + update template.currentVersionId
    const [, updated] = await this.prisma.$transaction([
      // Mark all other versions of this template as ARCHIVED
      this.prisma.emailTemplateVersion.updateMany({
        where: { templateId: version.templateId, status: 'PUBLISHED' },
        data: { status: 'ARCHIVED' },
      }),
      // Publish this version
      this.prisma.emailTemplateVersion.update({
        where: { id: versionId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          publishedByUserId: userId,
        },
      }),
      // Update template's currentVersionId
      this.prisma.emailTemplate.update({
        where: { id: version.templateId },
        data: { currentVersionId: versionId },
      }),
    ]);

    // Invalidate cache
    await this.invalidateCache(slug);

    this.logger.log(
      `Version v${version.version} of template '${slug}' published by user ${userId}`,
    );

    return updated;
  }

  // ─── getVersion ──────────────────────────────────────────────────────────

  async getVersion(slug: string, versionId: string) {
    const version = await this.prisma.emailTemplateVersion.findUnique({
      where: { id: versionId },
      include: { template: true },
    });

    if (!version) {
      throw new NotFoundException(`Versao ${versionId} nao encontrada`);
    }

    if (version.template.slug !== slug) {
      throw new BadRequestException('Versao nao pertence a este template');
    }

    return version;
  }

  // ─── previewVersion ──────────────────────────────────────────────────────

  async previewVersion(
    slug: string,
    versionId: string,
    data: Record<string, any>,
  ) {
    const version = await this.prisma.emailTemplateVersion.findUnique({
      where: { id: versionId },
      include: { template: true },
    });

    if (!version) {
      throw new NotFoundException(`Versao ${versionId} nao encontrada`);
    }

    if (version.template.slug !== slug) {
      throw new BadRequestException('Versao nao pertence a este template');
    }

    return this.render.render(
      version.htmlTemplate,
      version.textTemplate,
      version.subject,
      version.variablesSchema as Record<string, any>,
      data,
    );
  }

  // ─── invalidateCache ────────────────────────────────────────────────────

  private async invalidateCache(slug: string): Promise<void> {
    const cacheKey = `${CACHE_PREFIX}${slug}`;
    try {
      await this.session.getRedisClient().del(cacheKey);
      this.logger.debug(`Cache invalidated for template '${slug}'`);
    } catch {
      // Redis unavailable — ignore
    }
  }
}
