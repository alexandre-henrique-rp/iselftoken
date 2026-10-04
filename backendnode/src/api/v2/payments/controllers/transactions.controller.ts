/**
 * @description Extrato de transacoes recebidas (PRD item 4.4).
 *
 * GET /api/v2/payments/transactions
 *   Lista paginada + filtros opcionais. RBAC: apenas ADMIN ou FINANCEIRO.
 *
 * A implementacao de RBAC usa o guard `FinanceRoleGuard` ja existente
 * em `src/common/guards/finance-role.guard.ts` (PRD nao define um guard
 * custom, entao reaproveitamos o padrao do projeto).
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { FinanceRoleGuard } from 'src/common/guards/finance-role.guard';
import { ListTransactionsDto } from '../dto/list-transactions.dto';
import { V2PaymentsService } from '../services/v2-payments.service';

@Controller('api/v2/payments/transactions')
@ApiTags('Payments V2 — Extrato')
@ApiBearerAuth()
@UseGuards(FinanceRoleGuard)
export class TransactionsController {
  constructor(private readonly service: V2PaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Extrato de transacoes recebidas (somente FINANCEIRO/ADMIN)',
    description:
      'Lista paginada de Payments. Filtros: `status`, `startDate`, ' +
      '`endDate`, `referenceType`, `limit`, `offset`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada: { items, total, limit, offset }',
  })
  @ApiResponse({ status: 403, description: 'Apenas FINANCEIRO ou ADMIN.' })
  list(@Query() filters: ListTransactionsDto) {
    return this.service.listTransactions(filters);
  }
}
