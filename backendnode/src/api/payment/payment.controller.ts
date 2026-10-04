import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Response as ExpressResponse } from 'express';
import { AdminGuard } from 'src/auth/admin.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { SkipSessionFilter } from 'src/common/decorators/skip-session-filter.decorator';
import { ConfirmCardDto } from './dto/confirm-card.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateStartupCheckoutDto } from './dto/create-startup-checkout.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
@ApiTags('Pagamentos')
@UseGuards(AuthGuard)
@SkipSessionFilter()
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo pagamento' })
  create(@Body() createPaymentDto: CreatePaymentDto, @Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.create(createPaymentDto, userId);
  }

  @Post('checkout-draft')
  @ApiOperation({
    summary: 'Criar checkout de reserva para nova startup',
    description:
      'Cria Payment PENDING e StartupDraft persistente em uma única transação.',
  })
  createStartupCheckout(
    @Body() dto: CreateStartupCheckoutDto,
    @Req() req: any,
  ) {
    return this.paymentService.createStartupCheckout(dto, req.user.id);
  }

  @Post(':id/regenerate')
  @ApiOperation({
    summary: 'Gerar novo pagamento da reserva (retomar checkout expirado)',
    description:
      'Recria a cobrança TOKEN_RESERVATION a partir de um Payment ' +
      'EXPIRED/CANCELED, reaproveitando o rascunho do wizard. Idempotente: ' +
      'retorna a cobrança PENDING existente se houver.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do pagamento antigo' })
  async regenerate(
    @Param('id') id: string,
    @Req() req: any,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const result = await this.paymentService.regenerateStartupCheckout(
      +id,
      req.user.id,
    );
    if (result.error) response.status(result.codigo);
    return result;
  }

  @Get()
  @ApiOperation({ summary: 'Listar pagamentos do usuário' })
  findAll(@Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.findAll({ userId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pagamento por ID' })
  @ApiParam({ name: 'id', type: Number })
  async findOne(
    @Param('id') id: string,
    @Req() req: any,
    @Res({ passthrough: true }) response: ExpressResponse,
  ) {
    const result = await this.paymentService.findOne(+id, req.user.id);
    if (result.error) response.status(result.codigo);
    return result;
  }

  @Post('compliance-fee')
  @ApiOperation({
    summary:
      'Criar (ou retornar) Payment COMPLIANCE_FEE para a campanha do founder',
    description:
      'Idempotente: se já existe PENDING/PAID COMPLIANCE_FEE para a ' +
      'campanha, retorna o existente. Valor vem do SystemConfig ' +
      '`COMPLIANCE_FEE` (default R$ 500). Usado pelo fluxo de save da ' +
      'aba de captação em /founder/startups/:id/captacao.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['campaignId'],
      properties: {
        campaignId: { type: 'number', example: 3 },
        wantsFastDeploy: {
          type: 'boolean',
          example: false,
          description:
            'Quando true, inclui o produto "Publicação Rápida" (FAST_DEPLOY) ' +
            'no mesmo checkout consolidado da Taxa de Compliance. Ignorado se ' +
            'já existir COMPLIANCE_FEE PENDING/PAID para a campanha.',
        },
      },
    },
  })
  async createComplianceFee(
    @Body() body: { campaignId: number; wantsFastDeploy?: boolean },
    @Req() req: any,
  ) {
    return this.paymentService.createComplianceFee(
      Number(body?.campaignId),
      req.user.id,
      Boolean(body?.wantsFastDeploy),
    );
  }

  @Post(':id/pix')
  @ApiOperation({ summary: 'Gerar PIX QR Code para pagamento (expira em 24h)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID do pagamento' })
  generatePix(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.generatePix(+id, userId);
  }

  @Get(':id/installments')
  @ApiOperation({
    summary: 'Simular parcelamento de cartão (fonte de verdade do backend)',
    description:
      'Retorna as opções de parcelamento (1 até o máximo configurado) ' +
      'calculadas pelo backend sobre o valor atual do pagamento (já líquido ' +
      'de cupom), aplicando a taxa mensal de juros compostos da config ' +
      'vigente. O checkout apenas apresenta estes valores — nunca recalcula ' +
      'juros localmente.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do pagamento' })
  simulateInstallments(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.simulateInstallments(+id, userId);
  }

  @Post(':id/card')
  @ApiOperation({
    summary: 'Cobrar cartão de crédito (EFI one-step)',
    description:
      'Recebe o payment_token gerado no navegador (lib payment-token-efi) e as ' +
      'parcelas, cria a cobrança one-step na EFI e, se aprovada, marca o ' +
      'pagamento como PAID (mesmo pipeline do webhook). Dados do cartão NUNCA ' +
      'trafegam pelo backend.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do pagamento' })
  generateCardCheckout(
    @Param('id') id: string,
    @Body() dto: ConfirmCardDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.paymentService.generateCardCheckout(+id, userId, {
      paymentToken: dto.paymentToken,
      installments: dto.installments,
      cardMask: dto.cardMask,
      cardholderDocument: dto.cardholderDocument,
    });
  }

  @Post(':id/dev/simulate-paid')
  @ApiOperation({
    summary: 'Simular pagamento PAID (somente dev)',
    description:
      'Dispara o mesmo path do webhook PIX_RECEIVED para o Payment indicado, ' +
      'ativando a Subscription linkada quando purpose=SUBSCRIPTION. ' +
      'Retorna 403 quando NODE_ENV=production.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID do pagamento' })
  simulatePaid(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.paymentService.simulatePaid(+id, userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Atualizar pagamento' })
  @ApiParam({ name: 'id', type: Number })
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentService.update(+id, updatePaymentDto);
  }

  // P3.1 — DELETE /payment/:id removido (era stub — retornava string).
  // Para cancelar um pagamento, usar PATCH /payment/:id com status=CANCELED
  // (gera audit log + reembolsa o wallet se aplicável). Hard delete de
  // Payment quebra integridade do ledger e foi deliberadamente retirado.
}
