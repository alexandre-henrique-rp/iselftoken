import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { SocketIoAdapterFactory } from './socket-io.adapter';

/**
 * Habilita o `SocketIoAdapter` global (com Redis adapter para multi-instância)
 * e expõe o `RealtimeService` que entrega os clientes pub/sub duplicados do
 * Redis principal.
 *
 * Ver `docs/superpowers/specs/2026-09-26-notifications-websocket-design.md`.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [RealtimeService, SocketIoAdapterFactory],
  exports: [RealtimeService, SocketIoAdapterFactory],
})
export class RealtimeModule {}
