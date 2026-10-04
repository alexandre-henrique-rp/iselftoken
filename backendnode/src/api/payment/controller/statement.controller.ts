import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiProduces,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { StatementService } from '../service/statement.service';
import { StatementQueryDto } from '../dto/statement-query.dto';

/**
 * Controller de extrato bancário.
 *
 * Lista transações do usuário com filtros de período e tipo,
 * suportando formato JSON ou CNAB 240.
 */
@Controller('payment/statement')
@ApiTags('Statement')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class StatementController {
  constructor(private readonly statementService: StatementService) {}

  /**
   * Retorna o extrato de transações do usuário.
   *
   * Filtros:
   * - startDate / endDate: período do extrato
   * - format: JSON (default) ou CNAB240
   *
   * JSON: { transactions: [...], summary: { totalConfirmed, totalRefunded, count } }
   * CNAB240: text/plain com layout de líneas
   */
  @Get()
  @ApiOperation({
    summary: 'Extrato de transações (filtros: período, formato JSON|CNAB240)',
  })
  @ApiProduces('application/json', 'text/plain')
  @ApiResponse({
    status: 200,
    description: 'Extrato no formato solicitado',
  })
  async getStatement(@Req() req: any, @Query() query: StatementQueryDto) {
    return this.statementService.getStatement(req.user.id, query);
  }
}
