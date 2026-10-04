import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/auth.guard';
import { InstallmentRequestService } from './installment-requests.service';
import { CreateInstallmentRequestDto } from './dto/create-installment-request.dto';
import { ResubmitInstallmentRequestDto } from './dto/resubmit-installment-request.dto';

/**
 * Endpoints do Fundador para criar/re-submeter InstallmentRequest e consultar
 * dashboard do Repasse. Todos sob AuthGuard (cookie session + JWT).
 *
 * Rotas:
 * - POST /api/founder/startups/:id/repasse/installments/:installmentId/request
 * - POST /api/founder/startups/:id/repasse/installments/:installmentId/resubmit
 * - GET  /api/founder/campaigns/:campaignId/repasse/dashboard  (preferida — repasses sao 1:1 por Campaign)
 * - GET  /api/founder/startups/:id/repasse/dashboard            (legacy — redireciona para /campaigns)
 */
@Controller('api/founder')
@UseGuards(AuthGuard)
export class InstallmentRequestController {
  constructor(private readonly service: InstallmentRequestService) {}

  // ============ Por startup (legacy — manter para retrocompatibilidade) ============

  @Post('startups/:id/repasse/installments/:installmentId/request')
  @HttpCode(HttpStatus.OK)
  async request(
    @Param('id', ParseIntPipe) startupId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
    @Body() dto: CreateInstallmentRequestDto,
    @Req() req: any,
  ) {
    return this.service.createOrResubmit(
      startupId,
      installmentId,
      dto,
      req.user.id,
      false,
    );
  }

  @Post('startups/:id/repasse/installments/:installmentId/resubmit')
  @HttpCode(HttpStatus.OK)
  async resubmit(
    @Param('id', ParseIntPipe) startupId: number,
    @Param('installmentId', ParseIntPipe) installmentId: number,
    @Body() dto: ResubmitInstallmentRequestDto,
    @Req() req: any,
  ) {
    return this.service.createOrResubmit(
      startupId,
      installmentId,
      dto,
      req.user.id,
      true,
    );
  }

  @Get('startups/:id/repasse/dashboard')
  async dashboardByStartup(
    @Param('id', ParseIntPipe) startupId: number,
    @Req() req: any,
  ) {
    // Legacy: pega o repasse mais recente da startup (status nao CANCELLED).
    return this.service.getDashboardByStartup(startupId, req.user.id);
  }

  // ============ Por campanha (preferido — repasses sao 1:1 por Campaign) ============

  @Get('campaigns/:campaignId/repasse/dashboard')
  async dashboardByCampaign(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Req() req: any,
  ) {
    return this.service.getDashboardByCampaign(campaignId, req.user.id);
  }
}
