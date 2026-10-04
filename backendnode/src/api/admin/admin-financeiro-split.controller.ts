import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminFinanceiroSplitService } from './admin-financeiro-split.service';
import { FinanceiroSplitQueryDto } from './dto/financeiro-split-query.dto';

/**
 * Auditoria admin do split financeiro (repasse × lucro plataforma).
 *
 * Endpoints:
 *  - GET /admin/financeiro/split            → lista campanhas com breakdown
 *  - GET /admin/financeiro/split/:id        → detalhe da campanha + investments
 *  - GET /admin/financeiro/split/:id/export → CSV dos investments
 *
 * Guards: AuthGuard + AdminGuard (mesmo padrão de
 * admin-dashboard.controller.ts:18).
 *
 * Apenas leitura. Para detalhes do split veja
 * CASE.md §[Investimento] — Split financeiro (Modelo B).
 */
@Controller('admin/financeiro/split')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Financeiro Split')
export class AdminFinanceiroSplitController {
  constructor(private readonly splitService: AdminFinanceiroSplitService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista campanhas com breakdown de split financeiro',
    description:
      'Retorna campanhas finalizadas (FUNDED/PAID_OUT/CLOSED) com o ' +
      'breakdown agregado do split (repasse às startups, spread da plataforma, ' +
      'taxa de checkout e comissão de afiliado). Suporta filtros via query: ' +
      '`from`, `to` (ISO date, filtra `Investment.allocatedAt`), `status`, ' +
      '`search` (nome/slug da startup), `page`, `pageSize`.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'CLOSED', 'FUNDED', 'PAID_OUT'],
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Split listado com sucesso' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito a administradores',
  })
  async list(@Query() query: FinanceiroSplitQueryDto) {
    return this.splitService.list(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalhe do split financeiro de uma campanha',
    description:
      'Retorna a campanha + breakdown agregado + lista de investments ' +
      'CONFIRMED com seus snapshots de split (startupRepasseAmount, ' +
      'platformSpreadAmount, platformFeeAmount, platformRevenueAmount).',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'Detalhe retornado' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async detail(@Param('id', ParseIntPipe) id: number) {
    return this.splitService.detail(id);
  }

  @Get(':id/export')
  @ApiOperation({
    summary: 'Exportar split da campanha em CSV',
    description:
      'Retorna CSV dos investments CONFIRMED com colunas do split. ' +
      'Header `Content-Disposition` carrega filename no padrão ' +
      '`split-campaign-<id>-<YYYYMMDD>.csv`.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'CSV retornado' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  async exportCsv(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const csv = await this.splitService.exportCsv(id);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="split-campaign-${id}-${today}.csv"`,
    );
    res.send(csv || 'campaign_not_found');
  }
}
