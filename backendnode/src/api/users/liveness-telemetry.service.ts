import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLivenessTelemetryDto } from './dto/create-liveness-telemetry.dto';

/**
 * Persiste a telemetria de prova de vida (liveness) enviada pelo cliente.
 *
 * LGPD: nenhum dado biométrico bruto (imagem/template) é armazenado aqui —
 * apenas sinais agregados que dão auditabilidade à decisão de Compliance. O
 * user-agent é guardado apenas como hash (nunca em texto livre).
 */
@Injectable()
export class LivenessTelemetryService {
  private readonly logger = new Logger(LivenessTelemetryService.name);

  constructor(private readonly prisma: PrismaService) {}

  private hashUserAgent(userAgent?: string | null): string | null {
    if (!userAgent) return null;
    return crypto
      .createHash('sha256')
      .update(userAgent)
      .digest('hex')
      .slice(0, 32);
  }

  async record(
    userId: number,
    dto: CreateLivenessTelemetryDto,
    userAgent?: string | null,
  ) {
    const telemetry = await this.prisma.livenessTelemetry.create({
      data: {
        userId,
        kycProfileId: dto.kycProfileId ?? null,
        passed: dto.passed,
        blinkCount: dto.blinkCount ?? 0,
        hasGlasses: dto.hasGlasses ?? null,
        maxYawDeg: dto.maxYawDeg ?? 0,
        maxPitchDeg: dto.maxPitchDeg ?? 0,
        landmarkMovement: dto.landmarkMovement ?? 0,
        avgRelativeMovement: dto.avgRelativeMovement ?? 0,
        durationMs: dto.durationMs ?? 0,
        mimeType: dto.mimeType ?? null,
        instructions: dto.instructions
          ? (dto.instructions as unknown as Prisma.InputJsonValue)
          : undefined,
        challengeResponseMs: dto.challengeResponseMs
          ? (dto.challengeResponseMs as unknown as Prisma.InputJsonValue)
          : undefined,
        rejectionReasons: dto.rejectionReasons
          ? (dto.rejectionReasons as unknown as Prisma.InputJsonValue)
          : undefined,
        injectionSuspicious: dto.injectionSuspicious ?? false,
        injectionReasons: dto.injectionReasons
          ? (dto.injectionReasons as unknown as Prisma.InputJsonValue)
          : undefined,
        userAgentHash: this.hashUserAgent(userAgent),
      },
      select: { publicId: true, createdAt: true },
    });

    // LGPD: não logar métricas com PII; apenas o marco de auditoria.
    this.logger.log(
      `Telemetria de liveness registrada: userId=${userId} passed=${dto.passed}`,
    );

    return telemetry;
  }

  /** Retorna a telemetria mais recente de um usuário (para o painel de KYC). */
  async latestForUser(userId: number) {
    return this.prisma.livenessTelemetry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
