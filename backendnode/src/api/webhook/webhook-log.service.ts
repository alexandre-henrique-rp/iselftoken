import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { SseKmsService } from '../../common/s3/sse-kms.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Payload do webhook EFI recebido.
 */
export interface WebhookPayload {
  event?: string;
  pix?: Array<{
    hr?: string; // CPF/CNPJ do pagador (PII)
    debito?: { cpf?: string; cnpj?: string }; // dados do pagador
  }>;
  charge?: {
    billing?: { cpf?: string; cnpj?: string };
  };
  [key: string]: unknown;
}

/**
 * Opções para log de webhook.
 */
export interface LogWebhookOptions {
  provider: string;
  eventType: string;
  payload: WebhookPayload;
  txid?: string;
  endToEndId?: string;
  amount?: number;
  status: 'SUCCESS' | 'ERROR';
  errorCode?: string;
  errorLog?: string;
  ipAddress?: string;
  idempotencyKey?: string;
}

/**
 * Resultado do log de webhook.
 */
export interface LogWebhookResult {
  id: string;
  payloadS3Key?: string;
  payloadS3Bucket?: string;
  payloadExpiresAt?: Date;
}

/**
 * Service para log de webhooks com PII criptografado em S3 (SSE-KMS).
 *
 * LGPD Art. 46: Dados sensíveis (CPF/CNPJ) são:
 * 1. Extraídos e anonimizados via HMAC-SHA256
 * 2. Payload bruto criptografado em S3 com SSE-KMS
 * 3. Lifecycle: 90 dias para exclusão automática
 */
@Injectable()
export class WebhookLogService {
  private readonly logger = new Logger(WebhookLogService.name);
  private readonly s3Bucket: string;
  private readonly webhookHashSecret: string;
  private readonly lifecycleDays = 90;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sseKms: SseKmsService,
    private readonly config: ConfigService,
  ) {
    this.s3Bucket = this.config.get('SSE_KMS_BUCKET', 'webhooks-encrypted');
    this.webhookHashSecret = this.config.getOrThrow<string>(
      'WEBHOOK_HASH_SECRET',
    );
  }

  /**
   * Extrai e anonimiza PII do payload via HMAC-SHA256.
   *
   * O PII original NUNCA é armazenado — apenas o hash.
   * Isso permite consultas por CPF/CNPJ sem expor o dado.
   */
  private extractAndAnonymizePii(payload: WebhookPayload): {
    cpfHash: string | null;
    cnpjHash: string | null;
  } {
    let cpf: string | null = null;
    let cnpj: string | null = null;

    // Extrai CPF/CNPJ do payload PIX (formato EFI)
    if (payload.pix && Array.isArray(payload.pix)) {
      for (const pix of payload.pix) {
        if (pix.hr) {
          //，端aria pode vir no campo "hr" (hash do documento)
          cpf = pix.hr;
        }
        if (pix.debito) {
          if (pix.debito.cpf) cpf = pix.debito.cpf;
          if (pix.debito.cnpj) cnpj = pix.debito.cnpj;
        }
      }
    }

    // Extrai de charge.billing
    if (payload.charge?.billing) {
      if (payload.charge.billing.cpf) cpf = payload.charge.billing.cpf;
      if (payload.charge.billing.cnpj) cnpj = payload.charge.billing.cnpj;
    }

    return {
      cpfHash: cpf ? this.hashPii(cpf) : null,
      cnpjHash: cnpj ? this.hashPii(cnpj) : null,
    };
  }

  /**
   * Hash HMAC-SHA256 para anonimização de PII.
   */
  private hashPii(value: string): string {
    return createHmac('sha256', this.webhookHashSecret)
      .update(value)
      .digest('hex');
  }

  /**
   * Salva payload bruto em S3 com SSE-KMS.
   */
  private async savePayloadToS3(
    payload: WebhookPayload,
  ): Promise<{ key: string; bucket: string; expiresAt: Date }> {
    const id = crypto.randomUUID();
    const key = `webhooks/${id}.json`;
    const expiresAt = new Date(
      Date.now() + this.lifecycleDays * 24 * 60 * 60 * 1000,
    );

    const buffer = Buffer.from(JSON.stringify(payload, null, 2));

    const result = await this.sseKms.upload({
      bucket: this.s3Bucket,
      key,
      body: buffer,
      contentType: 'application/json',
      expiresIn: this.lifecycleDays * 24 * 60 * 60, // 90 dias em segundos
    });

    this.logger.debug(`Payload salvo em S3: ${result.bucket}/${result.key}`);

    return { key, bucket: result.bucket, expiresAt };
  }

  /**
   * Log de webhook com PII criptografado.
   *
   * Fluxo:
   * 1. Extrai PII e gera HMAC-SHA256 (anonimizado)
   * 2. Salva payload bruto em S3 com SSE-KMS
   * 3. Salva no banco com referências S3 e hashes
   */
  async log(opts: LogWebhookOptions): Promise<LogWebhookResult> {
    try {
      // 1. Extrai e anonimiza PII
      const { cpfHash, cnpjHash } = this.extractAndAnonymizePii(opts.payload);

      // 2. Salva payload em S3
      const { key, bucket, expiresAt } = await this.savePayloadToS3(
        opts.payload,
      );

      // 3. Salva no banco
      const webhookLog = await this.prisma.webhookLog.create({
        data: {
          provider: opts.provider,
          eventType: opts.eventType,
          txid: opts.txid,
          endToEndId: opts.endToEndId,
          cpfHash,
          cnpjHash,
          amount: opts.amount,
          status: opts.status,
          errorCode: opts.errorCode,
          errorLog: opts.errorLog,
          payloadS3Key: key,
          payloadS3Bucket: bucket,
          payloadExpiresAt: expiresAt,
          processed: opts.status === 'SUCCESS',
          processedAt: opts.status === 'SUCCESS' ? new Date() : null,
          ipAddress: opts.ipAddress,
          idempotencyKey: opts.idempotencyKey,
        },
      });

      this.logger.log(
        `WebhookLog criado: id=${webhookLog.id} event=${opts.eventType} txid=${opts.txid ?? 'N/A'}`,
      );

      return {
        id: webhookLog.id,
        payloadS3Key: key,
        payloadS3Bucket: bucket,
        payloadExpiresAt: expiresAt,
      };
    } catch (error) {
      this.logger.error(`Falha ao criar WebhookLog: ${error}`);
      throw new InternalServerErrorException('Falha ao processar webhook');
    }
  }
}
