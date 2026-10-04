import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SseKmsUploadOptions {
  bucket: string;
  key: string;
  body: Buffer;
  contentType?: string;
  kmsKeyId?: string;
  expiresIn?: number; // segundos até expiração do lifecycle (default 90 dias)
}

export interface SseKmsUploadResult {
  bucket: string;
  key: string;
  url: string;
}

/**
 * Wrapper SSE-KMS para upload de payloads sensíveis (webhooks PIX).
 *
 * Usa SSE-KMS com chave gerenciada ou CMK específica para criptografia
 * no lado do servidor. O payload NUNCA é armazenado em plaintext no S3.
 *
 * LGPD Art. 46: Adoção de medidas de segurança para proteção de dados.
 */
@Injectable()
export class SseKmsService {
  private readonly client: S3Client;
  private readonly logger = new Logger(SseKmsService.name);
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION', 'sa-east-1');
    const accessKey = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');

    this.client = new S3Client({
      ...(accessKey && secretKey
        ? {
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
          }
        : {}),
      region,
    });

    // Bucket para webhooks criptografados
    this.bucketName = this.config.get<string>(
      'SSE_KMS_BUCKET',
      'webhooks-encrypted',
    );
  }

  /**
   * Upload com SSE-KMS.
   *
   * Se `kmsKeyId` informado, usa SSE-KMS com CMK específica.
   * Caso contrário, usa SSE-S3 (chave gerenciada pela AWS).
   */
  async upload(opts: SseKmsUploadOptions): Promise<SseKmsUploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: opts.bucket,
        Key: opts.key,
        Body: opts.body,
        ContentType: opts.contentType ?? 'application/json',
        // SSE-KMS: criptografia no lado do servidor com chave do KMS
        ...(opts.kmsKeyId
          ? {
              ServerSideEncryption: 'aws:kms' as const,
              SSEKMSKeyId: opts.kmsKeyId,
            }
          : {
              ServerSideEncryption: 'AES256' as const,
            }),
      });

      await this.client.send(command);

      const url = await getSignedUrl(this.client, command, {
        expiresIn: opts.expiresIn ?? 3600,
      });

      this.logger.debug(
        `Uploaded to S3: ${opts.bucket}/${opts.key} with SSE-${
          opts.kmsKeyId ? 'KMS' : 'S3'
        }`,
      );

      return {
        bucket: opts.bucket,
        key: opts.key,
        url,
      };
    } catch (error) {
      this.logger.error(`SSE-KMS upload failed: ${error}`);
      throw new InternalServerErrorException('Falha ao criptografar payload');
    }
  }

  /**
   * Download de objeto criptografado.
   */
  async download(bucket: string, key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await this.client.send(command);
      const body = await response.Body?.transformToByteArray();
      if (!body) {
        throw new InternalServerErrorException('Payload vazio no S3');
      }
      return Buffer.from(body);
    } catch (error) {
      this.logger.error(`SSE-KMS download failed: ${error}`);
      throw new InternalServerErrorException(
        'Falha ao descriptografar payload',
      );
    }
  }

  /**
   * Delete de objeto (lifecycle ou revogação).
   */
  async delete(bucket: string, key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
      await this.client.send(command);
      this.logger.debug(`Deleted from S3: ${bucket}/${key}`);
    } catch (error) {
      this.logger.error(`SSE-KMS delete failed: ${error}`);
      throw new InternalServerErrorException('Falha ao remover payload');
    }
  }
}
