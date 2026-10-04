/**
 * S4-T01 — PinService
 *
 * Regras (PRD_MARKETPLACE_IMPL.md §4.3, §4.4 + RF-02/RF-03/RF-10):
 *  - POST valida reason >= 20 chars (400 BAD_REQUEST se menor)
 *  - POST conta pinos ativos antes de inserir; 409 MAX_PINNED_EXCEEDED se >= 3
 *  - POST seta manuallyPinned=true, manuallyPinnedBy=actorId,
 *         manuallyPinnedAt=now, manuallyPinnedReason=reason
 *  - DELETE seta manuallyPinned=false e limpa campos (mantem reason em audit)
 *  - Cada acao cria AuditLog com action='PIN_STARTUP'/'UNPIN_STARTUP',
 *         IP, userAgent, actorId
 *  - Race condition tratada via transacao Prisma
 *  - Emite 'marketplace.pinChanged' para invalidar cache (S4-T04)
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';

export const MAX_PINNED = 3;
export const MIN_REASON_LENGTH = 20;

export type PinAction = {
  reason: string;
  actorId: number;
  ip?: string | null;
  userAgent?: string | null;
};

export type PinnedStartup = {
  startupId: number;
  slug: string;
  nome: string;
  manuallyPinnedAt: Date | null;
  manuallyPinnedBy: number | null;
  manuallyPinnedReason: string | null;
};

@Injectable()
export class PinService {
  private readonly logger = new Logger(PinService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async pin(
    startupId: number,
    action: PinAction,
  ): Promise<{
    manuallyPinned: true;
    manuallyPinnedBy: number | null;
    manuallyPinnedAt: Date | null;
    manuallyPinnedReason: string | null;
  }> {
    if (!action.reason || action.reason.trim().length < MIN_REASON_LENGTH) {
      throw new BadRequestException(
        `motivo deve ter no minimo ${MIN_REASON_LENGTH} caracteres`,
      );
    }
    const reason = action.reason.trim();

    const result = await this.prisma.$transaction(async (tx) => {
      const startup: any = await tx.startup.findUnique({
        where: { id: startupId },
        select: {
          id: true,
          manuallyPinned: true,
          founderId: true,
          manuallyPinnedReason: true,
        },
      });
      if (!startup) {
        throw new NotFoundException('Startup nao encontrada');
      }

      if (!startup.manuallyPinned) {
        const activeCount = await tx.startup.count({
          where: { manuallyPinned: true },
        });
        if (activeCount >= MAX_PINNED) {
          throw new ConflictException(
            `MAX_PINNED_EXCEEDED: ja existem ${MAX_PINNED} pinos ativos`,
          );
        }
      }

      const updated = await tx.startup.update({
        where: { id: startupId },
        data: {
          manuallyPinned: true,
          manuallyPinnedBy: action.actorId,
          manuallyPinnedAt: new Date(),
          manuallyPinnedReason: reason,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'PIN_STARTUP',
          entity: 'Startup',
          entityId: String(startupId),
          userId: action.actorId,
          ip: action.ip ?? null,
          oldValue: {
            manuallyPinned: startup.manuallyPinned,
            manuallyPinnedReason: startup.manuallyPinnedReason,
          } as any,
          newValue: {
            manuallyPinned: true,
            manuallyPinnedReason: reason,
            userAgent: action.userAgent ?? null,
          } as any,
        },
      });

      return updated;
    });

    this.events.emit('marketplace.pinChanged', {
      startupId,
      action: 'PIN',
      actorId: action.actorId,
    });

    this.logger.log(
      `[PIN] startup=${startupId} actor=${action.actorId} reason="${reason.slice(0, 40)}..."`,
    );

    return {
      manuallyPinned: true,
      manuallyPinnedBy: result.manuallyPinnedBy,
      manuallyPinnedAt: result.manuallyPinnedAt,
      manuallyPinnedReason: result.manuallyPinnedReason,
    };
  }

  async unpin(
    startupId: number,
    action: { actorId: number; ip?: string | null; userAgent?: string | null },
  ): Promise<{ manuallyPinned: false }> {
    await this.prisma.$transaction(async (tx) => {
      const startup: any = await tx.startup.findUnique({
        where: { id: startupId },
        select: {
          id: true,
          manuallyPinned: true,
          founderId: true,
          manuallyPinnedReason: true,
          manuallyPinnedBy: true,
          manuallyPinnedAt: true,
        },
      });
      if (!startup) {
        throw new NotFoundException('Startup nao encontrada');
      }

      await tx.startup.update({
        where: { id: startupId },
        data: {
          manuallyPinned: false,
          manuallyPinnedBy: null,
          manuallyPinnedAt: null,
          manuallyPinnedReason: null,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UNPIN_STARTUP',
          entity: 'Startup',
          entityId: String(startupId),
          userId: action.actorId,
          ip: action.ip ?? null,
          oldValue: {
            manuallyPinned: true,
            manuallyPinnedReason: startup.manuallyPinnedReason,
            manuallyPinnedBy: startup.manuallyPinnedBy,
            manuallyPinnedAt: startup.manuallyPinnedAt,
          } as any,
          newValue: {
            manuallyPinned: false,
            userAgent: action.userAgent ?? null,
          } as any,
        },
      });
    });

    this.events.emit('marketplace.pinChanged', {
      startupId,
      action: 'UNPIN',
      actorId: action.actorId,
    });

    this.logger.log(`[UNPIN] startup=${startupId} actor=${action.actorId}`);

    return { manuallyPinned: false };
  }

  async listPinned(): Promise<PinnedStartup[]> {
    const rows: any[] = await this.prisma.startup.findMany({
      where: { manuallyPinned: true },
      orderBy: { manuallyPinnedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        slug: true,
        nome: true,
        manuallyPinnedAt: true,
        manuallyPinnedBy: true,
        manuallyPinnedReason: true,
      },
    });

    return rows.map((s) => ({
      startupId: s.id,
      slug: s.slug,
      nome: s.nome,
      manuallyPinnedAt: s.manuallyPinnedAt,
      manuallyPinnedBy: s.manuallyPinnedBy,
      manuallyPinnedReason: s.manuallyPinnedReason,
    }));
  }
}
