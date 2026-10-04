/**
 * Serviço de uploads.
 *
 * Orquestra o storage provider e o processamento síncrono das variantes.
 * Cada chamada só retorna após o objeto canônico estar disponível e o
 * registro ter sido persistido como READY (ou FAILED em caso de erro).
 */
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma, UploadStatus } from '@prisma/client';
import * as crypto from 'crypto';
import {
  IObjectStorageProvider,
  ObjectStorageUploadResult,
} from '../../common/storage/object-storage.interface';
import { OBJECT_STORAGE_PROVIDER } from '../../common/storage/storage-provider.module';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessorService } from './services/image-processor.service';
import { VariantGeneratorService } from './services/variant-generator.service';

export interface FindAllOptions {
  page?: number;
  limit?: number;
  status?: UploadStatus;
  type?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUploadResult {
  id: number;
  publicId: string;
  status: string;
  rejectionReason?: string;
  sha256: string;
  /** URLs públicas e estáveis das variantes disponíveis. */
  url?: string;
  url_md?: string;
  url_web?: string;
}

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(';', 1)[0].trim().toLowerCase();
}

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
};

const MIME_TO_TYPE: Record<string, 'image' | 'video' | 'document'> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'document',
};

const STORAGE_UNAVAILABLE_REASON =
  'Arquivo indisponível no armazenamento. Envie-o novamente.';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly storageProvider: IObjectStorageProvider,
    @Optional()
    private readonly imageProcessor: ImageProcessorService = new ImageProcessorService(),
    @Optional()
    private readonly variantGenerator: VariantGeneratorService = new VariantGeneratorService(
      imageProcessor,
      storageProvider,
    ),
  ) {}

  /**
   * Recebe, processa e persiste o upload de forma síncrona.
   *
   * Imagens recebem variantes md/web antes do retorno. Documentos não são
   * transformados e repetem a URL original nos campos de variante. Vídeos
   * permanecem somente com o original até existir um transcodificador real
   * disponível no ambiente; nunca copiamos o original como se fosse variante.
   */
  async create(
    file: Express.Multer.File,
    userId?: number,
  ): Promise<CreateUploadResult> {
    const sha256 = await this.calculateSha256(file.buffer);
    const mimeType = normalizeMimeType(file.mimetype);
    const type = MIME_TO_TYPE[mimeType] || 'document';
    const extension = MIME_TO_EXTENSION[mimeType] || 'bin';
    const key = `${sha256}.${extension}`;
    const bucket =
      type === 'video' ? 'video' : type === 'document' ? 'document' : 'image';

    const uploadedObject = await this.uploadCanonicalObject(
      file,
      bucket,
      key,
      mimeType,
    );
    const canonicalUrl = uploadedObject.url;

    if (!(await this.objectIsAvailable(bucket, key))) {
      await this.deleteBestEffort(bucket, key);
      const failed = await this.prisma.upload.create({
        data: {
          userId: userId ?? null,
          type,
          mimeType,
          originalName: file.originalname,
          size: file.size,
          extension,
          bucket,
          key,
          sha256,
          status: UploadStatus.FAILED,
          rejectionReason: STORAGE_UNAVAILABLE_REASON,
        },
      });
      return this.toCreateResult(failed);
    }

    let variants: any = null;
    let urlMd: string | null = null;
    let urlWeb: string | null = null;

    try {
      if (type === 'image') {
        const validation = await this.imageProcessor.validateAndSanitize(
          file.buffer,
          mimeType,
        );
        if (!validation.valid || !validation.metadata) {
          throw new Error(validation.error || 'Imagem inválida ou corrompida.');
        }

        variants = await this.variantGenerator.generateImageVariants(
          file.buffer,
          sha256,
          validation.metadata,
        );
        urlMd = this.variantUrl(variants.md);
        urlWeb = this.variantUrl(variants.sm);

        if (!urlMd || !urlWeb) {
          throw new Error('Não foi possível gerar as variantes da imagem.');
        }
      } else if (type === 'document') {
        urlMd = canonicalUrl;
        urlWeb = canonicalUrl;
      }
    } catch (error) {
      await this.deleteVariantsBestEffort(variants);
      await this.deleteBestEffort(bucket, key);
      const failed = await this.prisma.upload.create({
        data: {
          userId: userId ?? null,
          type,
          mimeType,
          originalName: file.originalname,
          size: file.size,
          extension,
          bucket,
          key,
          sha256,
          status: UploadStatus.FAILED,
          rejectionReason:
            error instanceof Error
              ? error.message
              : 'Falha ao processar o arquivo.',
        },
      });
      return this.toCreateResult(failed);
    }

    const upload = await this.prisma.upload.create({
      data: {
        userId: userId ?? null,
        type,
        mimeType,
        originalName: file.originalname,
        size: file.size,
        extension,
        bucket,
        key,
        sha256,
        variants,
        url: canonicalUrl,
        url_md: urlMd,
        url_web: urlWeb,
        status: UploadStatus.READY,
      },
    });

    this.logger.log(
      `[UploadsService] Upload pronto: id=${upload.id}, sha256=${sha256}, type=${type}`,
    );
    return this.toCreateResult(upload);
  }

  private variantUrl(
    variant:
      | Record<string, { url?: string; bucket?: string; key?: string }>
      | undefined,
  ): string | null {
    const firstVariant = variant ? Object.values(variant)[0] : undefined;
    return firstVariant?.url ?? null;
  }

  private async uploadCanonicalObject(
    file: Express.Multer.File,
    bucket: string,
    key: string,
    contentType: string,
  ): Promise<ObjectStorageUploadResult> {
    try {
      return await this.storageProvider.upload({
        file: file.buffer,
        bucket,
        key,
        contentType,
      });
    } catch (error) {
      this.logger.error(`Falha ao fazer upload canônico: ${String(error)}`);
      throw new InternalServerErrorException(
        'Falha ao fazer upload do arquivo',
      );
    }
  }

  private async objectIsAvailable(
    bucket: string,
    key: string,
  ): Promise<boolean> {
    try {
      return await this.storageProvider.exists(bucket, key);
    } catch (error) {
      this.logger.warn(
        `Falha ao confirmar objeto canônico ${bucket}/${key}: ${String(error)}`,
      );
      return false;
    }
  }

  private async deleteVariantsBestEffort(variants: unknown): Promise<void> {
    if (!variants || typeof variants !== 'object') return;

    const sizeVariants = variants as Record<string, unknown>;
    for (const sizeVariant of Object.values(sizeVariants)) {
      if (!sizeVariant || typeof sizeVariant !== 'object') continue;

      for (const formatVariant of Object.values(
        sizeVariant as Record<string, unknown>,
      )) {
        if (!formatVariant || typeof formatVariant !== 'object') continue;
        const storageObject = formatVariant as {
          bucket?: string;
          key?: string;
        };
        if (!storageObject.bucket || !storageObject.key) continue;

        try {
          await this.storageProvider.delete(
            storageObject.bucket,
            storageObject.key,
          );
        } catch (error) {
          this.logger.warn(
            `Falha ao remover variant ${storageObject.bucket}/${storageObject.key}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  private async deleteBestEffort(bucket: string, key: string): Promise<void> {
    try {
      await this.storageProvider.delete(bucket, key);
    } catch (error) {
      this.logger.warn(
        `Falha na limpeza do objeto ${bucket}/${key}: ${String(error)}`,
      );
    }
  }

  private toCreateResult(upload: any): CreateUploadResult {
    return {
      id: upload.id,
      publicId: upload.publicId,
      status: upload.status,
      rejectionReason: upload.rejectionReason ?? undefined,
      sha256: upload.sha256!,
      url: upload.url ?? undefined,
      url_md: upload.url_md ?? undefined,
      url_web: upload.url_web ?? undefined,
    };
  }

  async findOne(id: number): Promise<any | null> {
    return this.prisma.upload.findUnique({ where: { id } });
  }

  /** Retorna as URLs públicas persistidas do upload pronto. */
  async getStatusForUser(uploadId: number, userId: number) {
    const upload = await this.prisma.upload.findFirst({
      where: { id: uploadId, userId, deletedAt: null },
      select: {
        id: true,
        status: true,
        rejectionReason: true,
        url: true,
        url_md: true,
        url_web: true,
      },
    });
    if (!upload) return null;

    return {
      id: upload.id,
      status: upload.status,
      rejectionReason: upload.rejectionReason,
      url: upload.status === UploadStatus.READY ? upload.url : null,
      url_md: upload.status === UploadStatus.READY ? upload.url_md : null,
      url_web: upload.status === UploadStatus.READY ? upload.url_web : null,
    };
  }

  async findAll(options: FindAllOptions): Promise<PaginatedResult<any>> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;
    const where: Prisma.UploadWhereInput = {};
    if (options.status) where.status = options.status;
    if (options.type) where.type = options.type;

    const [data, total] = await Promise.all([
      this.prisma.upload.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.upload.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async findByUser(userId: number): Promise<any[]> {
    return this.prisma.upload.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findByStartup(startupId: number): Promise<any[]> {
    return this.prisma.upload.findMany({
      where: { startupId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async remove(id: number, user: { id: number; role: string }): Promise<void> {
    const upload = await this.prisma.upload.findUnique({ where: { id } });
    if (!upload) throw new NotFoundException('Upload nao encontrado');

    const refCount = await this.prisma.upload.count({
      where: {
        sha256: upload.sha256 ?? undefined,
        id: { not: id },
        deletedAt: null,
      },
    });
    await this.prisma.upload.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    if (refCount === 0 && upload.bucket && upload.key) {
      try {
        await this.storageProvider.delete(upload.bucket, upload.key);
      } catch (error) {
        this.logger.warn(
          `Falha ao remover objeto canônico do storage: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      await this.deleteVariantsBestEffort(upload.variants);
    }
    this.logger.log(
      `[UploadsService] Upload removido: id=${id}, userId=${user.id}, role=${user.role}`,
    );
  }

  private async calculateSha256(buffer: Buffer): Promise<string> {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}
