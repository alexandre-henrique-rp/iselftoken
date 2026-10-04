import { InjectRedis } from '@nestjs-modules/ioredis';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Redis } from 'ioredis';
import { AuditService } from '../common/audit/audit.service';
import { ResponseDto } from '../common/dto/response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginAlertService } from './services/login-alert.service';
import { SessionService } from './session/session.service';

interface ActionPayload {
  sub?: number | string;
  userId?: number | string;
  alertPublicId?: string;
  purpose?: string;
  jti?: string;
}

@Controller('auth')
@ApiTags('Auth')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { ttl: 60_000, limit: 5 } })
export class DismissSessionController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    private readonly loginAlertService: LoginAlertService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  @Post('confirm-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirma um novo login sem criar uma nova sessão' })
  @ApiResponse({ status: 200, description: 'Alerta confirmado' })
  async confirm(@Body() body: { token?: string }) {
    return this.executeAction(body?.token, 'CONFIRMED');
  }

  @Post('dismiss-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Desconecta sessões e exige troca de senha após login desconhecido',
  })
  @ApiResponse({ status: 200, description: 'Sessões invalidadas' })
  async dismiss(@Body() body: { token?: string }) {
    return this.executeAction(body?.token, 'DISMISSED');
  }

  private async executeAction(
    token: string | undefined,
    action: 'CONFIRMED' | 'DISMISSED',
  ) {
    if (!token) return ResponseDto.error('Token obrigatório', 400);
    const payload = this.verifyToken(token);
    if (!payload || !payload.userId || !payload.jti)
      return ResponseDto.error(
        'Token inválido ou expirado. Solicite um novo alerta.',
        401,
      );

    const userId = Number(payload.userId);
    const alertPublicId = payload.alertPublicId;
    if (payload.purpose === 'login_alert_action' && alertPublicId) {
      return this.executePersistedAction(
        userId,
        alertPublicId,
        payload.jti,
        action,
      );
    }
    if (action === 'CONFIRMED')
      return ResponseDto.error('Token com purpose inválido.', 401);
    return this.executeLegacyDismiss(userId, payload.jti);
  }

  private async executePersistedAction(
    userId: number,
    alertPublicId: string,
    jti: string,
    action: 'CONFIRMED' | 'DISMISSED',
  ) {
    const alert = await this.loginAlertService.findByActionJti(
      jti,
      userId,
      alertPublicId,
    );
    if (!alert)
      return ResponseDto.error(
        'Token inválido ou expirado. Solicite um novo alerta.',
        401,
      );

    if (alert.actionStatus === action) {
      return ResponseDto.success(
        action === 'CONFIRMED'
          ? 'Login confirmado.'
          : 'Sessões já desconectadas.',
        200,
        {
          alertId: alert.publicId,
          status: action,
          sessionCreated: false,
          sessionsDeleted: alert.sessionsDeleted,
          forcePasswordReset: action === 'DISMISSED',
        },
      );
    }
    if (alert.actionStatus !== 'PENDING')
      return ResponseDto.error('Este alerta já foi processado.', 409);
    if (alert.actionExpiresAt && alert.actionExpiresAt.getTime() < Date.now())
      return ResponseDto.error(
        'Token inválido ou expirado. Solicite um novo alerta.',
        401,
      );

    const applied = await this.loginAlertService.applyAction(alert.id, action);
    if (!applied.alert) return ResponseDto.error('Alerta não encontrado.', 404);
    if (!applied.transitioned) {
      if (applied.alert.actionStatus === action)
        return ResponseDto.success('Ação já processada.', 200, {
          alertId: applied.alert.publicId,
          status: action,
          sessionCreated: false,
          sessionsDeleted: applied.alert.sessionsDeleted,
          forcePasswordReset: action === 'DISMISSED',
        });
      return ResponseDto.error('Este alerta já foi processado.', 409);
    }

    if (action === 'CONFIRMED') {
      await this.loginAlertService.markDeviceAsKnown(
        userId,
        applied.alert.fingerprint,
      );
      await this.auditService.log({
        userId,
        action: 'LOGIN_ALERT_CONFIRMED',
        entity: 'LoginAlert',
        entityId: applied.alert.publicId,
        newValue: { sessionCreated: false },
      });
      return ResponseDto.success('Login confirmado.', 200, {
        alertId: applied.alert.publicId,
        status: 'CONFIRMED',
        sessionCreated: false,
      });
    }

    const sessionsDeleted =
      await this.sessionService.invalidateAllUserSessions(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { requirePasswordReset: true },
    });
    const [devicesCleared, debouncesCleared] = await Promise.all([
      this.scanAndDelete(`known_device:${userId}:*`),
      this.scanAndDelete(`alert_debounce:${userId}:*`),
    ]);
    await this.redis.del(`lastKnownCountry:${userId}`);
    const updated = await this.prisma.loginAlert.update({
      where: { id: alert.id },
      data: { sessionsDeleted },
    });
    await this.auditService.log({
      userId,
      action: 'LOGIN_ALERT_DISMISSED',
      entity: 'LoginAlert',
      entityId: updated.publicId,
      newValue: {
        sessionsDeleted,
        forcePasswordReset: true,
        devicesCleared,
        debouncesCleared,
      },
    });
    return ResponseDto.success(
      'Todas as sessões foram desconectadas. Por segurança, altere sua senha no próximo login.',
      200,
      {
        alertId: updated.publicId,
        status: 'DISMISSED',
        sessionsDeleted,
        forcePasswordReset: true,
      },
    );
  }

  private async executeLegacyDismiss(userId: number, jti: string) {
    const reserved = await this.redis.set(
      `dismiss_token_used:${jti}`,
      '1',
      'EX',
      15 * 60,
      'NX',
    );
    if (reserved !== 'OK') return ResponseDto.error('Token já utilizado.', 401);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return ResponseDto.error('Usuário não encontrado.', 404);
    const sessionsDeleted =
      await this.sessionService.invalidateAllUserSessions(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { requirePasswordReset: true },
    });
    const [devicesCleared, debouncesCleared] = await Promise.all([
      this.scanAndDelete(`known_device:${userId}:*`),
      this.scanAndDelete(`alert_debounce:${userId}:*`),
    ]);
    await this.redis.del(`lastKnownCountry:${userId}`);
    await this.auditService.log({
      userId,
      action: 'DISMISS_ALL_SESSIONS',
      entity: 'User',
      entityId: String(userId),
      newValue: {
        sessionsDeleted,
        forcePasswordReset: true,
        devicesCleared,
        debouncesCleared,
      },
    });
    return ResponseDto.success(
      'Todas as sessões foram desconectadas. Por segurança, altere sua senha no próximo login.',
      200,
      { sessionsDeleted, forcePasswordReset: true },
    );
  }

  private verifyToken(token: string): ActionPayload | null {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret || secret.length < 32) return null;
      return this.jwtService.verify<ActionPayload>(token, {
        secret,
        algorithms: ['HS256'],
      });
    } catch {
      return null;
    }
  }

  private async scanAndDelete(pattern: string): Promise<number> {
    let cursor = '0';
    let count = 0;
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length) {
        await this.redis.del(...keys);
        count += keys.length;
      }
    } while (cursor !== '0');
    return count;
  }
}
