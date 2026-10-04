import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Redis } from 'ioredis';
import * as crypto from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DeviceContextService,
  NormalizedDevice,
} from './device-context.service';
import {
  LoginLocationResolver,
  ResolvedLoginLocation,
} from './login-location.resolver';
import {
  TrustedClientContext,
  classifyClientIp,
} from './trusted-client-context.service';

const ALERT_TOKEN_TTL_SECONDS = 15 * 60;

@Injectable()
export class LoginAlertService {
  private readonly logger = new Logger(LoginAlertService.name);
  private static readonly DEVICE_TTL_SECONDS = 30 * 86400;
  private static readonly DEBOUNCE_SECONDS = 5 * 60;

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly deviceContextService: DeviceContextService,
    private readonly locationResolver: LoginLocationResolver,
  ) {}

  async checkAndAlert(params: {
    userId: number;
    ip: string | null;
    userAgent: string | null;
    context?: TrustedClientContext;
  }): Promise<LoginAlertDecision> {
    const context = params.context ?? {
      ip: params.ip,
      ipClass: classifyClientIp(params.ip),
      environment: process.env.NODE_ENV || 'development',
      proxyChainTrusted: false,
    };
    const normalizedDevice = this.deviceContextService.normalize(
      params.userAgent,
    );
    const fingerprint = this.fingerprint(context.ip, params.userAgent);
    const deviceKey = `known_device:${params.userId}:${fingerprint}`;
    const debounceKey = `alert_debounce:${params.userId}:${fingerprint}`;
    const resolved = await this.locationResolver.resolve();

    let debounceHit = false;
    try {
      debounceHit = (await this.redis.get(debounceKey)) !== null;
    } catch {
      debounceHit = true;
    }
    if (debounceHit) {
      return this.decision(
        false,
        false,
        'debounced',
        fingerprint,
        resolved.geo,
        resolved.location,
        normalizedDevice,
        context,
      );
    }

    let isKnownDevice = true;
    try {
      isKnownDevice = (await this.redis.exists(deviceKey)) === 1;
    } catch {
      this.logger.warn(
        `LoginAlertService: Redis indisponível; alerta degradado para device conhecido. userId=${params.userId}`,
      );
    }

    const isAnomalousGeo = await this.isAnomalousCountry();
    const shouldAlert = !isKnownDevice || isAnomalousGeo;
    if (shouldAlert) {
      try {
        await this.redis.set(
          debounceKey,
          '1',
          'EX',
          LoginAlertService.DEBOUNCE_SECONDS,
        );
      } catch {
        // Metadata/coordenação não pode bloquear login.
      }
    }
    if (isKnownDevice) {
      try {
        await this.redis.expire(
          deviceKey,
          LoginAlertService.DEVICE_TTL_SECONDS,
        );
      } catch {
        // Redis é apenas coordenação.
      }
    }

    return this.decision(
      !isKnownDevice,
      isAnomalousGeo,
      shouldAlert
        ? !isKnownDevice && isAnomalousGeo
          ? 'new_device_and_geo_anomaly'
          : !isKnownDevice
            ? 'new_device'
            : 'geo_anomaly'
        : 'known_device',
      fingerprint,
      resolved.geo,
      resolved.location,
      normalizedDevice,
      context,
    );
  }

  async createPendingAlert(params: {
    eventKey: string;
    userId: number;
    decision: LoginAlertDecision;
  }): Promise<{
    alertId: number;
    publicId: string;
    actionToken: string;
    expiresAt: Date;
  }> {
    const expiresAt = new Date(Date.now() + ALERT_TOKEN_TTL_SECONDS * 1000);
    const alert = await this.prisma.loginAlert.create({
      data: {
        userId: params.userId,
        eventKey: params.eventKey,
        fingerprint: params.decision.fingerprint,
        trustedIp: params.decision.context.ip,
        ipClass: params.decision.context.ipClass,
        environment: params.decision.context.environment,
        proxyChainTrusted: params.decision.context.proxyChainTrusted,
        deviceLabel: params.decision.device.label,
        deviceBrowser: params.decision.device.browser,
        deviceOperatingSystem: params.decision.device.operatingSystem,
        deviceType: params.decision.device.deviceType,
        deviceHash: params.decision.device.hash,
        locationSource: params.decision.location.source,
        locationPrecision: params.decision.location.precision,
        locationCountry: params.decision.location.country,
        locationCity: params.decision.location.city,
        locationRegion: params.decision.location.region,
        locationLatitudeRounded: params.decision.location.latitudeRounded,
        locationLongitudeRounded: params.decision.location.longitudeRounded,
        locationTimezone: params.decision.location.timezone,
        locationOrg: params.decision.location.org,
        locationHostname: params.decision.location.hostname,
        accuracyBucketMeters: params.decision.location.accuracyBucketMeters,
        reason: params.decision.reason,
        actionExpiresAt: expiresAt,
      },
      select: { id: true, publicId: true },
    });
    const jti = crypto.randomUUID();
    const actionToken = this.jwtService.sign(
      {
        sub: params.userId,
        userId: params.userId,
        alertPublicId: alert.publicId,
        purpose: 'login_alert_action',
        jti,
      },
      { expiresIn: '15m', algorithm: 'HS256' },
    );
    await this.prisma.loginAlert.update({
      where: { id: alert.id },
      data: { actionTokenJtiHash: this.hashJti(jti) },
    });
    return {
      alertId: alert.id,
      publicId: alert.publicId,
      actionToken,
      expiresAt,
    };
  }

  async findByActionJti(jti: string, userId: number, alertPublicId: string) {
    return this.prisma.loginAlert.findFirst({
      where: {
        publicId: alertPublicId,
        userId,
        actionTokenJtiHash: this.hashJti(jti),
      },
    });
  }

  async applyAction(alertId: number, action: 'CONFIRMED' | 'DISMISSED') {
    const now = new Date();
    const update = await this.prisma.loginAlert.updateMany({
      where: { id: alertId, actionStatus: 'PENDING' },
      data:
        action === 'CONFIRMED'
          ? { actionStatus: action, confirmedAt: now }
          : { actionStatus: action, dismissedAt: now },
    });
    if (update.count > 0)
      return {
        transitioned: true,
        alert: await this.prisma.loginAlert.findUnique({
          where: { id: alertId },
        }),
      };
    const alert = await this.prisma.loginAlert.findUnique({
      where: { id: alertId },
    });
    return { transitioned: false, alert };
  }

  async markDelivery(
    alertId: number,
    result: { success: boolean; messageId?: string; error?: string },
  ) {
    await this.prisma.loginAlert.update({
      where: { id: alertId },
      data: result.success
        ? {
            deliveryStatus: 'SENT',
            deliveryMessageId: result.messageId ?? null,
            deliveryError: null,
          }
        : {
            deliveryStatus: 'FAILED',
            deliveryError: (result.error ?? 'Falha no envio').slice(0, 240),
          },
    });
  }

  async markDeviceAsKnown(userId: number, fingerprint: string): Promise<void> {
    try {
      await this.redis.set(
        `known_device:${userId}:${fingerprint}`,
        new Date().toISOString(),
        'EX',
        LoginAlertService.DEVICE_TTL_SECONDS,
      );
    } catch {
      // Best effort.
    }
  }

  async recordLastKnownCountry(): Promise<void> {
    // Sem localização por IP disponível.
  }

  private async isAnomalousCountry(): Promise<boolean> {
    return false;
  }

  private decision(
    isNewDevice: boolean,
    isAnomalousGeo: boolean,
    reason: LoginAlertDecision['reason'],
    fingerprint: string,
    geo: null,
    location: ResolvedLoginLocation,
    device: NormalizedDevice,
    context: TrustedClientContext,
  ): LoginAlertDecision {
    return {
      isNewDevice,
      isAnomalousGeo,
      alerted: isNewDevice || isAnomalousGeo,
      reason,
      fingerprint,
      geo,
      location,
      device,
      context,
    };
  }

  private fingerprint(ip: string | null, userAgent: string | null): string {
    return crypto
      .createHash('sha256')
      .update(`${ip ?? 'unknown'}|${userAgent ?? 'unknown'}`)
      .digest('hex')
      .slice(0, 16);
  }

  private hashJti(jti: string): string {
    return crypto.createHash('sha256').update(jti).digest('hex');
  }
}

export interface LoginAlertDecision {
  isNewDevice: boolean;
  isAnomalousGeo: boolean;
  alerted: boolean;
  reason:
    | 'new_device'
    | 'geo_anomaly'
    | 'new_device_and_geo_anomaly'
    | 'known_device'
    | 'debounced';
  fingerprint: string;
  geo: null;
  location: ResolvedLoginLocation;
  device: NormalizedDevice;
  context: TrustedClientContext;
}

export type PendingLoginAlert = {
  eventKey: string;
  userId: number;
  context: TrustedClientContext;
  userAgent: string | null;
};
