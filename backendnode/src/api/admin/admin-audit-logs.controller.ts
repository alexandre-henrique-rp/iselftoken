import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { ComplianceGuard } from '../../auth/compliance.guard';
import { AdminAuditLogsService } from './admin-audit-logs.service';

/**
 * GET /admin/audit-logs?entity=X&entityId=Y — consulta genérica de
 * AuditLog para timeline de decisões no painel compliance.
 *
 * Requer role COMPLIANCE (ou ADMIN). Usado pelo painel /compliance/startups/:id
 * e /compliance/campaigns/:id para mostrar histórico de ações sobre a entidade.
 */
@Controller('admin/audit-logs')
@UseGuards(AuthGuard, ComplianceGuard)
@ApiCookieAuth()
@ApiTags('Admin - Audit')
export class AdminAuditLogsController {
  constructor(private readonly service: AdminAuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar logs de auditoria por entidade',
    description:
      'Retorna últimos N AuditLogs da entidade informada. Suporta entity="Startup" ' +
      'e entity="Campaign" (ou qualquer outro entity string usado no sistema).',
  })
  @ApiQuery({
    name: 'entity',
    required: true,
    description: 'Nome da entidade (ex.: Startup, Campaign)',
    example: 'Startup',
  })
  @ApiQuery({
    name: 'entityId',
    required: true,
    description: 'ID da entidade (mesmo tipo do entityId do AuditLog)',
    example: '42',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Máximo de itens (default 50, max 200)',
    example: 50,
  })
  async list(
    @Query('entity') entity: string,
    @Query('entityId') entityId: string,
    @Query('limit') limit?: string,
  ) {
    const n = Math.min(Math.max(parseInt(limit || '50', 10) || 50, 1), 200);
    const data = await this.service.listByEntity(entity, entityId, n);
    return { data };
  }
}
