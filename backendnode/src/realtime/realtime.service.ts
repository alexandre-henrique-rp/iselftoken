import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Encapsula clientes Redis pub/sub para o `SocketIoAdapter`.
 *
 * Por que clientes separados: o `@socket.io/redis-adapter` precisa de
 * clientes exclusivos para pub/sub — misturar com o client principal
 * (usado por `SessionService`) quebraria o canal único de SUBSCRIBE
 * do ioredis.
 *
 * Solução: `.duplicate()` — novos clients que compartilham config mas têm
 * seu próprio socket TCP. Zero custo adicional de pool.
 */
@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);
  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;

  constructor(@InjectRedis() private readonly redis: Redis) {}

  getPubSubClients(): { pub: Redis; sub: Redis } {
    if (!this.pubClient || !this.subClient) {
      this.pubClient = this.redis.duplicate();
      this.subClient = this.redis.duplicate();

      // [FIX] ioredis emite 'error' em EPIPE/ECONNRESET/Connection is closed
      // quando o socket TCP subjacente cai (comum em WS disconnect ou
      // shutdown). Sem listener → "Unhandled error event" → process exit.
      // Handler defensivo: loga e segue. Idempotente com .quit() abaixo.
      const onError = (label: string) => (err: Error) =>
        this.logger.warn(
          `Redis ${label} pub/sub error (swallowed): ${err.message}`,
        );
      const onEnd = (label: string) => () =>
        this.logger.log(`Redis ${label} pub/sub connection ended`);
      this.pubClient.on('error', onError('pub'));
      this.subClient.on('error', onError('sub'));
      this.pubClient.on('end', onEnd('pub'));
      this.subClient.on('end', onEnd('sub'));

      this.logger.log(
        'Clientes Redis pub/sub duplicados para Socket.IO adapter',
      );
    }
    return { pub: this.pubClient, sub: this.subClient };
  }

  async onModuleDestroy(): Promise<void> {
    const closes: Promise<unknown>[] = [];
    if (this.pubClient)
      closes.push(this.pubClient.quit().catch(() => undefined));
    if (this.subClient)
      closes.push(this.subClient.quit().catch(() => undefined));
    await Promise.allSettled(closes);
  }
}
