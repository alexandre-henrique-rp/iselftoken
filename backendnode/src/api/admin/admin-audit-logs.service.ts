import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogItem {
  id: number;
  action: string;
  entity: string;
  entityId: string;
  userId: number | null;
  userName: string | null;
  oldValue: unknown;
  newValue: unknown;
  ip: string | null;
  createdAt: Date;
}

/**
 * Service para consulta genérica de AuditLog no painel compliance.
 * Diferente do endpoint específico de /admin/compliance/audit-logs/delete
 * (que lista apenas StartupDeleteAuditLog), este retorna AuditLog geral
 * filtrado por entity + entityId — usado para timeline de decisões
 * no detalhe de uma startup ou campanha.
 */
@Injectable()
export class AdminAuditLogsService {
  private readonly logger = new Logger(AdminAuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listByEntity(
    entity: string,
    entityId: string,
    limit = 50,
  ): Promise<AuditLogItem[]> {
    if (!entity || !entityId) return [];

    const rows = await this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = Array.from(
      new Set(
        rows
          .map((r) => r.userId)
          .filter((id): id is number => id !== null && id !== undefined),
      ),
    );
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, nome: true },
        })
      : [];
    const nameById = new Map(users.map((u) => [u.id, u.nome]));

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      userId: r.userId,
      userName: r.userId !== null ? (nameById.get(r.userId) ?? null) : null,
      oldValue: r.oldValue as unknown,
      newValue: r.newValue as unknown,
      ip: r.ip,
      createdAt: r.createdAt,
    }));
  }
}
