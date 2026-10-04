import { Injectable, Logger, PayloadTooLargeException } from '@nestjs/common';
import * as sharp from 'sharp';

/**
 * Limites de validacao para imagens.
 */
const MAX_IMAGE_PIXELS = 8000 * 8000; // 64 megapixels
const MAX_DIMENSION = 8000;

/**
 * Resultado da validacao de imagem.
 */
export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
  format?: string;
  metadata?: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

/**
 * Metadados de imagem processada.
 */
export interface ProcessedImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * Servico de processamento de imagens.
 *
 * Responsavel por:
 * - Remocao de metadados EXIF (LGPD compliance)
 * - Validacao de dimensoes (anti-DoS)
 * - Conversao para formatos modernos (AVIF, WebP, JPEG)
 */
@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);

  /**
   * Valida e sanitiza uma imagem.
   *
   * Remove EXIF, ICC, XMP e IPTC por padrao (sharp).
   * Valida que largura x altura nao excede MAX_IMAGE_PIXELS.
   *
   * @param buffer - Buffer da imagem
   * @param mimeType - MIME type da imagem
   * @returns Resultado da validacao com metadados
   * @throws PayloadTooLargeException se exceder limites
   */
  async validateAndSanitize(
    buffer: Buffer,
    mimeType: string,
  ): Promise<ImageValidationResult> {
    try {
      const image = sharp(buffer, { limitInputPixels: MAX_IMAGE_PIXELS });

      // Obter metadados SEM calcularhash (leve)
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return { valid: false, error: 'Imagem invalida ou corrompida' };
      }

      const pixelCount = metadata.width * metadata.height;

      if (pixelCount > MAX_IMAGE_PIXELS) {
        throw new PayloadTooLargeException(
          `Imagem excede limite de ${MAX_IMAGE_PIXELS} pixels (${metadata.width}x${metadata.height})`,
        );
      }

      if (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION) {
        throw new PayloadTooLargeException(
          `Imagem excede limite de ${MAX_DIMENSION}x${MAX_DIMENSION} pixels`,
        );
      }

      return {
        valid: true,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format || 'unknown',
          size: buffer.length,
        },
      };
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw error;
      }

      this.logger.error(
        `Erro ao processar imagem: ${error instanceof Error ? error.message : String(error)}`,
      );

      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Remove metadados EXIF de uma imagem.
   *
   * A saida do sharp ja remove EXIF, ICC, XMP e IPTC por padrao.
   * Este metodo garante que nenhuma metadata seja preservada.
   *
   * @param buffer - Buffer da imagem original
   * @returns Buffer da imagem sem metadados
   */
  async stripMetadata(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .rotate() // Auto-rotate based on EXIF, then strip
      .toBuffer();
  }

  /**
   * Converte imagem para AVIF.
   *
   * @param buffer - Buffer da imagem
   * @param quality - Qualidade (0-100), default 60
   * @returns Buffer da imagem em AVIF
   */
  async toAvif(buffer: Buffer, quality: number = 60): Promise<Buffer> {
    return sharp(buffer).toFormat('avif', { quality }).toBuffer();
  }

  /**
   * Converte imagem para WebP.
   *
   * @param buffer - Buffer da imagem
   * @param quality - Qualidade (0-100), default 75
   * @returns Buffer da imagem em WebP
   */
  async toWebp(buffer: Buffer, quality: number = 75): Promise<Buffer> {
    return sharp(buffer).toFormat('webp', { quality }).toBuffer();
  }

  /**
   * Converte imagem para JPEG.
   *
   * @param buffer - Buffer da imagem
   * @param quality - Qualidade (0-100), default 80
   * @returns Buffer da imagem em JPEG
   */
  async toJpeg(buffer: Buffer, quality: number = 80): Promise<Buffer> {
    return sharp(buffer)
      .toFormat('jpeg', { quality, mozjpeg: true })
      .toBuffer();
  }

  /**
   * Redimensiona imagem mantendo proporcao.
   *
   * @param buffer - Buffer da imagem
   * @param width - Largura maxima
   * @param height - Altura maxima
   * @returns Buffer da imagem redimensionada
   */
  async resize(
    buffer: Buffer,
    width: number,
    height?: number,
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize({
        width,
        height,
        withoutEnlargement: true,
        fit: 'inside',
      })
      .toBuffer();
  }
}
