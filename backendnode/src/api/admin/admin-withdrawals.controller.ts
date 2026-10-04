import {
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { AdminWithdrawalsService } from './admin-withdrawals.service';

/**
 * Controller para decisões sobre Withdrawals:
 *  - POST /admin/withdrawals/:id/approve  → PROCESSING
 *  - POST /admin/withdrawals/:id/reject   → REJECTED
 *
 * O `approvedBy` é preenchido a partir de `request.user.id` (AuthGuard injeta).
 */
@Controller('admin/withdrawals')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Withdrawals')
export class AdminWithdrawalsController {
  constructor(private readonly withdrawals: AdminWithdrawalsService) {}

  @Post(':id/approve')
  @ApiOperation({ summary: 'Aprovar resgate (REQUESTED → PROCESSING)' })
  @ApiResponse({ status: 200, description: 'Resgate aprovado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito a administradores',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal não encontrado' })
  @ApiResponse({ status: 409, description: 'Transição de status inválida' })
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.withdrawals.approve(id, req.user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Rejeitar resgate (REQUESTED → REJECTED)' })
  @ApiResponse({ status: 200, description: 'Resgate rejeitado' })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito a administradores',
  })
  @ApiResponse({ status: 404, description: 'Withdrawal não encontrado' })
  @ApiResponse({ status: 409, description: 'Transição de status inválida' })
  async reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.withdrawals.reject(id, req.user.id);
  }
}
