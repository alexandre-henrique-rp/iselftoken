import { Injectable, Logger } from '@nestjs/common';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationType } from './dto/query-notifications.dto';
import { NotificationsGateway } from './notifications.gateway';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  description: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationPayload {
  id: number;
  title: string;
  description: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Cria uma nova notificação para o usuário e emite via WebSocket
   * para a sala `user:{userId}`. O emit é best-effort — falha de WS
   * não propaga (mesma filosofia do email).
   */
  async create(
    userId: number,
    title: string,
    description: string,
    type: NotificationType,
  ): Promise<Notification> {
    // Cast `type` para o enum Prisma. Os dois enums (TS e Prisma) tem os
    // mesmos valores snake_case — foi sincronizado manualmente (ver
    // dto/query-notifications.dto.ts).
    const created = await this.prisma.notification.create({
      data: { userId, title, description, type: type as any },
    });
    const domain = this.toDomain(created);
    try {
      this.gateway.emitToUser(userId, 'notification', this.toPayload(domain));
    } catch (err) {
      this.logger.warn(
        `WS emit falhou | userId=${userId} | reason=${(err as Error).message}`,
      );
    }
    this.logger.log(
      `Notification criada | userId=${userId} | type=${type} | id=${domain.id}`,
    );
    return domain;
  }

  /**
   * Lista notificações do usuário com paginação + filtro opcional por tipo.
   *
   * Suporta 3 modos de filtro (mutuamente exclusivos, prioridade `types[]`):
   *  1. `types` (string[]): filtra por varios tipos (ex: ['plan_purchased', 'plan_added']).
   *  2. `type` (NotificationType): filtra por 1 tipo (back-compat).
   *  3. sem filtro: retorna todas.
   */
  async findByUserId(
    userId: number,
    page: number = 1,
    limit: number = 20,
    type?: NotificationType,
    types?: string[],
  ): Promise<ResponseDto> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const where: any = { userId };

    if (Array.isArray(types) && types.length > 0) {
      where.type = { in: types.map((t) => String(t)) };
    } else if (type) {
      where.type = String(type);
    }

    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return ResponseDto.success('Notificações retornadas com sucesso', 200, {
      data: rows.map((n) => this.toDomain(n)),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit)),
      },
    });
  }

  /**
   * Marca uma notificação específica como lida (verifica ownership).
   */
  async markAsRead(
    userId: number,
    notificationId: number,
  ): Promise<ResponseDto> {
    const existing = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true, isRead: true },
    });

    if (!existing || existing.userId !== userId) {
      return ResponseDto.error('Notificação não encontrada', 404);
    }

    if (!existing.isRead) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    }

    return ResponseDto.success('Notificação marcada como lida', 200, {
      id: notificationId,
      isRead: true,
    });
  }

  /**
   * Marca todas as notificações do usuário como lidas.
   */
  async markAllAsRead(userId: number): Promise<ResponseDto> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return ResponseDto.success('Todas notificações marcadas como lidas', 200, {
      count: result.count,
    });
  }

  /**
   * Contagem de notificações não lidas do usuário.
   */
  async getUnreadCount(userId: number): Promise<ResponseDto> {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return ResponseDto.success('Contagem de não lidas', 200, { unreadCount });
  }

  /**
   * Seed de amostras para testes/desenvolvimento. Idempotente — checa se
   * o usuário já tem notificações antes de inserir.
   */
  async seedSampleNotifications(userId: number): Promise<void> {
    const existing = await this.prisma.notification.count({
      where: { userId },
    });
    if (existing > 0) return;

    const samples = [
      {
        title: 'KYC Aprovado',
        description: 'Seu perfil KYC foi aprovado pela equipe de compliance.',
        type: NotificationType.KYC_APPROVED,
      },
      {
        title: 'Investimento Confirmado',
        description:
          'Seu investimento de R$ 500,00 na startup TechAI foi confirmado.',
        type: NotificationType.INVESTMENT_CONFIRMED,
      },
      {
        title: 'Campanha Financiada',
        description: 'A campanha da startup GreenEnergy atingiu 100% da meta.',
        type: NotificationType.CAMPAIGN_FUNDED,
      },
      {
        title: 'Atualização de Segurança',
        description:
          'Nova detecção de login no seu account. Verifique se foi você.',
        type: NotificationType.SECURITY,
      },
      {
        title: 'Bem-vindo à iSelfToken',
        description:
          'Explore as startups disponíveis e faça seu primeiro investimento.',
        type: NotificationType.GENERAL,
      },
    ];

    await this.prisma.notification.createMany({
      data: samples.map((s) => ({
        userId,
        title: s.title,
        description: s.description,
        type: s.type,
      })),
    });
  }

  private toDomain(n: {
    id: number;
    userId: number;
    title: string;
    description: string;
    type: string;
    isRead: boolean;
    createdAt: Date;
  }): Notification {
    return {
      id: n.id,
      userId: n.userId,
      title: n.title,
      description: n.description,
      // Cast explicito: o enum TS e o enum Prisma sao equivalentes em runtime
      // (mesma string union), mas o TypeScript nao infere isso. Os valores
      // foram sincronizados manualmente (ver comment no dto/query-notifications.dto.ts).
      type: n.type as NotificationType,
      isRead: n.isRead,
      createdAt: n.createdAt,
    };
  }

  /**
   * Serializa para o payload do evento WS (mesmo formato do `NotificationRaw`
   * no frontend — `app/lib/queries.ts:382`). Mantém o contrato estável entre
   * REST e WS.
   */
  private toPayload(n: Notification): NotificationPayload {
    return {
      id: n.id,
      title: n.title,
      description: n.description,
      type: n.type,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
