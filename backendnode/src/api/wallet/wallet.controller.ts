import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { DepositDto, WithdrawDto } from './dto/wallet.dto';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('wallet')
@ApiTags('Carteira')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'GET /wallet - Retorna saldo, blocked e currency' })
  getWallet(@Req() req: any) {
    const userId = req.user.id;
    return this.walletService.getWallet(userId);
  }

  @Get('assets')
  @ApiOperation({
    summary:
      'GET /wallet/assets - Lista ativos (tokens agrupados por startup/campaign/investment) do investidor',
  })
  getAssets(@Req() req: any) {
    const userId = req.user.id;
    return this.walletService.getAssets(userId);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'POST /wallet/deposit - Gera PIX para depósito' })
  deposit(@Body() depositDto: DepositDto, @Req() req: any) {
    const userId = req.user.id;
    return this.walletService.deposit(userId, depositDto);
  }

  @Post('withdraw')
  @ApiOperation({
    summary: 'POST /wallet/withdraw - Solicita saque com bank info',
  })
  withdraw(@Body() withdrawDto: WithdrawDto, @Req() req: any) {
    const userId = req.user.id;
    return this.walletService.withdraw(userId, withdrawDto);
  }
}
