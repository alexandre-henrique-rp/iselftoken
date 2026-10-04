import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { ServerOptions } from 'socket.io';
import { RealtimeService } from './realtime.service';

export const NOTIFICATIONS_NAMESPACE = '/notifications';

/**
 * Adapter socket.io com:
 *  - CORS `credentials: true` (cookie HTTP-only atravessa)
 *  - Redis adapter para multi-instância (rooms distribuídas)
 *
 * Cookies HTTP-only são propagados via `withCredentials: true` no cliente
 * socket.io; o `handleConnection` do gateway valida o `session_id` via
 * `SessionService.getSession()` antes de juntar a sala `user:{userId}`.
 *
 * Ver `docs/superpowers/specs/2026-09-26-notifications-websocket-design.md`.
 */
export class SocketIoAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIoAdapter.name);

  constructor(
    app: INestApplication,
    private readonly configService: ConfigService,
    private readonly realtimeService: RealtimeService,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions): any {
    const corsOrigins = this.resolveCorsOrigins();
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      // Long-poll primeiro → upgrade pra ws. Long-poll funciona atrás de
      // qualquer proxy que bloqueie Upgrade; ws é mais barato quando passa.
      transports: ['polling', 'websocket'],
      allowEIO3: false,
    });

    const { pub, sub } = this.realtimeService.getPubSubClients();
    const redisAdapter = createAdapter(pub, sub);
    server.adapter(redisAdapter);

    this.logger.log(
      `Socket.IO adapter inicializado | origins=${corsOrigins.join(',')}`,
    );

    return server;
  }

  private resolveCorsOrigins(): string[] {
    const raw =
      this.configService.get<string>('SOCKET_IO_CORS_ORIGINS') ??
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:5173';
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

/**
 * Factory usado pelo Nest para instanciar o adapter com as deps certas.
 * Chama `RealtimeService.getPubSubClients()` lazy na primeira conexão.
 */
export class SocketIoAdapterFactory {
  static create(
    app: INestApplication,
    configService: ConfigService,
    realtimeService: RealtimeService,
  ): SocketIoAdapter {
    return new SocketIoAdapter(app, configService, realtimeService);
  }
}
