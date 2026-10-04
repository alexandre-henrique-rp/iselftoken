/**
 * CouponService - Gestão de cupons de desconto com transação atômica.
 *
 * Responsabilidades:
 * - CRUD de cupons (admin)
 * - Aplicação transacional de cupons compatível com SQLite
 * - Validação de cupons (public endpoint)
 * - Auditoria LGPD em todas as operações
 *
 * Regras de negócio:
 * - Percentual: apenas [20, 30, 50, 60, 100]
 * - Código: uppercase, sem espaços, ^[A-Z0-9_-]{3,32}$
 * - maxUses=null significa ilimitado
 * - Cupom pode ter validFrom (ainda não válido) e validUntil (expirado)
 * - UNIQUE(couponId, paymentId) garante idempotência
 *
 * @service CouponService
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from 'src/common/audit/audit.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentService } from '../payment.service';
import { throwCouponError } from './coupon-errors.catalog';
import { CouponSettlementService } from './coupon-settlement.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';

export interface CouponWithUsages {
  id: number;
  code: string;
  percent: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: Date | null;
  validUntil: Date | null;
  active: boolean;
  description: string | null;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXHAUSTED';
  /** Projeção derivada de CouponUsage/Payment para consultas administrativas. */
  confirmedCount?: number;
  reservedCount?: number;
  availableCount?: number | null;
  usages: Array<{
    id: number;
    couponId: number;
    userId: number;
    paymentId: number | null;
    discountApplied: Prisma.Decimal;
    originalAmount: Prisma.Decimal;
    finalAmount: Prisma.Decimal;
    appliedAt: Date;
  }>;
}

@Injectable()
export class CouponService {
  private readonly logger = new Logger(CouponService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly paymentService: PaymentService,
    private readonly couponSettlementService: CouponSettlementService,
  ) {}

  // ============================================
  // ADMIN CRUD
  // ============================================

