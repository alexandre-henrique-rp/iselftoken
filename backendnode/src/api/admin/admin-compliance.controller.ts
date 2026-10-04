import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminService } from './admin.service';
import { ComplianceCampaignsService } from './compliance-campaigns.service';

@Controller('admin/compliance')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Compliance')
export class AdminComplianceController {
  constructor(
    private readonly adminService: AdminService,
    private readonly complianceCampaignsService: ComplianceCampaignsService,
  ) {}

  @Get('campaigns')
  @ApiOperation({
    summary: 'Listar campanhas para Compliance',
    description:
      'Lista campanhas de qualquer status para revisão administrativa. Não altera o catálogo público.',
  })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'ALL' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  getCampaigns(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.complianceCampaignsService.listCampaigns({
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('campaigns/:id')
  @ApiOperation({
    summary: 'Buscar campanha para Compliance',
    description:
      'Retorna o detalhe completo de uma campanha de qualquer status para revisão administrativa.',
  })
  @ApiParam({ name: 'id', type: Number })
  getCampaign(@Param('id') id: string) {
    return this.complianceCampaignsService.getCampaignDetail(+id);
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Dashboard de Compliance',
    description:
      'Retorna KPIs: kyc_pending, startups_pending, approved_today + listas',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance dashboard retrieved',
    schema: {
      example: {
        success: true,
        data: {
          kpis: {
            kyc_pending: 12,
            startups_pending: 5,
            approved_today: 3,
          },
          recentKycDecisions: [],
          pendingApprovals: [],
        },
      },
    },
  })
  async getDashboard() {
    return this.adminService.getComplianceDashboard();
  }

  @Post('kyc/:id/decide')
  @ApiOperation({ summary: 'Aprovar ou rejeitar KYC' })
  async decideKyc(
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    return this.adminService.decideKyc(+id, body.decision, body.reason);
  }

  @Post('startup/:id/decide')
  @ApiOperation({ summary: 'Aprovar ou rejeitar startup' })
  async decideStartup(
    @Param('id') id: string,
    @Body() body: { decision: 'APPROVED' | 'REJECTED'; reason?: string },
  ) {
    return this.adminService.decideStartup(+id, body.decision, body.reason);
  }
}
