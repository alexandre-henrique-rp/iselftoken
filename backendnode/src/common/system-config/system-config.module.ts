/**
 * Módulo de SystemConfig.
 *
 * Importa:
 * - PrismaModule (acesso à tabela system_configs)
 * - RedisModule de src/auth/session/redis.module.ts (cache)
 *
 * Exporta:
 * - SystemConfigService (consumido por CampaignsService em S01.2)
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule as SessionRedisModule } from 'src/auth/session/redis.module';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [ConfigModule, SessionRedisModule],
  controllers: [SystemConfigController],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
