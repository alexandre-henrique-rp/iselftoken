import { Injectable, Logger } from '@nestjs/common';
import { DocumentRequestStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/query-notifications.dto';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateDocumentRequestInput {
  startupId: number;
  requestedById: number;
  type: string;
  description: string;
  deadline?: Date | null;
}

/**
 * Service para gestão de solicitações de documentos extras.
 *
 * Compliance cria a request → founder recebe notificação (in-app +
 * futura integração email) → founder faz upload via StartupDocument →
 * request é marcada FULFILLED com vinculo ao documento enviado.
 *
 * Status: PENDING → (FULFILLED | EXPIRED | CANCELED)
 */
@Injectable()
export class AdminDocumentRequestsService {
  private readonly logger = new Logger(AdminDocumentRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Compliance cria uma nova solicitação para uma startup. */
  async create(input: CreateDocumentRequestInput) {
    const startup = await this.prisma.startup.findUnique({
      where: { id: input.startupId },
      select: { id: true, nome: true, founderId: true },
    });
    if (!startup) {
      return { ok: false as const, error: 'Startup não encontrada' };
    }

    const request = await this.prisma.documentRequest.create({
      data: {
        startupId: input.startupId,
        requestedById: input.requestedById,
        type: input.type,
        description: input.description,
        deadline: input.deadline ?? null,
        status: 'PENDING',
      },
    });

    // Notifica o founder em in-app (a integração com email fica para
    // sprint futura, mantendo-se o desacoplamento atual do módulo de email).
    try {
      await this.notifications.create(
        startup.founderId,
        'Documento solicitado pelo compliance',
        `${input.type}: ${input.description.slice(0, 120)}${input.description.length > 120 ? '…' : ''}`,
        NotificationType.COMPLIANCE_REQUEST,
      );
    } catch (err) {
      // Notificação é best-effort — não falhamos a request se a notif falhar.
      this.logger.warn(
        `Falha ao notificar founder ${startup.founderId} sobre document request ${request.id}: ${(err as Error).message}`,
      );
    }

    return { ok: true as const, data: request };
  }

  /** Lista solicitações com filtros (startupId, status). */
  async list(filters: { startupId?: number; status?: DocumentRequestStatus }) {
    const where: Prisma.DocumentRequestWhereInput = {};
    if (filters.startupId) where.startupId = filters.startupId;
    if (filters.status) where.status = filters.status;

    const data = await this.prisma.documentRequest.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        requestedBy: { select: { id: true, nome: true } },
        fulfilledDoc: { select: { id: true, nome: true, mimetype: true } },
      },
    });
    return { ok: true as const, data };
  }

  /** Compliance cancela uma solicitação PENDING (não permite reverter). */
  async cancel(id: number) {
    const existing = await this.prisma.documentRequest.findUnique({
      where: { id },
    });
    if (!existing)
      return { ok: false as const, error: 'Solicitação não encontrada' };
    if (existing.status !== 'PENDING') {
      return {
        ok: false as const,
        error: `Não é possível cancelar uma solicitação com status ${existing.status}`,
      };
    }
    const updated = await this.prisma.documentRequest.update({
      where: { id },
      data: { status: 'CANCELED' },
    });
    return { ok: true as const, data: updated };
  }
}
