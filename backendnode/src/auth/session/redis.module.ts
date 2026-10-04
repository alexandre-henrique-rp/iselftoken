import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule as IoredisModule } from '@nestjs-modules/ioredis';
import { SessionService } from './session.service';

@Module({
  imports: [
    ConfigModule,
    IoredisModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        options: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [SessionService],
  // Re-exporta IoredisModule pra que outros módulos (ex.: PaymentModule)
  // possam usar @InjectRedis() sem precisar reconfigurar a conexão.
  exports: [SessionService, IoredisModule],
})
export class RedisModule {}
