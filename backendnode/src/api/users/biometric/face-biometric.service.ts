import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FACE_EMBEDDER, FaceEmbedder } from './face-embedder';
import { TemplateCipherService } from './template-cipher.service';

export interface EnrollResult {
  enrolled: boolean;
  reason?: 'no_consent' | 'embedder_disabled' | 'no_face';
  publicId?: string;
}

/**
 * Gerencia o template biométrico facial persistente (Fase 5).
 *
 * Regras LGPD:
 *  - `enroll` só grava se houver consentimento biométrico válido
 *    (`User.biofacialConsentAt`). Sem consentimento → não extrai nem persiste.
 *  - `purge` remove o template na revogação do consentimento (Art. 18 IX).
 *  - O vetor é cifrado (AES-256-GCM) antes de tocar o banco; o hash em claro
 *    guardado é irreversível (auditoria/dedup).
 */
@Injectable()
export class FaceBiometricService {
  private readonly logger = new Logger(FaceBiometricService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: TemplateCipherService,
    @Inject(FACE_EMBEDDER) private readonly embedder: FaceEmbedder,
  ) {}

  /**
   * Extrai e persiste o template facial de um usuário, a partir de um buffer de
   * mídia (imagem/frame do biofacial). Idempotente: faz upsert por usuário.
   */
  async enroll(params: {
    userId: number;
    media: Buffer;
    mimeType?: string;
    kycProfileId?: number | null;
  }): Promise<EnrollResult> {
    const { userId, media, mimeType, kycProfileId } = params;

    // 1. Consentimento é pré-requisito (LGPD Art. 11 I).
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { biofacialConsentAt: true, biofacialConsentVersion: true },
    });
    if (!user?.biofacialConsentAt) {
      this.logger.warn(
        `enroll bloqueado: sem consentimento biométrico (userId=${userId})`,
      );
      return { enrolled: false, reason: 'no_consent' };
    }

    // 2. Extrator plugável (Noop por enquanto).
    if (!this.embedder.isEnabled()) {
      return { enrolled: false, reason: 'embedder_disabled' };
    }
    const embedding = await this.embedder.extract(media, mimeType);
    if (!embedding) {
      return { enrolled: false, reason: 'no_face' };
    }

    // 3. Cifra o vetor e persiste (upsert 1:1 por usuário).
    const enc = this.cipher.encryptVector(embedding.vector);
    const templateHash = this.cipher.hashVector(embedding.vector);

    const record = await this.prisma.faceBiometric.upsert({
      where: { userId },
      create: {
        userId,
        templateEnc: enc.templateEnc,
        iv: enc.iv,
        authTag: enc.authTag,
        modelVersion: embedding.modelVersion,
        dim: embedding.dim,
        templateHash,
        consentVersion: user.biofacialConsentVersion ?? null,
        kycProfileId: kycProfileId ?? null,
      },
      update: {
        templateEnc: enc.templateEnc,
        iv: enc.iv,
        authTag: enc.authTag,
        modelVersion: embedding.modelVersion,
        dim: embedding.dim,
        templateHash,
        consentVersion: user.biofacialConsentVersion ?? null,
        kycProfileId: kycProfileId ?? null,
      },
      select: { publicId: true },
    });

    this.logger.log(`Template biométrico gravado: userId=${userId}`);
    return { enrolled: true, publicId: record.publicId };
  }

  /**
   * Remove o template biométrico do usuário (revogação de consentimento).
   * Idempotente: não falha se não existir.
   */
  async purge(userId: number): Promise<{ purged: boolean }> {
    const result = await this.prisma.faceBiometric.deleteMany({
      where: { userId },
    });
    if (result.count > 0) {
      this.logger.log(
        `Template biométrico purgado (revogação): userId=${userId}`,
      );
    }
    return { purged: result.count > 0 };
  }

  /** Recupera o vetor em claro (uso interno, ex.: face-match da Fase 6). */
  async getVector(userId: number): Promise<number[] | null> {
    const rec = await this.prisma.faceBiometric.findUnique({
      where: { userId },
    });
    if (!rec) return null;
    return this.cipher.decryptVector({
      templateEnc: rec.templateEnc,
      iv: rec.iv,
      authTag: rec.authTag,
    });
  }
}