  /**
   * Cria um novo cupom de desconto.
   * Valida: percent whitelist e code regex.
   */
  async create(
    dto: CreateCouponDto,
    userId: number,
  ): Promise<CouponWithUsages> {
    // Normaliza código: uppercase, sem espaços
    const code = dto.code.toUpperCase().trim();

    // Verifica se código já existe
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException('Código de cupom já existe');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code,
        percent: dto.percent,
        maxUses: dto.maxUses ?? null,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        description: dto.description,
        active: true,
        createdById: userId,
      },
      include: { usages: true },
    });

    // Audit log LGPD
    await this.auditService.log({
      userId,
      action: 'COUPON_CREATED',
      entity: 'Coupon',
      entityId: coupon.id,
      oldValue: undefined,
      newValue: {
        code: coupon.code,
        percent: coupon.percent,
        maxUses: coupon.maxUses,
      } as any,
    });

    this.logger.log(`Cupom criado: ${coupon.code} (${coupon.percent}%)`);
    return coupon as CouponWithUsages;
  }

  private resolveStatus(
    coupon: {
      active: boolean;
      validFrom: Date | null;
      validUntil: Date | null;
      maxUses: number | null;
      usedCount: number;
    },
    now = new Date(),
    reservedCount = 0,
  ): 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'EXHAUSTED' {
    if (!coupon.active) return 'INACTIVE';
    if (coupon.validFrom && coupon.validFrom > now) return 'INACTIVE';
    if (coupon.validUntil && coupon.validUntil < now) return 'EXPIRED';
    if (
      coupon.maxUses !== null &&
      coupon.usedCount + reservedCount >= coupon.maxUses
    ) {
      return 'EXHAUSTED';
    }
    return 'ACTIVE';
  }

  /**
   * Lista cupons com filtros e paginação estável para a Central de Cupons.
   */
  async findAll(filters?: {
    active?: boolean;
    valid?: boolean;
    status?: string;
    search?: string;
    percent?: number;
    page?: number;
    limit?: number;
  }) {
    const now = new Date();
    const page = Math.max(1, Math.floor(filters?.page || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(filters?.limit || 20)));
    const where: Prisma.CouponWhereInput = {};
    const and: Prisma.CouponWhereInput[] = [];

    if (filters?.active !== undefined) where.active = filters.active;
    if (filters?.percent) where.percent = filters.percent;
    if (filters?.search?.trim()) {
      where.code = { contains: filters.search.trim().toUpperCase() };
    }

    if (filters?.valid === true) {
      and.push({
        OR: [
          { validFrom: null, validUntil: null },
          { validFrom: { lte: now }, validUntil: null },
          { validFrom: null, validUntil: { gte: now } },
          { validFrom: { lte: now }, validUntil: { gte: now } },
        ],
      });
    }

    // O status exibido é derivado em memória para manter uma única regra
    // entre status persistido, janela de validade e limite de usos. A
    // paginação acontece depois do filtro derivado para não divergir em
    // casos como cupom expirado e inativo.
    if (and.length > 0) where.AND = and;

    const rows = await this.prisma.coupon.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });

    const usageMetricsByCouponId =
      await this.couponSettlementService.getUsageMetricsByCouponIds(
        rows.map((coupon) => coupon.id),
        now,
      );

    const filteredItems = rows
      .map((coupon) => {
        const metrics = usageMetricsByCouponId.get(coupon.id) ?? {
          confirmed: 0,
          reserved: 0,
          total: 0,
        };
        return {
          ...coupon,
          // `usedCount` é uma projeção confirmada. Reservas não incrementam
          // o contador, mas participam do status e da disponibilidade.
          usedCount: metrics.confirmed,
          confirmedCount: metrics.confirmed,
          reservedCount: metrics.reserved,
          availableCount: this.couponSettlementService.getAvailableCount(
            coupon.maxUses,
            metrics,
          ),
          status: this.resolveStatus(
            { ...coupon, usedCount: metrics.confirmed },
            now,
            metrics.reserved,
          ),
        };
      })
      .filter((coupon) => {
        if (filters?.status === 'active') return coupon.status === 'ACTIVE';
        if (filters?.status === 'inactive') {
          return coupon.status === 'INACTIVE';
        }
        if (filters?.status === 'expired') return coupon.status === 'EXPIRED';
        if (filters?.status === 'exhausted') {
          return coupon.status === 'EXHAUSTED';
        }
        return true;
      });

    const total = filteredItems.length;
    const items = filteredItems.slice((page - 1) * limit, page * limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Busca cupom pelo ID com usages.
   */
  async findById(id: number): Promise<CouponWithUsages> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { usages: { orderBy: { appliedAt: 'desc' } } },
    });

    if (!coupon) {
      throw new NotFoundException(`Cupom #${id} não encontrado`);
    }

    const now = new Date();
    const metrics = await this.couponSettlementService.getUsageMetrics(id, now);

    return {
      ...coupon,
      usedCount: metrics.confirmed,
      confirmedCount: metrics.confirmed,
      reservedCount: metrics.reserved,
      availableCount: this.couponSettlementService.getAvailableCount(
        coupon.maxUses,
        metrics,
      ),
      status: this.resolveStatus(
        {
          active: coupon.active,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          maxUses: coupon.maxUses,
          usedCount: metrics.confirmed,
        },
        now,
        metrics.reserved,
      ),
    } as CouponWithUsages;
  }

  /**
   * Atualiza os dados e o status derivado de um cupom.
   */
  async update(
    id: number,
    dto: UpdateCouponDto,
    userId: number,
  ): Promise<CouponWithUsages> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Cupom #${id} não encontrado`);
    }

    const nextActive = dto.active ?? coupon.active;
    const nextMaxUses =
      dto.maxUses === undefined ? coupon.maxUses : dto.maxUses;
    const nextValidFrom =
      dto.validFrom === undefined
        ? coupon.validFrom
        : dto.validFrom
          ? new Date(dto.validFrom)
          : null;
    const nextValidUntil =
      dto.validUntil === undefined
        ? coupon.validUntil
        : dto.validUntil
          ? new Date(dto.validUntil)
          : null;
    const now = new Date();
    const usageMetrics = await this.couponSettlementService.getUsageMetrics(
      id,
      now,
    );
    const nextStatus = this.resolveStatus(
      {
        active: nextActive,
        validFrom: nextValidFrom,
        validUntil: nextValidUntil,
        maxUses: nextMaxUses,
        usedCount: usageMetrics.confirmed,
      },
      now,
      usageMetrics.reserved,
    );

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        active: nextActive,
        status: nextStatus,
        ...(dto.code !== undefined && { code: dto.code.toUpperCase().trim() }),
        ...(dto.percent !== undefined && { percent: dto.percent }),
        ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
        ...(dto.validFrom !== undefined && { validFrom: nextValidFrom }),
        ...(dto.validUntil !== undefined && { validUntil: nextValidUntil }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { usages: true },
    });

    // Audit log LGPD
    await this.auditService.log({
      userId,
      action: 'COUPON_UPDATED',
      entity: 'Coupon',
      entityId: id,
      oldValue: {
        code: coupon.code,
        active: coupon.active,
        status: coupon.status,
        percent: coupon.percent,
        maxUses: coupon.maxUses,
        validFrom: coupon.validFrom?.toISOString() ?? null,
        validUntil: coupon.validUntil?.toISOString() ?? null,
        description: coupon.description,
      } as any,
      newValue: {
        code: updated.code,
        active: updated.active,
        status: updated.status,
        percent: updated.percent,
        maxUses: updated.maxUses,
        validFrom: updated.validFrom?.toISOString() ?? null,
        validUntil: updated.validUntil?.toISOString() ?? null,
        description: updated.description,
      } as any,
    });

    return {
      ...updated,
      usedCount: usageMetrics.confirmed,
      confirmedCount: usageMetrics.confirmed,
      reservedCount: usageMetrics.reserved,
      availableCount: this.couponSettlementService.getAvailableCount(
        nextMaxUses,
        usageMetrics,
      ),
    } as CouponWithUsages;
  }

  /**
   * Soft delete do cupom, preservando o histórico de utilização.
   */
  async softDelete(id: number, userId: number): Promise<void> {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Cupom #${id} não encontrado`);
    }

    await this.prisma.coupon.update({
      where: { id },
      data: { active: false, status: 'INACTIVE' },
    });

    // Audit log LGPD
    await this.auditService.log({
      userId,
      action: 'COUPON_DELETED',
      entity: 'Coupon',
      entityId: id,
      oldValue: { active: true },
      newValue: { active: false },
    });
  }

  /**
   * Lista histórico de usos de um cupom sem expor email ou ID interno.
   */
  async getUsageHistory(id: number, limit = 50, offset = 0) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Cupom #${id} não encontrado`);
    }

    const safeLimit = Math.min(100, Math.max(1, limit));
    const safeOffset = Math.max(0, offset);
    const now = new Date();
    const [usages, total, metrics] = await Promise.all([
      this.prisma.couponUsage.findMany({
        where: { couponId: id },
        orderBy: { appliedAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
        include: {
          user: { select: { publicId: true } },
          payment: {
            select: {
              status: true,
              paidAt: true,
              expiresAt: true,
            },
          },
        },
      }),
      this.prisma.couponUsage.count({ where: { couponId: id } }),
      this.couponSettlementService.getUsageMetrics(id, now),
    ]);

    const page = Math.floor(safeOffset / safeLimit) + 1;
    return {
      data: usages.map((usage) => ({
        userId: usage.user.publicId,
        userName: 'Usuário identificado',
        paymentStatus: usage.payment?.status ?? null,
        paidAt: usage.payment?.paidAt?.toISOString() ?? null,
        usageStatus: this.couponSettlementService.getUsageState(
          usage.payment,
          now,
        ),
        discountAmount: Number(usage.discountApplied),
        usedAt: usage.appliedAt,
      })),
      // `total` permanece histórico para paginação. Os números operacionais
      // abaixo distinguem confirmação, reserva e capacidade disponível.
      total,
      historicalTotal: total,
      confirmedCount: metrics.confirmed,
      reservedCount: metrics.reserved,
      availableCount: this.couponSettlementService.getAvailableCount(
        coupon.maxUses,
        metrics,
      ),
      page,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  /**
   * Retorna a trilha de ações administrativas do cupom.
   * IPs são redatados e o ator usa publicId para manter a resposta LGPD-safe.
   */
  async getAuditHistory(id: number, limit = 20, offset = 0) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException(`Cupom #${id} não encontrado`);
    }

    const safeLimit = Math.min(100, Math.max(1, limit));
    const safeOffset = Math.max(0, offset);
    const usageReferences =
      (await this.prisma.couponUsage.findMany({
        where: { couponId: id },
        select: { id: true, paymentId: true },
      })) ?? [];
    const usageAuditIds = usageReferences.map(({ id: usageId }) =>
      String(usageId),
    );
    const paymentAuditIds = usageReferences
      .map(({ paymentId }) => paymentId)
      .filter((paymentId): paymentId is number => paymentId !== null)
      .map((paymentId) => String(paymentId));
    const auditWhere: Prisma.AuditLogWhereInput = {
      OR: [
        { entity: 'Coupon', entityId: String(id) },
        ...(usageAuditIds.length > 0
          ? [
              {
                entity: 'CouponUsage',
                entityId: { in: usageAuditIds },
                action: 'COUPON_APPLIED',
              },
            ]
          : []),
        ...(paymentAuditIds.length > 0
          ? [
              {
                entity: 'Payment',
                entityId: { in: paymentAuditIds },
                // Inclui a confirmação posterior do pagamento, inclusive
                // aprovações manuais, para a auditoria do cupom permanecer
                // útil depois que a reserva vira uso confirmado.
                action: {
                  in: [
                    'PAYMENT_PAID_BY_COUPON',
                    'PAYMENT_PAID',
                    'PAYMENT_MANUAL_APPROVED',
                  ],
                },
              },
            ]
          : []),
      ],
    };
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: auditWhere,
        orderBy: { createdAt: 'desc' },
        take: safeLimit,
        skip: safeOffset,
        include: { user: { select: { publicId: true } } },
      }),
      this.prisma.auditLog.count({ where: auditWhere }),
    ]);

    const page = Math.floor(safeOffset / safeLimit) + 1;
    return {
      data: logs.map((log) => ({
        action: log.action,
        actor: log.user?.publicId ?? 'Sistema',
        actorId: log.user?.publicId ?? null,
        timestamp: log.createdAt,
        ip: this.redactIp(log.ip),
        before: this.redactAuditSnapshot(log.oldValue),
        after: this.redactAuditSnapshot(log.newValue),
      })),
      total,
      page,
      limit: safeLimit,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  private redactAuditSnapshot(value: unknown): Record<string, unknown> | null {
    const redacted = this.redactAuditValue(value);
    return redacted && typeof redacted === 'object' && !Array.isArray(redacted)
      ? (redacted as Record<string, unknown>)
      : null;
  }

  private redactAuditValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactAuditValue(item));
    }

    if (!value || typeof value !== 'object') return value;

    const internalKeys = new Set([
      'id',
      'couponId',
      'paymentId',
      'userId',
      'entityId',
    ]);

    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !internalKeys.has(key))
        .map(([key, nestedValue]) => [key, this.redactAuditValue(nestedValue)]),
    );
  }

  private redactIp(ip: string | null): string | null {
    if (!ip) return null;
    if (ip.includes(':')) return `${ip.split(':').slice(0, 2).join(':')}:…`;
    const parts = ip.split('.');
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.x.x` : 'redatado';
  }

  /**
   * Bulk create coupons.
   */
  async bulkCreate(
    coupons: CreateCouponDto[],
    userId: number,
  ): Promise<{ created: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let created = 0;
    let failed = 0;

    for (const dto of coupons) {
      try {
        await this.create(dto, userId);
        created++;
      } catch (error) {
        failed++;
        errors.push(
          `code=${dto.code}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return { created, failed, errors };
  }

  // ============================================
  // PUBLIC - Listar cupons disponíveis
  // ============================================

  /**
   * Lista cupons ativos e não expirados para o usuário.
   * A disponibilidade considera usos confirmados e reservas PENDING vigentes;
   * registros cancelados ou expirados permanecem no histórico, mas liberam a
   * capacidade do cupom.
   */
  async findAvailable(): Promise<CouponWithUsages[]> {
    const now = new Date();
    const coupons = await this.prisma.coupon.findMany({
      where: {
        active: true,
        OR: [
          { validFrom: null, validUntil: null },
          { validFrom: { lte: now }, validUntil: null },
          { validFrom: null, validUntil: { gte: now } },
          { validFrom: { lte: now }, validUntil: { gte: now } },
        ],
      },
      orderBy: { percent: 'desc' },
    });
    const metricsByCouponId =
      await this.couponSettlementService.getUsageMetricsByCouponIds(
        coupons.map((coupon) => coupon.id),
        now,
      );

    return coupons
      .map((coupon) => {
        const metrics = metricsByCouponId.get(coupon.id) ?? {
          confirmed: 0,
          reserved: 0,
          total: 0,
        };
        return {
          ...coupon,
          usedCount: metrics.confirmed,
          confirmedCount: metrics.confirmed,
          reservedCount: metrics.reserved,
          availableCount: this.couponSettlementService.getAvailableCount(
            coupon.maxUses,
            metrics,
          ),
          status: this.resolveStatus(
            { ...coupon, usedCount: metrics.confirmed },
            now,
            metrics.reserved,
          ),
        };
      })
      .filter(
        (coupon) =>
          coupon.maxUses === null ||
          coupon.confirmedCount + coupon.reservedCount < coupon.maxUses,
      ) as unknown as CouponWithUsages[];
  }

  // ============================================
  // USER - Aplicar cupom a pagamento
  // ============================================

  /**
   * Aplica cupom a um pagamento (transação atômica compatível com SQLite).
   *
   * Etapas:
   * 1. Busca o cupom com Prisma dentro da transação
   * 2. Validações de cupom (ativo, não expirado, não esgotado)
   * 3. Validação de payment (pendente, pertence ao usuário)
   * 4. Idempotência via UNIQUE(couponId, paymentId)
   * 5. Calcula desconto
   * 6. Atualiza o payment por CAS
   * 7. Cria CouponUsage como reserva histórica
   * 8. Liquida o contador apenas quando o Payment possui paidAt
   * 9. Audit log LGPD
   */
  private async ensureCouponCapacity(
    coupon: { id: number; maxUses: number | null },
    now: Date,
    db: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    if (coupon.maxUses === null) return;

    const metrics = await this.couponSettlementService.getUsageMetrics(
      coupon.id,
      now,
      db,
    );
    if (metrics.confirmed + metrics.reserved >= coupon.maxUses) {
      throwCouponError('cupom_esgotado');
    }
  }

  private async validateCouponApplication(
    normalizedCode: string,
    paymentId: number,
    userId: number,
  ): Promise<{ pixTxid: string | null }> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        maxUses: true,
        usedCount: true,
        validFrom: true,
        validUntil: true,
        active: true,
      },
    });

    if (!coupon) throwCouponError('cupom_nao_encontrado');
    if (!coupon.active) {
      throwCouponError('cupom_inativo');
    }
    if (coupon.validFrom && coupon.validFrom > new Date()) {
      throwCouponError('cupom_ainda_nao_valido');
    }
    if (coupon.validUntil && coupon.validUntil < new Date()) {
      throwCouponError('cupom_expirado');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        userId: true,
        status: true,
        method: true,
        txid: true,
        efiChargeId: true,
        efiLocation: true,
        expiresAt: true,
      },
    });

    if (!payment) throw new NotFoundException('Pagamento não encontrado');
    if (payment.userId !== userId) {
      throw new ForbiddenException('Pagamento não pertence ao usuário');
    }
    if (payment.status !== 'PENDING') {
      throwCouponError('pagamento_nao_pendente');
    }
    if (payment.expiresAt && payment.expiresAt <= new Date()) {
      throwCouponError('pagamento_expirado');
    }

    const existing = await this.prisma.couponUsage.findUnique({
      where: { couponId_paymentId: { couponId: coupon.id, paymentId } },
    });
    if (existing) throwCouponError('cupom_ja_aplicado');

    const otherCouponUsage = await this.prisma.couponUsage.findFirst({
      where: { paymentId, couponId: { not: coupon.id } },
      select: { couponId: true },
    });
    if (otherCouponUsage) {
      throwCouponError('pagamento_com_cupom_aplicado');
    }

    await this.ensureCouponCapacity(coupon, new Date());

    const isPixCharge = payment.method === 'PIX' && Boolean(payment.txid);
    const hasIssuanceLock = payment.efiLocation?.startsWith('__issuing__');
    const hasAnotherCharge =
      Boolean(payment.efiChargeId) ||
      (Boolean(payment.efiLocation) && !isPixCharge);

    if (hasIssuanceLock || hasAnotherCharge || (payment.txid && !isPixCharge)) {
      throwCouponError('cobranca_ja_emitida');
    }

    return { pixTxid: isPixCharge ? payment.txid : null };
  }

  async apply(couponCode: string, paymentId: number, userId: number) {
    const normalizedCode = couponCode.toUpperCase().trim();
    const preflight = await this.validateCouponApplication(
      normalizedCode,
      paymentId,
      userId,
    );

    // A cobrança PIX existente precisa ser cancelada antes de alterar o
    // valor local. Se a EFI falhar, a transação do cupom nem começa e o QR
    // antigo continua válido.
    if (preflight.pixTxid) {
      await this.paymentService.cancelAndClearPixCharge(
        paymentId,
        userId,
        preflight.pixTxid,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // SQLite não oferece bloqueio de linha via SQL; a transação Prisma mantém
      // a leitura e as escritas no mesmo contexto.
      const coupon = await tx.coupon.findUnique({
        where: { code: normalizedCode },
        select: {
          id: true,
          code: true,
          percent: true,
          maxUses: true,
          usedCount: true,
          validFrom: true,
          validUntil: true,
          active: true,
        },
      });

      if (!coupon) {
        throwCouponError('cupom_nao_encontrado');
      }

      if (!coupon.active) {
        throwCouponError('cupom_inativo');
      }

      if (coupon.validFrom && coupon.validFrom > new Date()) {
        throwCouponError('cupom_ainda_nao_valido');
      }

      if (coupon.validUntil && coupon.validUntil < new Date()) {
        throwCouponError('cupom_expirado');
      }

      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) {
        throw new NotFoundException('Pagamento não encontrado');
      }
      if (payment.userId !== userId) {
        throw new ForbiddenException('Pagamento não pertence ao usuário');
      }
      if (payment.status !== 'PENDING') {
        throwCouponError('pagamento_nao_pendente');
      }

      const transactionNow = new Date();
      if (payment.expiresAt && payment.expiresAt <= transactionNow) {
        throwCouponError('pagamento_expirado');
      }
      if (payment.txid || payment.efiChargeId || payment.efiLocation) {
        throwCouponError('cobranca_ja_emitida');
      }

      // S18.6 — checkout consolidado. Detecta o Payment irmão compartilhando
      // o mesmo txid PIX para ratear o desconto proporcionalmente entre os
      // 2 itens. Existem 2 formas de bundling atualmente:
      //   - TOKEN_RESERVATION + FAST_TRACK_REVIEW → startupDraftFastTrack
      //     relation (vinculados pelo mesmo StartupDraft no wizard de nova
      //     startup — /founder/startups/new).
      //   - COMPLIANCE_FEE + FAST_DEPLOY → compartilham `campaignId` (a
      //     Publicação Rápida é contratada quando o founder quita a Taxa de
      //     Compliance em /founder/campaigns/:id/financeiro).
      // Os 2 caminhos são mutuamente exclusivos (o primary nunca é ambos
      // os purposes ao mesmo tempo). O coupon continua vinculado APENAS ao
      // Payment principal no CouponUsage (1 registro por cupom × checkout).
      const siblingFastTrackFromDraft = await tx.payment.findFirst({
        where: {
          startupDraftFastTrack: { paymentId: paymentId } as any,
          status: 'PENDING',
        },
        select: { id: true, amount: true, purpose: true },
      });
      const siblingFastTrackFromCampaign =
        payment.purpose === 'COMPLIANCE_FEE' && payment.campaignId
          ? await tx.payment.findFirst({
              where: {
                campaignId: payment.campaignId,
                purpose: 'FAST_DEPLOY',
                status: 'PENDING',
                id: { not: paymentId },
              },
              select: { id: true, amount: true, purpose: true },
            })
          : null;
      // Variável única consumida pelo rateio abaixo — cobre qualquer um dos
      // 2 caminhos. O nome preservado (`siblingFastTrack`) evita churn no
      // restante do método.
      const siblingFastTrack =
        siblingFastTrackFromDraft ?? siblingFastTrackFromCampaign;

      const existing = await tx.couponUsage.findUnique({
        where: { couponId_paymentId: { couponId: coupon.id, paymentId } },
      });
      if (existing) {
        throwCouponError('cupom_ja_aplicado');
      }

      const otherCouponUsage = await tx.couponUsage.findFirst({
        where: { paymentId, couponId: { not: coupon.id } },
        select: { couponId: true },
      });
      if (otherCouponUsage) {
        throwCouponError('pagamento_com_cupom_aplicado');
      }

      await this.ensureCouponCapacity(coupon, transactionNow, tx);

      // O desconto é calculado somente no backend. Para o cupom integral, a
      // própria transação confirma a ordem sem criar uma cobrança na EFI.
      const primaryOriginal = new Prisma.Decimal(
        payment.amount,
      ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      if (primaryOriginal.lte(0)) {
        throwCouponError('pagamento_valor_invalido');
      }

      // Total original = primary + sibling (se houver). O desconto é aplicado
      // sobre o total e depois rateado proporcionalmente ao originalAmount de
      // cada item (rounding HALF_EVEN; o residual de 1 centavo vai pro primary
      // para garantir que soma(finalAmounts) === soma(originalAmounts) - discount).
      const siblingOriginal = siblingFastTrack
        ? new Prisma.Decimal(siblingFastTrack.amount).toDecimalPlaces(
            2,
            Prisma.Decimal.ROUND_HALF_EVEN,
          )
        : new Prisma.Decimal(0);
      const totalOriginal = primaryOriginal.plus(siblingOriginal);
      const totalFinal = totalOriginal
        .mul(new Prisma.Decimal(100).minus(coupon.percent))
        .div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const totalDiscount = totalOriginal
        .minus(totalFinal)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);

      // Rateio proporcional: fast_track = floor(...) e primary absorve o residual.
      const ratio = (numerator: Prisma.Decimal, denominator: Prisma.Decimal) =>
        denominator.eq(0)
          ? new Prisma.Decimal(0)
          : numerator
              .mul(totalDiscount)
              .div(denominator)
              .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const siblingDiscount = siblingFastTrack
        ? ratio(siblingOriginal, totalOriginal)
        : new Prisma.Decimal(0);
      const primaryDiscount = totalDiscount.sub(siblingDiscount);

      const primaryFinal = primaryOriginal
        .minus(primaryDiscount)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      const siblingFinal = siblingFastTrack
        ? siblingOriginal
            .minus(siblingDiscount)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN)
        : new Prisma.Decimal(0);

      const isCouponIntegral =
        coupon.percent === 100 && totalOriginal.gt(0) && totalFinal.eq(0);

      if (totalFinal.lte(0) && !isCouponIntegral) {
        throwCouponError('pagamento_valor_invalido');
      }

      // Mantém nomes semânticos para o resto do fluxo (logs / retorno).
      // `originalAmount`/`finalAmount`/`discount` continuam representando o
      // Payment principal — `totalOriginal`/`totalFinal`/`totalDiscount`
      // (acima) representam o checkout consolidado. O CouponUsage e o
      // AuditLog registram ambos os níveis para auditoria.
      const finalAmount = primaryFinal;
      const discount = primaryDiscount;

      const paidAt = isCouponIntegral ? transactionNow : null;

      // Atualiza por CAS antes de registrar o cupom. Se uma emissão tiver
      // adquirido o lock EFI, tudo é revertido e nenhum uso é contabilizado.
      const currentServiceDetails = (payment.serviceDetails as any) ?? {};
      const paymentUpdate = await tx.payment.updateMany({
        where: {
          id: paymentId,
          userId,
          amount: payment.amount,
          status: 'PENDING',
          txid: null,
          efiChargeId: null,
          efiLocation: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: transactionNow } }],
        },
        data: {
          amount: finalAmount,
          discountAmount: Number(primaryDiscount.toFixed(2)),
          paidAmount: Number(primaryFinal.toFixed(2)),
          ...(isCouponIntegral
            ? {
                status: 'PAID',
                paidAt,
              }
            : {}),
          serviceDetails: {
            ...currentServiceDetails,
            couponCode: coupon.code,
            couponId: coupon.id,
            percent: coupon.percent,
            discountApplied: Number(discount.toFixed(2)),
            ...(siblingFastTrack
              ? {
                  // S18.6 — espelho do desconto no sibling Fast Track para
                  // que ambos os Payments tenham o breakdown consistente
                  // na auditoria + relatórios.
                  siblingDiscountAmount: Number(siblingDiscount.toFixed(2)),
                  siblingFinalAmount: Number(siblingFinal.toFixed(2)),
                }
              : {}),
            ...(isCouponIntegral
              ? {
                  couponSettlement: {
                    type: 'COUPON_100',
                    couponId: coupon.id,
                    percent: coupon.percent,
                    settledAt: paidAt?.toISOString(),
                  },
                }
              : {}),
          } as any,
        },
      });

      if (paymentUpdate.count !== 1) {
        const currentPayment = await tx.payment.findUnique({
          where: { id: paymentId },
          select: { expiresAt: true },
        });
        if (
          currentPayment?.expiresAt &&
          currentPayment.expiresAt <= new Date()
        ) {
          throwCouponError('pagamento_expirado');
        }
        throwCouponError('cobranca_ja_emitida');
      }

      // S18.6 — rateia o desconto proporcionalmente ao Payment irmão
      // (FAST_TRACK_REVIEW). Mantém `originalAmount`/`discountAmount`/
      // `paidAmount` consistentes nos 2 Payments para auditoria.
      if (siblingFastTrack) {
        const siblingUpdate = await tx.payment.updateMany({
          where: {
            id: siblingFastTrack.id,
            userId,
            amount: siblingFastTrack.amount,
            status: 'PENDING',
            txid: null,
            efiChargeId: null,
            efiLocation: null,
          },
          data: {
            amount: siblingFinal,
            discountAmount: Number(siblingDiscount.toFixed(2)),
            paidAmount: Number(siblingFinal.toFixed(2)),
            ...(isCouponIntegral
              ? {
                  status: 'PAID',
                  paidAt,
                }
              : {}),
            serviceDetails: {
              ...((siblingFastTrack as any).serviceDetails ?? {}),
              couponCode: coupon.code,
              couponId: coupon.id,
              percent: coupon.percent,
              discountApplied: Number(siblingDiscount.toFixed(2)),
              ...(isCouponIntegral
                ? {
                    couponSettlement: {
                      type: 'COUPON_100',
                      couponId: coupon.id,
                      percent: coupon.percent,
                      settledAt: paidAt?.toISOString(),
                    },
                  }
                : {}),
            } as any,
          },
        });
        if (siblingUpdate.count !== 1) {
          throwCouponError('cobranca_ja_emitida');
        }
      }

      // A reserva é registrada para todos os descontos. O contador só é
      // recalculado agora quando o cupom integral já deixou o Payment PAID;
      // descontos parciais serão liquidados no pipeline de confirmação.
      // S18.6 — `discountApplied`/`originalAmount`/`finalAmount` registram o
      // TOTAL do checkout consolidado (primary + sibling), enquanto o
      // breakdown por item fica em `serviceDetails.siblingDiscountAmount`
      // no Payment principal e nos próprios campos do sibling Payment.
      const usage = await tx.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId,
          paymentId,
          discountApplied: totalDiscount,
          originalAmount: totalOriginal,
          finalAmount: totalFinal,
        },
      });

      if (isCouponIntegral) {
        await this.couponSettlementService.settlePayment(paymentId, tx);
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: isCouponIntegral
            ? 'PAYMENT_PAID_BY_COUPON'
            : 'COUPON_APPLIED',
          entity: 'Coupon',
          entityId: String(coupon.id),
          oldValue: {
            amount: Number(totalOriginal.toFixed(2)),
            status: 'PENDING',
          } as any,
          newValue: {
            amount: Number(totalFinal.toFixed(2)),
            discount: Number(totalDiscount.toFixed(2)),
            primaryDiscount: Number(primaryDiscount.toFixed(2)),
            siblingDiscount: siblingFastTrack
              ? Number(siblingDiscount.toFixed(2))
              : null,
            status: isCouponIntegral ? 'PAID' : 'PENDING',
            usageState: isCouponIntegral ? 'CONFIRMED' : 'RESERVED',
            couponId: coupon.id,
            paymentId,
          } as any,
        },
      });

      this.logger.log(
        `Cupom ${coupon.code} aplicado ao checkout consolidado #${paymentId}` +
          (siblingFastTrack
            ? ` (primary=${paymentId}, sibling=${siblingFastTrack.id})`
            : '') +
          `: desconto total=${totalDiscount.toFixed(2)}` +
          ` (primary=${primaryDiscount.toFixed(2)}` +
          (siblingFastTrack
            ? `, sibling=${siblingDiscount.toFixed(2)})`
            : ')') +
          `, final=${totalFinal.toFixed(2)}, integral=${isCouponIntegral}`,
      );

      return {
        ...usage,
        percent: coupon.percent,
        completion: isCouponIntegral ? ('COUPON_100' as const) : null,
        payment: {
          id: paymentId,
          amount: finalAmount,
          status: isCouponIntegral ? ('PAID' as const) : ('PENDING' as const),
          paidAt,
        },
      };
    });

    return {
      ...result,
      pixReissueRequired: Boolean(preflight.pixTxid),
    };
  }
  // ============================================

  /**
   * Lista histórico de cupons usados por um usuário.
   */
  async getUserUsageHistory(userId: number, limit = 20, offset = 0) {
    const now = new Date();
    const [usages, total] = await Promise.all([
      this.prisma.couponUsage.findMany({
        where: { userId },
        orderBy: { appliedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          coupon: { select: { code: true, percent: true } },
          payment: {
            select: { status: true, paidAt: true, expiresAt: true },
          },
        },
      }),
      this.prisma.couponUsage.count({ where: { userId } }),
    ]);

    return {
      usages: usages.map((usage) => ({
        couponCode: usage.coupon.code,
        percent: usage.coupon.percent,
        discountAmount: Number(usage.discountApplied),
        appliedAt: usage.appliedAt,
        paymentStatus: usage.payment?.status ?? null,
        paidAt: usage.payment?.paidAt?.toISOString() ?? null,
        usageStatus: this.couponSettlementService.getUsageState(
          usage.payment,
          now,
        ),
      })),
      total,
      limit,
      offset,
    };
  }
}
