import { Inject, Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { IObjectStorageProvider } from '../../../common/storage/object-storage.interface';
import { OBJECT_STORAGE_PROVIDER } from '../../../common/storage/storage-provider.module';
import {
  ImageProcessorService,
  ProcessedImageMetadata,
} from './image-processor.service';

/**
 * Tamanhos de variants de imagem.
 */
export enum ImageSize {
  LG = 'lg',
  MD = 'md',
  SM = 'sm',
}

/**
 * Larguras dos variants.
 */
const SIZE_WIDTHS: Record<ImageSize, number> = {
  [ImageSize.LG]: 0, // O original canonico ja e salvo pelo UploadsService.
  [ImageSize.MD]: 800,
  [ImageSize.SM]: 200,
};

/**
 * Buckets por tamanho.
 */
const SIZE_BUCKETS: Record<ImageSize, string> = {
  [ImageSize.LG]: 'image',
  [ImageSize.MD]: 'image-md',
  [ImageSize.SM]: 'image-sm',
};

type VariantFormatName = 'png' | 'jpeg' | 'webp' | 'gif';

const FORMAT_CONFIG: Record<
  VariantFormatName,
  { extension: string; contentType: string }
> = {
  png: { extension: 'png', contentType: 'image/png' },
  jpeg: { extension: 'jpg', contentType: 'image/jpeg' },
  webp: { extension: 'webp', contentType: 'image/webp' },
  gif: { extension: 'gif', contentType: 'image/gif' },
};

/**
 * Variant de um tamanho especifico.
 *
 * O mapa e intencionalmente aberto a formatos legados no JSON persistido. O
 * gerador atual grava apenas um formato por tamanho, mas o cleanup tambem
 * precisa conseguir remover registros antigos com AVIF/JPEG/WebP multiplos.
 */
export type SizeVariant = Partial<
  Record<VariantFormatName | 'avif', VariantFormat>
>;

/**
 * Variant de um formato especifico.
 */
export interface VariantFormat {
  bucket: string;
  key: string;
  url: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Resultado completo de geracao de variants.
 */
export interface VariantsResult {
  lg: SizeVariant;
  md: SizeVariant;
  sm: SizeVariant;
}

/**
 * Servico de geracao de variants de imagem.
 *
 * Gera tres representacoes fisicas por imagem:
 * - original canonico em image, preservando o formato recebido;
 * - media em image-md, com largura maxima de 800px e o mesmo formato;
 * - pequena em image-sm, com largura maxima de 200px e WebP.
 *
 * A entrada lg permanece vazia porque o original canonico e salvo uma unica
 * vez pelo UploadsService. Isso preserva o shape legado sem duplicar storage.
 */
@Injectable()
export class VariantGeneratorService {
  private readonly logger = new Logger(VariantGeneratorService.name);

  constructor(
    private readonly imageProcessor: ImageProcessorService,
    @Inject(OBJECT_STORAGE_PROVIDER)
    private readonly storageProvider: IObjectStorageProvider,
  ) {}

  /**
   * Gera as variantes media e pequena de uma imagem.
   *
   * A media preserva o formato detectado no arquivo original (PNG continua
   * PNG, JPEG continua JPEG etc.). A pequena e sempre convertida para WebP.
   * As duas operacoes sao executadas em paralelo para reduzir a latencia do
   * endpoint sem voltar a gerar formatos desnecessarios.
   *
   * @param buffer - Buffer da imagem original
   * @param sha256 - Hash SHA-256 do conteudo
   * @param originalMetadata - Metadados da imagem original
   * @returns JSON compativel com o shape lg/md/sm persistido
   */
  async generateImageVariants(
    buffer: Buffer,
    sha256: string,
    originalMetadata: ProcessedImageMetadata,
  ): Promise<VariantsResult> {
    const variants: VariantsResult = {
      lg: {},
      md: {},
      sm: {},
    };
    const originalFormat = this.normalizeOriginalFormat(
      originalMetadata.format,
    );

    // O resize de cada tamanho e independente e pode usar os recursos de Sharp
    // em paralelo. Sem uma conversao por formato, sao apenas duas derivadas.
    const [mediumBuffer, smallSourceBuffer] = await Promise.all([
      this.resizeIfNeeded(buffer, originalMetadata.width, SIZE_WIDTHS.md),
      this.resizeIfNeeded(buffer, originalMetadata.width, SIZE_WIDTHS.sm),
    ]);

    const [mediumVariant, smallVariant] = await Promise.all([
      this.persistVariant(mediumBuffer, sha256, ImageSize.MD, originalFormat),
      this.persistVariant(
        smallSourceBuffer,
        sha256,
        ImageSize.SM,
        'webp',
        true,
      ),
    ]);

    if (mediumVariant) {
      variants.md[originalFormat] = mediumVariant;
    }
    if (smallVariant) {
      variants.sm.webp = smallVariant;
    }

    return variants;
  }

  private async resizeIfNeeded(
    buffer: Buffer,
    originalWidth: number,
    targetWidth: number,
  ): Promise<Buffer> {
    return originalWidth > targetWidth
      ? this.imageProcessor.resize(buffer, targetWidth)
      : buffer;
  }

  private normalizeOriginalFormat(format: string): VariantFormatName {
    const normalized =
      format.toLowerCase() === 'jpg' ? 'jpeg' : format.toLowerCase();
    return normalized in FORMAT_CONFIG
      ? (normalized as VariantFormatName)
      : 'jpeg';
  }

  private async persistVariant(
    sourceBuffer: Buffer,
    sha256: string,
    size: ImageSize,
    format: VariantFormatName,
    convertToWebp = false,
  ): Promise<VariantFormat | null> {
    try {
      const formatBuffer = convertToWebp
        ? await this.imageProcessor.toWebp(sourceBuffer)
        : sourceBuffer;
      const config = FORMAT_CONFIG[format];
      const key = `${sha256}.${config.extension}`;
      const bucket = SIZE_BUCKETS[size];

      // Upload e leitura dos metadados sao independentes para o mesmo buffer.
      const [result, variantMeta] = await Promise.all([
        this.storageProvider.upload({
          file: formatBuffer,
          bucket,
          key,
          contentType: config.contentType,
        }),
        this.getVariantMetadata(formatBuffer),
      ]);

      return {
        bucket: result.bucket,
        key: result.key,
        url: result.url,
        size: formatBuffer.length,
        width: variantMeta.width,
        height: variantMeta.height,
      };
    } catch (error) {
      this.logger.warn(
        `Falha ao gerar variant ${size}/${format}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Obtem metadados de uma variant.
   */
  private async getVariantMetadata(
    buffer: Buffer,
  ): Promise<{ width: number; height: number }> {
    try {
      const meta = await sharp(buffer).metadata();
      return {
        width: meta.width || 0,
        height: meta.height || 0,
      };
    } catch {
      return { width: 0, height: 0 };
    }
  }
}
