import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { TwoFactorGuard } from '../guards/two-factor.guard';
import { TransferService } from '../service/transfer.service';
import { TransferDto } from '../dto/transfer.dto';
import { FinanceRoleGuard } from 'src/common/guards/finance-role.guard';
import { FinanceAccess } from 'src/common/decorators/finance-access.decorator';

/**
 * Controller de cash-out (saque).
 *
 * Operações de transferência requerem:
 * 1. Autenticação (AuthGuard)
 * 2. 2FA recente (TwoFactorGuard)
 * 3. Role ADMIN ou FINANCEIRO (FinanceRoleGuard com write)
 */
@Controller('payment/transfer')
@ApiTags('Transfer')
@UseGuards(AuthGuard, TwoFactorGuard, FinanceRoleGuard)
@FinanceAccess('write')
@ApiBearerAuth()
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  /**
   * Executa cash-out via PIX ou TED.
   *
   * O método é async e retorna 202 Accepted com status PROCESSING.
   * A transferência real (integração EFI/TED) será implementada depois.
   */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary:
      'Cash-out (PIX ou TED) — requer 2FA recente + role ADMIN/FINANCEIRO',
  })
  async transfer(@Body() dto: TransferDto, @Req() req: any) {
    return this.transferService.transfer(dto, req.user.id);
  }
}
