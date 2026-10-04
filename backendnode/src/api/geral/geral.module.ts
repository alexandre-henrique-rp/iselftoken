import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule as IoredisModule } from '@nestjs-modules/ioredis';
import { GeralController } from './geral.controller';
import { GeralService } from './geral.service';

@Module({
  imports: [
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
  controllers: [GeralController],
  providers: [GeralService],
})
export class GeralModule {}
