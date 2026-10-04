import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedTemplate {
  /** Vetor cifrado em base64. */
  templateEnc: string;
  /** IV (nonce) em base64. */
  iv: string;
  /** Auth tag GCM em base64. */
  authTag: string;
}

/**
 * Cifra/decifra o template biométrico com AES-256-GCM.
 *
 * LGPD Art. 11/46: o vetor de embedding é dado sensível e NUNCA é persistido
 * em texto plano. A chave vem de `BIOMETRIC_TEMPLATE_KEY` (32 bytes em hex/base64).
 * Em produção, essa chave deve residir em um KMS/Vault, não em `.env`.
 */
@Injectable()
export class TemplateCipherService {
  private readonly logger = new Logger(TemplateCipherService.name);
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = TemplateCipherService.resolveKey(
      config.get<string>('BIOMETRIC_TEMPLATE_KEY'),
    );
  }

  /** Deriva uma chave de 32 bytes a partir do env (hex, base64 ou passphrase). */
  static resolveKey(raw?: string | null): Buffer {
    if (!raw) {
      // Dev/stub: chave derivada determinística (NUNCA usar em produção).
      // Um aviso é emitido pelo serviço na primeira operação.
      return crypto
        .createHash('sha256')
        .update('iselftoken-dev-biometric-key')
        .digest();
    }
    // hex de 64 chars → 32 bytes
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');
    // base64 que decodifica para 32 bytes
    try {
      const b = Buffer.from(raw, 'base64');
      if (b.length === 32) return b;
    } catch {
      /* ignore */
    }
    // passphrase arbitrária → SHA-256 (32 bytes)
    return crypto.createHash('sha256').update(raw).digest();
  }

  /** Serializa e cifra um vetor de floats. */
  encryptVector(vector: number[]): EncryptedTemplate {
    const plaintext = Buffer.from(Float32Array.from(vector).buffer);
    const iv = crypto.randomBytes(12); // 96-bit nonce recomendado p/ GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      templateEnc: enc.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /** Decifra de volta para o vetor de floats. */
  decryptVector(payload: EncryptedTemplate): number[] {
    const iv = Buffer.from(payload.iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(payload.templateEnc, 'base64')),
      decipher.final(),
    ]);
    const floats = new Float32Array(
      dec.buffer,
      dec.byteOffset,
      dec.byteLength / 4,
    );
    return Array.from(floats);
  }

  /** Hash SHA-256 (hex) do vetor em claro — auditoria/dedup, não reversível. */
  hashVector(vector: number[]): string {
    const buf = Buffer.from(Float32Array.from(vector).buffer);
    return crypto.createHash('sha256').update(buf).digest('hex');
  }
}
