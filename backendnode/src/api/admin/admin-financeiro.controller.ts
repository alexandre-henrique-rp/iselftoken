import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { AuthGuard } from '../../auth/auth.guard';
import { FinanceAccess } from '../../common/decorators/finance-access.decorator';
import { SkipSessionFilter } from '../../common/decorators/skip-session-filter.decorator';
import { ResponseDto } from '../../common/dto/response.dto';
import { FinanceRoleGuard } from '../../common/guards/finance-role.guard';
import { S3Service } from '../../s3/s3.service';
import { PaymentService } from '../payment/payment.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AdminService } from './admin.service';
import { FinanceiroReconciliationService } from './financeiro-reconciliation.service';

// Limite alinhado com a regra de uploads de documentos compliance
// da startup (MAX_DOC_SIZE_BYTES em startup-extras.service.ts).
// Mantido como teto tecnico "frouxo" no backend — a trava real fica
// no frontend (ApprovePaymentModal.tsx com 10 MB).
const MAX_COMPROVANTE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_COMPROVANTE_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
]);

@Controller('admin/financeiro')
@UseGuards(AuthGuard, FinanceRoleGuard)
@SkipSessionFilter()
@ApiCookieAuth()
@ApiTags('Admin - Financeiro')
export class AdminFinanceiroController {
  constructor(
    private readonly adminService: AdminService,
    private readonly s3: S3Service,
    private readonly paymentService: PaymentService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly reconciliationService: FinanceiroReconciliationService,
  ) {}

  @Get('dashboard')
  @FinanceAccess('read')
  @ApiOperation({
    summary: 'Dashboard Financeiro',
    description:
      'Retorna KPIs: total_revenue, transaction_volume, fee_collection + stats + transações',
  })
  @ApiResponse({
    status: 200,
    description: 'Financeiro dashboard retrieved',
    schema: {
      example: {
        success: true,
        data: {
          kpis: {
            total_revenue: 500000,
            transaction_volume: 750000,
            fee_collection: 25000,
          },
          stats: {
            today: 5000,
            this_week: 35000,
            this_month: 150000,
          },
          recentTransactions: [],
        },
      },
    },
  })
  async getDashboard() {
    return this.adminService.getFinanceiroDashboard();
  }

