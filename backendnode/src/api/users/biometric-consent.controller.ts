import {
  Body,
  Controller,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { GrantBiometricConsentDto } from '../payment/efi/biometric-consent.dto';
import { FaceBiometricService } from './biometric/face-biometric.service';

/**
 * Controller para gerenciamento de consentimento biométrico (LGPD Art. 11 I).
 *
 * Permite ao usuário:
 * - Conceder consentimento explícito para captura de dados biométricos
 * - Revogar consentimento (Art. 18 IX)
 *
 * O consentimento é versionado para rastreabilidade.
 */
@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard)
export class BiometricConsentController {
  private readonly logger = new Logger(BiometricConsentController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly faceBiometric: FaceBiometricService,
  ) {}

  /**
   * Concede consentimento biométrico explícito.
   *
   * POST /users/me/biometric-consent
   * Body: { "version": "v1.0-2026-08-22" }
   *
   * LGPD Art. 11 I: dados biométricos dependem de consentimento explícito.
   */
  @Post('me/biometric-consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Conceder consentimento biométrico' })
  @ApiResponse({ status: 200, description: 'Consentimento registrado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async grantConsent(
    @Request() req: { user: { id: string } },
    @Body() body: GrantBiometricConsentDto,
  ) {
    const userId = Number(req.user.id);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        biofacialConsentAt: new Date(),
        biofacialConsentVersion: body.version,
      },
    });

    this.logger.log(
      `Consentimento biométrico concedido: userId=${userId} version=${body.version}`,
    );

    return {
      success: true,
      message: 'Consentimento biométrico registrado',
      data: {
        consentAt: new Date().toISOString(),
        version: body.version,
      },
    };
  }

  /**
   * Revoga consentimento biométrico.
   *
   * DELETE /users/me/biometric-consent
   *
   * LGPD Art. 18 IX: direito de revogação do consentimento.
   */
  @Delete('me/biometric-consent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revogar consentimento biométrico' })
  @ApiResponse({ status: 200, description: 'Consentimento revogado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async revokeConsent(@Request() req: { user: { id: string } }) {
    const userId = Number(req.user.id);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        biofacialConsentAt: null,
        biofacialConsentVersion: null,
      },
    });

    // LGPD Art. 18 IX: purga efetiva do template biométrico na revogação.
    await this.faceBiometric.purge(userId);

    this.logger.log(`Consentimento biométrico revogado: userId=${userId}`);

    return {
      success: true,
      message:
        'Consentimento biométrico revogado. Dados biométricos serão removidos conforme LGPD Art. 18 IX.',
    };
  }
}
