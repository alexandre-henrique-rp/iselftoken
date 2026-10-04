import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../auth/auth.guard';
import { PayloadEntity } from '../../../common/entities/payload.entity';
import { ValidateFundador } from '../../../api/startup/service/validate.fundador';
import { TermoAdesaoService } from './termo-adesao.service';
import { SignTermoAdesaoDto } from './dto/sign-termo-adesao.dto';
import {
  SignedDocumentResponseDto,
  GetTermoAdesaoResponseDto,
} from './dto/termo-adesao-response.dto';
import { Request } from 'express';

@ApiTags('Termo de Adesao')
@Controller('founder/startups')
export class TermoAdesaoController {
  constructor(
    private readonly termoAdesaoService: TermoAdesaoService,
    private readonly validateFundador: ValidateFundador,
  ) {}

  /**
   * Signs the Termo de Adesao for a startup.
   *
   * This endpoint:
   * - Requires authentication (founder must own the startup)
   * - Is idempotent (returns existing document if already signed)
   * - Issues certificates if not exists
   * - Renders PDF, signs with PAdES (founder + startup)
   * - Uploads to S3 and returns presigned download URL
   *
   * @param startupId - ID of the startup
   * @param dto - SignTermoAdesaoDto with aceite and optional reason
   * @param req - Authenticated request with user
   * @returns SignedDocumentResponseDto with document metadata
   */
  @Patch(':startupId/termo-adesao')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Assinar Termo de Adesao',
    description:
      'Assina digitalmente o Termo de Adesao para uma startup. Idempotente: se ja assinado, retorna o documento existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Termo assinado com sucesso ou documento ja existente',
    type: SignedDocumentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Aceite false (revogacao nao permitida via este endpoint)',
  })
  @ApiResponse({
    status: 401,
    description: 'Nao autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario nao eh founder desta startup',
  })
  @ApiResponse({
    status: 404,
    description: 'Startup nao encontrada',
  })
  async signTermoAdesao(
    @Param('startupId') startupId: string,
    @Body() dto: SignTermoAdesaoDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    // Validate user is a founder
    await this.validateFundador.validateOrThrow(req.user);

    const founderId = req.user.id;
    const startupIdNum = parseInt(startupId, 10);

    if (isNaN(startupIdNum)) {
      throw new Error('ID da startup invalido');
    }

    // Extract request metadata for audit
    const ipAddress = req.ip || req.socket?.remoteAddress || undefined;
    const userAgent = req.get('User-Agent');

    return this.termoAdesaoService.signTermoAdesao(
      startupIdNum,
      founderId,
      dto,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Gets the Termo de Adesao metadata for a startup.
   *
   * @param startupId - ID of the startup
   * @param req - Authenticated request with user
   * @returns GetTermoAdesaoResponseDto with document metadata and presigned URLs
   */
  @Get(':startupId/termo-adesao')
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Buscar Termo de Adesao',
    description:
      'Retorna os metadados do Termo de Adesao assinado, se existir. URLs de download tem TTL de 7 dias.',
  })
  @ApiResponse({
    status: 200,
    description: 'Metadados do documento ou { exists: false }',
    type: GetTermoAdesaoResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Nao autenticado',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario nao eh founder desta startup',
  })
  @ApiResponse({
    status: 404,
    description: 'Startup nao encontrada',
  })
  async getTermoAdesao(
    @Param('startupId') startupId: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    // Validate user is a founder
    await this.validateFundador.validateOrThrow(req.user);

    const founderId = req.user.id;
    const startupIdNum = parseInt(startupId, 10);

    if (isNaN(startupIdNum)) {
      throw new Error('ID da startup invalido');
    }

    return this.termoAdesaoService.getTermoAdesao(startupIdNum, founderId);
  }
}
