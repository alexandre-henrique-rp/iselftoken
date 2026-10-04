import { Injectable, Logger } from '@nestjs/common';
import { DocumentRequestStatus, Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Founder lista e atende solicitações de documentos do compliance.
 * Endpoint de atendimento (fulfill) vincula o StartupDocument enviado
 * à DocumentRequest, marcando-a como FULFILLED.
 */
@Injectable()
export class FounderDocumentRequestsService {
  private readonly logger = new Logger(FounderDocumentRequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Lista requests pendentes para todas as startups do founder logado. */
  async listMine(founderId: number) {
    const startups = await this.prisma.startup.findMany({
      where: { founderId },
      select: { id: true },
    });
    const startupIds = startups.map((s) => s.id);
    if (startupIds.length === 0) {
      return { ok: true as const, data: [] };
    }

    const data = await this.prisma.documentRequest.findMany({
      where: { startupId: { in: startupIds } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: {
        requestedBy: { select: { id: true, nome: true } },
        fulfilledDoc: { select: { id: true, nome: true, mimetype: true } },
        startup: { select: { id: true, nome: true } },
      },
    });
    return { ok: true as const, data };
  }

  /** Vincula um StartupDocument a uma request PENDING → FULFILLED. */
  async fulfill(
    requestId: number,
    founderId: number,
    startupDocumentId: number,
  ) {
    // Valida ownership: o documento precisa ser de uma startup do founder
    const doc = await this.prisma.startupDocument.findUnique({
      where: { id: startupDocumentId },
      include: { startup: { select: { founderId: true, id: true } } },
    });
    if (!doc) return { ok: false as const, error: 'Documento não encontrado' };
    if (doc.startup.founderId !== founderId) {
      return {
        ok: false as const,
        error: 'Você não tem permissão sobre este documento',
      };
    }

    const request = await this.prisma.documentRequest.findUnique({
      where: { id: requestId },
      include: { startup: { select: { founderId: true } } },
    });
    if (!request)
      return { ok: false as const, error: 'Solicitação não encontrada' };
    if (request.startup.founderId !== founderId) {
      return {
        ok: false as const,
        error: 'Você não tem permissão sobre esta solicitação',
      };
    }
    if (request.status !== 'PENDING') {
      return {
        ok: false as const,
        error: `Não é possível atender uma solicitação com status ${request.status}`,
      };
    }
    if (request.startupId !== doc.startupId) {
      return {
        ok: false as const,
        error: 'O documento não pertence à startup desta solicitação',
      };
    }

    const updated = await this.prisma.documentRequest.update({
      where: { id: requestId },
      data: {
        status: 'FULFILLED',
        fulfilledDocId: startupDocumentId,
      },
    });

    // Notifica o compliance de que o founder enviou
    try {
      await this.notifications.create(
        request.requestedById,
        'Documento enviado pelo founder',
        `Solicitação #${requestId} (${request.type}) foi atendida com o documento "${doc.nome}".`,
        'compliance_request' as never,
      );
    } catch (err) {
      this.logger.warn(
        `Falha ao notificar compliance sobre fulfill ${requestId}: ${(err as Error).message}`,
      );
    }

    return { ok: true as const, data: updated };
  }
}
