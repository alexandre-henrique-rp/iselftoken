/**
 * @description Controller do Checkout unificado (PRD item 4.1+4.2).
 *
 * POST /api/v2/payments/checkout
 *   Cria Payment + checkout C6 unificado (PIX + Cartao). Retorna
 *   `redirectUrl` para o frontend redirecionar.
 *
 * GET /api/v2/payments/checkout/:paymentId/status
 *   Read-only: status atual + (futuro) sincronizacao com C6 em PENDING.
 *
 * Auth: @UseGuards(AuthGuard) — mesmo gate do payment.controller antigo.
 */
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import type { Request } from 'express';
import { CreateCheckoutDto } from '../dto/create-checkout.dto';
import { V2PaymentsService } from '../services/v2-payments.service';

@Controller('api/v2/payments/checkout')
@ApiTags('Payments V2 — Checkout')
@ApiCookieAuth()
@UseGuards(AuthGuard)
export class CheckoutController {
  constructor(private readonly service: V2PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria checkout unificado C6 (PIX + Cartao)',
    description:
      'Cria Payment + checkout C6. Payload inclui `payer` para pre-preencher ' +
      'a tela do C6. Retorna `redirectUrl` para o frontend redirecionar.',
  })
  @ApiResponse({
    status: 201,
    description: 'Checkout criado. Retorna `redirectUrl`.',
  })
  @ApiResponse({ status: 400, description: 'Payload invalido.' })
  @ApiResponse({ status: 401, description: 'Nao autenticado.' })
  async create(
    @Body() dto: CreateCheckoutDto,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.createCheckout(dto, req.user.id);
  }

  @Get(':paymentId/status')
  @ApiOperation({
    summary: 'Consulta status atual de um checkout',
    description:
      'Read-only. Em PENDING a muito tempo, sincroniza com o C6 via ' +
      '`GET /v1/checkouts/{checkoutId}` quando o PRD item 4.2 habilitar.',
  })
  @ApiResponse({ status: 200, description: 'Status atual do pagamento.' })
  @ApiResponse({ status: 404, description: 'Pagamento nao encontrado.' })
  async status(
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.getCheckoutStatus(paymentId, req.user.id);
  }
}
