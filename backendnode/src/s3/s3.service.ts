import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  Global,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IObjectStorageProvider } from '../common/storage/object-storage.interface';
import { getStorageProvider } from '../common/storage/storage-provider.factory';
import type { S3Bucket, S3DownloadResult, S3UploadResult } from './s3.types';

export const ALL_BUCKETS: S3Bucket[] = [
  'document',
  'image',
  'image-sm',
  'image-md',
  'video',
  'video-sm',
  'video-md',
  'video-lg',
  'comprovante',
];

/**
 * Wrapper S3Service que delega para IObjectStorageProvider.
 *
 * Mantem backward compatibility com a API existente enquanto delega
 * para o provider AWS S3.
 *
 * @deprecated Use IObjectStorageProvider diretamente via StorageProviderModule.
 * Para migrar, substitua S3Service por injeção de IObjectStorageProvider.
 *
 * @example
 * // Antes (deprecated)
 * constructor(private s3Service: S3Service) {}
 * await this.s3Service.upload(file, 'image', 'key');
 *
 * // Depois (recomendado)
 * constructor(@Inject(IObjectStorageProvider) private storage: IObjectStorageProvider) {}
 * await this.storage.upload({ file, bucket: 'image', key });
 */
@Global()
@Injectable()
export class S3Service implements OnModuleInit {
  private readonly client: S3Client;
  private readonly logger = new Logger(S3Service.name);
  private readonly bucketPrefix: string;
  private readonly publicBaseUrl: string;
  readonly s3PublicBaseUrl: string;
  private storageProvider: IObjectStorageProvider | null = null;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION', 'sa-east-1');
    const accessKey = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    this.bucketPrefix = this.config.get<string>('S3_BUCKET_PREFIX', '');
    this.publicBaseUrl = this.config.get<string>(
      'BACKEND_PUBLIC_URL',
      'http://localhost:7077',
    );
    this.s3PublicBaseUrl = this.config.get<string>(
      'S3_PUBLIC_BASE_URL',
      `https://s3.${region}.amazonaws.com`,
    );

