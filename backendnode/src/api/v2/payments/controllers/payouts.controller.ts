/**
 * @description Motor de repasses / pay-outs (PRD item 4.5).
 *
 * POST /api/v2/payments/payouts
 *   Inicia transferencia Pix da conta raiz C6 para conta do favorecido.
 *   Idempotente: endToEndId local garante retry seguro.
 *
 * Auth: FinanceRoleGuard (FINANCEIRO ou ADMIN).
 *
 * Wrappa o FundTransferService.initiateTransfer. Fase B do PRD podera
 * emitir o pagamento via evento `payout.requested` sem passar pelo
 * controller direto (e.g., disparo automatico quando campaign.status
 * virar FUNDED).
 */
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FinanceRoleGuard } from 'src/common/guards/finance-role.guard';
import type { Request } from 'express';
import { CreatePayoutDto } from '../dto/create-payout.dto';
import { V2PaymentsService } from '../services/v2-payments.service';

@Controller('api/v2/payments/payouts')
@ApiTags('Payments V2 — Payouts')
@ApiBearerAuth()
@UseGuards(FinanceRoleGuard)
export class PayoutsController {
  constructor(private readonly service: V2PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Inicia repasse (PIX out) para favorecido',
    description:
      'Dispara transferencia Pix da conta raiz C6 para ' +
      '`targetAccountId`. Idempotente.',
  })
  @ApiResponse({ status: 201, description: 'Payout iniciado.' })
  @ApiResponse({ status: 403, description: 'Apenas FINANCEIRO ou ADMIN.' })
  initiate(
    @Body() dto: CreatePayoutDto,
    @Req()
    req: Request & { user: { id: number; role: string } },
  ) {
    return this.service.createPayout(dto, {
      userId: req.user.id,
      role: req.user.role,
    });
  }
}
