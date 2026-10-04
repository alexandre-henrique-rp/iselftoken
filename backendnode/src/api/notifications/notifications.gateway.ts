import { Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { SessionService } from 'src/auth/session/session.service';
import {
  PaymentCancelledEvent,
  PaymentConfirmedEvent,
  PaymentEvents,
} from 'src/api/payment/events/payment-events';
import {
  KycEvents,
  KycUserDecidedEvent,
} from 'src/api/admin/events/kyc-events';

type SessionUser = {
  id: number;
  role: string;
  af2Verified?: boolean;
  lastAccessAt?: string;
};

const ADMIN_ROLES = ['ADMIN', 'FINANCEIRO', 'COMPLIANCE'];
const MAX_CONNECTIONS_PER_USER = 5;

/**
 * Gateway socket.io para notificações real-time.
 *
 * Namespace: `/notifications` (ver `app/routes.ts` FE).
 *
 * Auth:
 *  - Cliente envia `withCredentials: true` → cookie HTTP-only `session_id`
 *    atravessa o handshake.
 *  - `handleConnection` valida via `SessionService.getSession(sessionId)`
 *    e aplica o mesmo filtro de 2FA + lastAccessAt do `AuthGuard`.
 *  - Sessão inválida → `socket.disconnect(true)` + log estruturado.
 *  - Válida → `socket.data.user = { id, role }` + `socket.join('user:{id}')`.
 *
 * Rate limit por userId: máximo `MAX_CONNECTIONS_PER_USER` sockets
 * simultâneos. Se exceder, derruba a conexão mais antiga.
 *
 * Garantia de isolamento: o emit SEMPRE passa por `emitToUser(userId, …)`
 * que mira a sala `user:{userId}` do destinatário correto. Zero broadcast.
 *
 * Ver `docs/superpowers/specs/2026-09-26-notifications-websocket-design.md`.
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly userSockets = new Map<number, Set<string>>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    const user = await this.authenticate(socket);
    if (!user) {
      socket.disconnect(true);
      return;
    }
    socket.data.user = user;

    const sockets = this.userSockets.get(user.id) ?? new Set<string>();
    if (sockets.size >= MAX_CONNECTIONS_PER_USER) {
      // Dropa a conexão mais antiga (primeira do Set — ordem de inserção).
      const oldestId = sockets.values().next().value;
      if (oldestId) {
        const oldest = this.server?.sockets?.sockets?.get(oldestId);
        oldest?.disconnect(true);
        sockets.delete(oldestId);
      }
      this.logger.warn(
        `WS rate limit userId=${user.id} | max=${MAX_CONNECTIONS_PER_USER} | dropping oldest`,
      );
    }
    sockets.add(socket.id);
    this.userSockets.set(user.id, sockets);

    await socket.join(`user:${user.id}`);
    this.logger.log(
      `WS connect | userId=${user.id} | role=${user.role} | sid=${socket.id} | total=${sockets.size}`,
    );
  }

  handleDisconnect(socket: Socket): void {
    const user = socket.data?.user as SessionUser | undefined;
    if (user) {
      const sockets = this.userSockets.get(user.id);
      sockets?.delete(socket.id);
      if (sockets && sockets.size === 0) {
        this.userSockets.delete(user.id);
      }
      this.logger.log(`WS disconnect | userId=${user.id} | sid=${socket.id}`);
    }
  }

  /**
   * Emite payload para a sala `user:{userId}`. Usado por `NotificationsService`
   * após `prisma.notification.create`.
   *
   * Best-effort: nunca propaga erro (mesma filosofia do email). Falhas são
   * logadas mas o caller continua.
   */
  emitToUser(userId: number, event: string, payload: unknown): void {
    try {
      this.server?.to(`user:${userId}`).emit(event, payload);
    } catch (err) {
      this.logger.warn(
        `WS emit falhou | userId=${userId} | event=${event} | reason=${(err as Error).message}`,
      );
    }
  }

  /**
   * Valida o `session_id` do cookie contra o Redis (via `SessionService`).
   * Replica a lógica de `AuthGuard.canActivate` para o handshake WS:
   * isActive, af2Verified, lastAccessAt.
   *
   * Retorna o user resumido (id, role) ou null se inválido.
   */
  private async authenticate(socket: Socket): Promise<SessionUser | null> {
    const cookieHeader = socket.handshake.headers?.cookie ?? '';
    const sessionId = this.extractSessionId(cookieHeader);
    if (!sessionId) {
      this.logger.warn(`WS handshake sem session_id | sid=${socket.id}`);
      return null;
    }

    const user = (await this.sessionService.getSession(sessionId)) as
      | (SessionUser & {
          isActive: boolean;
          lastAccessAt?: string;
        })
      | null;
    if (!user) {
      this.logger.warn(`WS handshake sessão inválida | sid=${socket.id}`);
      return null;
    }
    if (!user.isActive) {
      this.logger.warn(`WS handshake usuário inativo | sid=${socket.id}`);
      return null;
    }

    const isAdmin = ADMIN_ROLES.includes(user.role);
    const isAf2Verified = user.af2Verified === true;
    if (!isAdmin && !isAf2Verified) {
      this.logger.warn(
        `WS handshake 2FA pendente | userId=${user.id} | sid=${socket.id}`,
      );
      return null;
    }

    if (!isAdmin && user.lastAccessAt) {
      const lastAccessAt = new Date(user.lastAccessAt);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (lastAccessAt < sevenDaysAgo) {
        this.logger.warn(
          `WS handshake acesso expirado | userId=${user.id} | sid=${socket.id}`,
        );
        return null;
      }
    }

    return { id: user.id, role: user.role };
  }

  /**
   * Parse manual do cookie HTTP — sem dep extra. Suficiente para o caso
   * de uso (single key `session_id`).
   */
  private extractSessionId(cookieHeader: string): string | null {
    if (!cookieHeader) return null;
    for (const part of cookieHeader.split(';')) {
      const [rawName, ...rest] = part.trim().split('=');
      if (rawName === 'session_id') {
        return rest.join('=') || null;
      }
    }
    return null;
  }

  /**
   * Sprint S34-c — relay `payment.confirmed` para o socket do user.
   *
   * O `PaymentService` já emite `payment.confirmed` no EventEmitter2
   * após `invalidateUserSession` (linha 1620). Aqui só fazemos o
   * relay WS best-effort para a sala `user:{userId}` — qualquer aba
   * aberta do app recebe o evento e invalida o cache `[me]` no
   * TanStack Query (sub-segundo).
   *
   * Best-effort: nunca propaga erro. Falha aqui significa que o
   * frontend cai no fallback `staleTime: 90s` (defesa em profundidade).
   *
   * Payload (mínimo, LGPD-safe): `paymentId`, `purpose`,
   * `subscriptionId`, `investmentId`. Sem PII do user — o frontend
   * só precisa saber "algo mudou, refetch [me]".
   */
  @OnEvent(PaymentEvents.CONFIRMED)
  onPaymentConfirmed(event: PaymentConfirmedEvent): void {
    const payload = {
      paymentId: event.paymentId,
      purpose: event.payment.purpose,
      subscriptionId: event.payment.subscriptionId,
      investmentId: event.payment.investmentId,
    };
    this.emitToUser(event.payment.userId, 'payment.confirmed', payload);
  }

  /**
   * Relay `payment.cancelled` — útil para o frontend reverter
   * estado de UI otimista (ex: spinner de aguardando pagamento).
   */
  @OnEvent(PaymentEvents.CANCELLED)
  onPaymentCancelled(event: PaymentCancelledEvent): void {
    const payload = {
      paymentId: event.paymentId,
      purpose: event.payment.purpose,
    };
    this.emitToUser(event.payment.userId, 'payment.cancelled', payload);
  }

  /**
   * Realtime multi-conector — relay `kyc.user.decided` para o socket do
   * user. O `AdminService.decideKycUser` emite este evento no EventEmitter2
   * após sincronizar as sessões Redis dos donos do KYCProfile. Aqui fazemos
   * o relay WS best-effort para a sala `user:{userId}` — qualquer aba aberta
   * recebe o evento e invalida o cache `[me]` + queries de KYC no TanStack
   * Query (sub-segundo), refletindo a decisão de compliance sem reload.
   *
   * Best-effort: nunca propaga erro. Falha aqui significa que o frontend
   * cai no fallback de reconciliação (focus/visibilitychange) ou no
   * `staleTime` das queries (defesa em profundidade).
   *
   * Payload (mínimo, LGPD-safe): `decision` e `kycStatus`. Sem PII do user
   * (userId só serve para mirar a sala) — o frontend só precisa saber
   * "o KYC mudou, revalide o perfil".
   */
  @OnEvent(KycEvents.USER_DECIDED)
  onKycDecided(event: KycUserDecidedEvent): void {
    const payload = {
      decision: event.decision,
      kycStatus: event.kycStatus,
    };
    this.emitToUser(event.userId, 'kyc.decided', payload);
  }
}