  @Get('investments')
  @FinanceAccess('read')
  @ApiOperation({
    summary: 'Listar investimentos com split financeiro',
    description:
      'Retorna Investments paginados com o breakdown financeiro (Modelo B): ' +
      'subtotal de tokens, taxa da plataforma, repasse a startup, spread e ' +
      'receita da plataforma. Filtros via query: status, campaignId, ' +
      'dateFrom, dateTo (ISO), search (email/nome do user).',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'campaignId', required: false, type: Number })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listInvestments(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('campaignId') campaignId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listFinanceiroInvestments({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      campaignId: campaignId ? parseInt(campaignId, 10) : undefined,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Get('config')
  @FinanceAccess('read')
  @ApiOperation({
    summary: 'Listar configurações financeiras',
    description:
      'Retorna todas as entries da tabela FinanceConfig (key/value/description).',
  })
  @ApiResponse({
    status: 200,
    description: 'Configurações retornadas com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Configurações financeiras retornadas com sucesso',
        codigo: 200,
        data: [
          {
            key: 'marketplace.featured_limit',
            value: '10',
            description: 'Quantidade de startups na seção Destaque',
            updatedAt: '2026-05-07T12:00:00Z',
          },
        ],
      },
    },
  })
  async listConfig() {
    return this.adminService.listFinanceConfig();
  }

  @Patch('config/:key')
  @FinanceAccess('write')
  @ApiOperation({
    summary: 'Atualizar configuração financeira',
    description:
      'Atualiza o valor (string) de uma configuração existente. Body: { value: string }.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada.',
    schema: {
      example: {
        error: false,
        message: 'Configuração atualizada',
        codigo: 200,
        data: {
          key: 'marketplace.featured_limit',
          value: '15',
          description: 'Quantidade de startups na seção Destaque',
          updatedAt: '2026-05-07T12:00:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Chave não encontrada.' })
  async updateConfig(
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    return this.adminService.updateFinanceConfig(key, body?.value);
  }

  @Get('transactions')
  @FinanceAccess('read')
  @ApiOperation({
    summary: 'Listar transações de pagamento',
    description:
      'Retorna Payments paginados com user (email/nome) e Subscription/Plan ' +
      'associados. Filtros via query: status, method, purpose, dateFrom, ' +
      'dateTo (ISO), search (matcha email/nome do user OU txid).',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'method', required: false, type: String })
  @ApiQuery({ name: 'purpose', required: false, type: String })
  @ApiQuery({ name: 'dateFrom', required: false, type: String })
  @ApiQuery({ name: 'dateTo', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listTransactions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('purpose') purpose?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listFinanceiroTransactions({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      method,
      purpose,
      dateFrom,
      dateTo,
      search,
    });
  }

  @Post('comprovantes')
  @FinanceAccess('write')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload de comprovante',
    description:
      'Faz upload de PDF/JPG/PNG (máx 25 MB — teto técnico; trava real ' +
      'fica no frontend) pro bucket `comprovante` do ' +
      'AWS S3. Retorna a key gerada que ' +
      'deve ser referenciada no endpoint /payments/:id/approve.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Comprovante uploadado.' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou infectado.' })
  async uploadComprovante(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo `file` é obrigatório');
    }
    if (file.size > MAX_COMPROVANTE_SIZE_BYTES) {
      throw new BadRequestException(
        `Arquivo excede o limite de ${MAX_COMPROVANTE_SIZE_BYTES / 1024 / 1024} MB`,
      );
    }
    if (!ACCEPTED_COMPROVANTE_MIMES.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo não suportado (${file.mimetype}). Aceitos: PDF, JPG, PNG`,
      );
    }

    // Key: timestamp + UUID curto + extensão preservada.
    const ext =
      file.mimetype === 'application/pdf'
        ? 'pdf'
        : file.mimetype === 'image/png'
          ? 'png'
          : 'jpg';
    const key = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

    const uploaded = await this.s3.upload(
      file.buffer,
      'comprovante',
      key,
      file.mimetype,
    );

    return ResponseDto.success('Comprovante enviado', 200, {
      key: uploaded.key,
      bucket: uploaded.bucket,
      sizeBytes: uploaded.size,
      mimetype: file.mimetype,
    });
  }

  @Post('payments/:id/approve')
  @FinanceAccess('write')
  @ApiOperation({
    summary: 'Aprovar pagamento manualmente',
    description:
      'Marca o Payment como PAID via pipeline do webhook (ativa Subscription ' +
      'quando purpose=SUBSCRIPTION). Body: { justification: string >= 10 chars, ' +
      'comprovanteKey: string (key retornada por POST /comprovantes) }. ' +
      'Registra audit log PAYMENT_APPROVE_MANUAL.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['justification', 'comprovanteKey'],
      properties: {
        justification: {
          type: 'string',
          example: 'PIX recebido em conta espelho, comprovante em anexo.',
        },
        comprovanteKey: {
          type: 'string',
          example: '1747249302987-1a2b3c4d.pdf',
        },
      },
    },
  })
  async approvePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { justification: string; comprovanteKey: string },
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.paymentService.approveManually(
      id,
      req.user.id,
      body?.justification ?? '',
      body?.comprovanteKey ?? '',
      req,
    );
  }

  @Post('payments/:id/cancel')
  @FinanceAccess('write')
  @ApiOperation({
    summary: 'Cancelar pagamento manualmente',
    description:
      'Marca o Payment como CANCELED (aceita PENDING ou PAID). Não toca em ' +
      'Subscription — pra cancelar plano usar /subscriptions/:id/cancel. ' +
      'Body: { justification: string >= 10 chars }. Audit log PAYMENT_CANCEL.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['justification'],
      properties: {
        justification: {
          type: 'string',
          example: 'Estorno solicitado pelo cliente via chamado #123.',
        },
      },
    },
  })
  async cancelPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { justification: string },
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.paymentService.cancelByAdmin(
      id,
      req.user.id,
      body?.justification ?? '',
      req,
    );
  }

  @Post('subscriptions/:id/cancel')
  @FinanceAccess('write')
  @ApiOperation({
    summary: 'Cancelar assinatura manualmente',
    description:
      'Marca a Subscription como CANCELED + força expiresAt = now (revoga ' +
      'acesso imediato). Body: { justification: string >= 10 chars }. ' +
      'Audit log SUBSCRIPTION_CANCEL.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['justification'],
      properties: {
        justification: {
          type: 'string',
          example: 'Fraude confirmada — cancelar plano premium do user 42.',
        },
      },
    },
  })
  async cancelSubscription(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { justification: string },
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.subscriptionsService.cancelByAdmin(
      id,
      req.user.id,
      body?.justification ?? '',
      req,
    );
  }

  @Get('reconciliation')
  @FinanceAccess('read')
  @ApiOperation({
    summary: 'Fechamento de caixa — reconciliação Payments × Extrato C6',
    description:
      'Compara Payments PAID no período com as entradas INCOMING do extrato ' +
      'do C6 (GET /v1/statement/). Match heurístico por txid. Retorna totais ' +
      'esperado/recebido/diferença e duas listas: Payments sem entrada no ' +
      'banco (missingInBank) e entradas no banco sem Payment correspondente ' +
      '(missingInDb). Limite C6: intervalo máx 30 dias.',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    description: 'YYYY-MM-DD',
  })
  async reconciliation(@Query('from') from: string, @Query('to') to: string) {
    if (!from || !to) {
      throw new BadRequestException(
        'Parâmetros `from` e `to` (YYYY-MM-DD) são obrigatórios.',
      );
    }
    return this.reconciliationService.reconcile({
      from: new Date(`${from}T00:00:00.000Z`),
      to: new Date(`${to}T23:59:59.999Z`),
    });
  }
}
