/**
 * SplitModule - CRUD de configurações de split para pagamentos PIX.
 *
 * Gerencia split de pagamentos entre platforma, founder e investor cashback.
 * Utiliza cache Redis (5min TTL) para listagem de splits ativos.
 *
 * @module SplitModule
 */
/**
 * SplitModule - CRUD de configurações de split para pagamentos PIX.
 *
 * Gerencia split de pagamentos entre plataforma, founder e investor cashback.
 * Utiliza cache Redis (5min TTL) para listagem de splits ativos.
 * AuditService é global (AuditModule @Global) — não precisa importar.
 *
 * @module SplitModule
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from 'src/auth/session/redis.module';
import { SplitController } from './split.controller';
import { SplitService } from './split.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [SplitController],
  providers: [SplitService],
  exports: [SplitService],
})
export class SplitModule {}
