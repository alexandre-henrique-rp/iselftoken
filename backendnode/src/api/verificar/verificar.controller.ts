import {
  Controller,
  Get,
  Param,
  Res,
  HttpStatus,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { VerificarService } from './verificar.service';
import {
  VerificarResponseDto,
  VerificarNotFoundResponseDto,
  VerificarDownloadResponseDto,
} from './dto/verificar-response.dto';

/**
 * Public controller for verifying signed documents.
 *
 * @description Provides public endpoints for validating the authenticity
 * of digitally signed Termo de Adesao documents. No authentication required.
 * Rate-limited to prevent abuse (100 requests/IP/minute).
 *
 * Endpoints:
 * - GET /verificar/:documentId - Validate document authenticity
 * - GET /verificar/:documentId/download - Download the signed PDF
 */
@ApiTags('Verificar')
@Controller('verificar')
export class VerificarController {
  constructor(private readonly verificarService: VerificarService) {}

  /**
   * Validates the authenticity of a signed document.
   *
   * This endpoint is PUBLIC (no authentication required) but rate-limited.
   * It performs the following validations:
   * - Document existence
   * - PDF hash integrity (SHA-256 comparison)
   * - Certificate validity (active and not expired)
   * - Signature recency (signed within certificate validity)
   *
   * @param documentId - UUID of the signed document
   * @returns VerificarResponseDto with validation results and signatory info
   */
  @Get(':documentId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @ApiOperation({
    summary: 'Verificar documento assinado',
    description:
      'Endpoint PUBLICO para validar autenticidade de documento assinado digitalmente. ' +
      'Retorna informacoes sanitizadas (CPF/CNPJ mascarados). Rate-limited: 100 req/IP/min.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documento encontrado e validado',
    type: VerificarResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Documento nao encontrado',
    type: VerificarNotFoundResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas requisicoes. Tente novamente em alguns minutos.',
  })
  async verificarDocumento(
    @Param('documentId') documentId: string,
  ): Promise<VerificarResponseDto> {
    return this.verificarService.verificarDocumento(documentId);
  }

  /**
   * Returns the signed PDF for download or redirects to presigned URL.
   *
   * @param documentId - UUID of the signed document
   * @param res - Express response object for streaming or redirect
   */
  @Get(':documentId/download')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  @ApiOperation({
    summary: 'Baixar documento assinado',
    description:
      'Endpoint PUBLICO para download do PDF assinado. Redireciona para URL presigned do S3 (TTL 7 dias).',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirecionamento para URL presigned do S3',
  })
  @ApiResponse({
    status: 404,
    description: 'Documento nao encontrado',
  })
  @ApiResponse({
    status: 429,
    description: 'Muitas requisicoes. Tente novamente em alguns minutos.',
  })
  async downloadDocumento(
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.verificarService.getDownloadUrl(documentId);
    res.redirect(HttpStatus.FOUND, redirectUrl);
  }
}
