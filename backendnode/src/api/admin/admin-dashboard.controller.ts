import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminDashboardSummaryService } from './admin-dashboard-summary.service';

/**
 * Controller fino: parse HTTP + auth + delegação.
 * Toda lógica de agregação Prisma vive em `AdminDashboardSummaryService`
 * (coberto por `admin-dashboard-summary.service.spec.ts`).
 */
@Controller('admin/dashboard')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Dashboard')
export class AdminDashboardController {
  constructor(
    private readonly dashboardSummary: AdminDashboardSummaryService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Resumo executivo do dashboard',
    description:
      'Retorna KPIs, série mensal de GMV, séries de crescimento e duas filas operacionais para o /admin/dashboard',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito a administradores',
  })
  async getSummary() {
    return this.dashboardSummary.getSummary();
  }
}
