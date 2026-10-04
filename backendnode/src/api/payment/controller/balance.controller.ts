import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { BalanceService } from '../service/balance.service';

/**
 * Controller de saldo do usuário.
 *
 * Expõe o saldo líquido (CONFIRMED - REFUNDED) cacheado em Redis por 5min.
 */
@Controller('payment/balance')
@ApiTags('Balance')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class BalanceController {
  constructor(private readonly balanceService: BalanceService) {}

  /**
   * Retorna o saldo total do usuário logado.
   *
   * - totalConfirmed: soma dos pagamentos CONFIRMED (PAID)
   * - totalRefunded: soma dos pagamentos REFUNDED
   * - netBalance: totalConfirmed - totalRefunded
   * - asOf: timestamp ISO da geração
   *
   * Cache Redis: 5 minutos.
   */
  @Get()
  @ApiOperation({ summary: 'Saldo total (PAID - REFUNDED), cache Redis 5min' })
  async getBalance(@Req() req: any) {
    return this.balanceService.getUserBalance(req.user.id);
  }
}
