import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigService } from './config.service';
import { FundraisingConfigController } from './fundraising-config.controller';

/**
 * Módulo global dos parâmetros de cálculo versionados por data. Exporta o
 * ConfigService para que qualquer módulo (afiliados, transações, admin) resolva
 * o valor vigente sem precisar importar este módulo explicitamente.
 *
 * Nome PlatformConfigModule para não colidir com o ConfigModule do @nestjs/config.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [FundraisingConfigController],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class PlatformConfigModule {}