    this.logger.log(`[S3Service] Configurando AWS S3 (região ${region})`);
    this.client = new S3Client({
      ...(accessKey && secretKey
        ? {
            credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
          }
        : {}),
      region,
    });
  }

  async onModuleInit() {
    try {
      // Tenta usar o provider de storage configurado
      this.storageProvider = await getStorageProvider(this.config);
    } catch (error) {
      this.logger.warn(
        `[S3Service] Storage provider indisponível: ${error}. Usando S3Client legado.`,
      );
    }

    try {
      await this.ensureBucketsExist();
    } catch (error) {
      this.logger.warn(
        `AWS S3 indisponível na inicialização — buckets não foram verificados. Erro: ${error}`,
      );
    }
  }

  private bucketName(name: S3Bucket): string {
    return this.bucketPrefix ? `${this.bucketPrefix}-${name}` : name;
  }

  async ensureBucketsExist() {
    for (const bucket of ALL_BUCKETS) {
      const name = this.bucketName(bucket);
      const exists = await this.bucketExists(name);
      if (!exists) {
        await this.createBucket(name);
        this.logger.log(`Bucket criado: ${name}`);
      } else {
        this.logger.debug(`Bucket já existe: ${name}`);
      }
    }
    this.logger.log('Verificação de buckets concluída');
  }

  /**
   * @deprecated Use IObjectStorageProvider.upload() diretamente.
   * Migracao: substitua `s3Service.upload(file, bucket, key, contentType)`
   * por `storage.upload({ file, bucket, key, contentType })`.
   */
  async upload(
    file: Buffer,
    bucket: S3Bucket,
    key: string,
    contentType?: string,
  ): Promise<S3UploadResult> {
    // Tenta usar o provider se disponivel
    if (this.storageProvider) {
      const result = await this.storageProvider.upload({
        file,
        bucket,
        key,
        contentType,
      });
      return {
        url: result.url,
        key: result.key,
        bucket: result.bucket,
        size: result.size,
      };
    }

    // Fallback para S3Client legado
    return this.uploadLegacy(file, bucket, key, contentType);
  }

  private async uploadLegacy(
    file: Buffer,
    bucket: S3Bucket,
    key: string,
    contentType?: string,
  ): Promise<S3UploadResult> {
    try {
      const bucketName = this.bucketName(bucket);
      await this.client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: file,
          ContentType: contentType,
          ContentLength: file.length,
        }),
      );

      return {
        url: `${this.publicBaseUrl}/${bucketName}/${key}`,
        key,
        bucket: bucketName,
        size: file.length,
      };
    } catch (error) {
      this.logger.error(`Erro no upload (${bucket}/${key}): ${error}`);
      throw new InternalServerErrorException('Falha no upload do arquivo');
    }
  }

  /**
   * @deprecated Use IObjectStorageProvider.download() diretamente.
   */
  async download(bucket: S3Bucket, key: string): Promise<S3DownloadResult> {
    if (this.storageProvider) {
      const result = await this.storageProvider.download(bucket, key);
      return {
        body: result.body,
        contentType: result.contentType,
        size: result.size,
      };
    }

    return this.downloadLegacy(bucket, key);
  }

  private async downloadLegacy(
    bucket: S3Bucket,
    key: string,
  ): Promise<S3DownloadResult> {
    try {
      const bucketName = this.bucketName(bucket);
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: bucketName, Key: key }),
      );

      const body = await response.Body?.transformToByteArray();
      if (!body) {
        throw new InternalServerErrorException('Corpo do arquivo vazio');
      }

      return {
        body: Buffer.from(body),
        contentType: response.ContentType || 'application/octet-stream',
        size: response.ContentLength || 0,
      };
    } catch (error) {
      this.logger.error(`Erro no download (${bucket}/${key}): ${error}`);
      throw new InternalServerErrorException('Falha no download do arquivo');
    }
  }

  /**
   * @deprecated Use IObjectStorageProvider.getPresignedUrl() diretamente.
   */
  async getUrl(
    bucket: S3Bucket,
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    if (this.storageProvider) {
      return this.storageProvider.getPresignedUrl(bucket, key, expiresIn);
    }

    return this.getUrlLegacy(bucket, key, expiresIn);
  }

  /**
   * Converte uma URL S3 legada em URL presigned sem expor o bucket.
   *
   * URLs externas (por exemplo, placeholders) são mantidas. Apenas hosts
   * S3 que correspondem a um bucket de imagem configurado são assinados.
   * URLs já assinadas também são retornadas sem gerar uma nova assinatura.
   */
  async getPresignedImageUrl(
    sourceUrl: string | null | undefined,
    expiresIn = 900,
  ): Promise<string | null> {
    if (!sourceUrl) return null;

    let parsed: URL;
    try {
      parsed = new URL(sourceUrl);
    } catch {
      return sourceUrl;
    }

    if (
      parsed.searchParams.has('X-Amz-Signature') ||
      parsed.searchParams.has('x-amz-signature')
    ) {
      return sourceUrl;
    }

    const imageBuckets: S3Bucket[] = ['image', 'image-sm', 'image-md'];
    let bucket: S3Bucket | null = null;
    let key = '';

    for (const candidate of imageBuckets) {
      const physicalBucket = this.bucketName(candidate);
      if (
        parsed.hostname === `${physicalBucket}.s3.amazonaws.com` ||
        parsed.hostname.startsWith(`${physicalBucket}.s3.`)
      ) {
        bucket = candidate;
        key = parsed.pathname.slice(1);
        break;
      }
    }

    if (!bucket && parsed.hostname.startsWith('s3.')) {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const physicalBucket = pathParts.shift();
      const candidate = imageBuckets.find(
        (item) => this.bucketName(item) === physicalBucket,
      );
      if (candidate) {
        bucket = candidate;
        key = pathParts.join('/');
      }
    }

    if (!bucket) {
      const isS3Host =
        parsed.hostname.endsWith('.amazonaws.com') &&
        (parsed.hostname.includes('.s3.') || parsed.hostname.startsWith('s3.'));
      return isS3Host ? null : sourceUrl;
    }

    try {
      key = decodeURIComponent(key);
    } catch {
      return null;
    }
    if (!key) return null;

    try {
      return await this.getUrl(bucket, key, expiresIn);
    } catch (error) {
      this.logger.warn(`Falha ao assinar imagem S3: ${error}`);
      return null;
    }
  }

  private async getUrlLegacy(
    bucket: S3Bucket,
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    try {
      const bucketName = this.bucketName(bucket);
      const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Erro ao gerar URL (${bucket}/${key}): ${error}`);
      throw new InternalServerErrorException('Falha ao gerar URL assinada');
    }
  }

  /**
   * Retorna a URL pública (não-assinada) para um objeto no AWS S3.
   *
   * @param bucket - Bucket onde o objeto está armazenado
   * @param key    - Chave (path) do objeto
   * @returns      URL pública completa no formato {s3PublicBaseUrl}/{bucketName}/{key}
   */
  getPublicUrl(bucket: S3Bucket, key: string): string {
    const bucketName = this.bucketName(bucket);
    return `${this.s3PublicBaseUrl}/${bucketName}/${key}`;
  }

  /**
   * @deprecated Use IObjectStorageProvider.delete() diretamente.
   */
  async delete(bucket: S3Bucket, key: string): Promise<void> {
    if (this.storageProvider) {
      return this.storageProvider.delete(bucket, key);
    }

    return this.deleteLegacy(bucket, key);
  }

  private async deleteLegacy(bucket: S3Bucket, key: string): Promise<void> {
    try {
      const bucketName = this.bucketName(bucket);
      await this.client.send(
        new DeleteObjectCommand({ Bucket: bucketName, Key: key }),
      );
    } catch (error) {
      this.logger.error(`Erro no delete (${bucket}/${key}): ${error}`);
      throw new InternalServerErrorException('Falha ao remover arquivo');
    }
  }

  /**
   * @deprecated Use IObjectStorageProvider.exists() diretamente.
   */
  async exists(bucket: S3Bucket, key: string): Promise<boolean> {
    if (this.storageProvider) {
      return this.storageProvider.exists(bucket, key);
    }

    return this.existsLegacy(bucket, key);
  }

  private async existsLegacy(bucket: S3Bucket, key: string): Promise<boolean> {
    try {
      const bucketName = this.bucketName(bucket);
      await this.client.send(
        new HeadObjectCommand({ Bucket: bucketName, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o provider de storage esta saudavel.
   *
   * @returns true se o storage provider ou S3Client estiver acessivel
   */
  async healthCheck(): Promise<boolean> {
    if (this.storageProvider) {
      return this.storageProvider.healthCheck();
    }

    // Fallback para S3Client legado
    const defaultBucket = this.bucketName('image');
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: defaultBucket }));
      return true;
    } catch {
      return false;
    }
  }

  private async bucketExists(name: string): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: name }));
      return true;
    } catch {
      return false;
    }
  }

  private async createBucket(name: string): Promise<void> {
    await this.client.send(new CreateBucketCommand({ Bucket: name }));
  }
}
