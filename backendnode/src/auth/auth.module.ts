import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminGuard } from './admin.guard';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CookiesModule } from './cookies/cookies.module';
import { DismissSessionController } from './dismiss-session.controller';
import { DeviceContextService } from './services/device-context.service';
import { LoginAlertService } from './services/login-alert.service';
import { LoginLocationResolver } from './services/login-location.resolver';
import { LoginLockoutService } from './services/login-lockout.service';
import { TrustedClientContextResolver } from './services/trusted-client-context.service';
import { RedisModule as SessionModule } from './session/redis.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    SessionModule,
    CookiesModule,
    ConfigModule,
    JwtModule.registerAsync({
      global: true,
      // Fase A C1: JWT_SECRET vem do ConfigService que foi validado via
      // envSchema (>= 32 chars). Sem fallback — se falhar, app nao boota.
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30m' },
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'email',
        ttl: 3600000,
        limit: 5,
      },
    ]),
  ],
  controllers: [AuthController, DismissSessionController],
  providers: [
    AuthService,
    AuthGuard,
    AdminGuard,
    LoginLockoutService,
    LoginAlertService,
    TrustedClientContextResolver,
    DeviceContextService,
    LoginLocationResolver,
  ],
  exports: [
    AuthGuard,
    AdminGuard,
    SessionModule,
    CookiesModule,
    JwtModule,
    LoginLockoutService,
    LoginAlertService,
    TrustedClientContextResolver,
    DeviceContextService,
    LoginLocationResolver,
  ],
})
export class AuthModule {}
