import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RefundService } from '../refund.service';
import { RefundDto } from '../dto/refund.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { TwoFactorGuard } from '../guards/two-factor.guard';
import { InstallmentConfigPermissionGuard } from '../guards/installment-config-permission.guard';

@Controller('payment/:id/refund')
@ApiTags('Refund')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(TwoFactorGuard, InstallmentConfigPermissionGuard)
  @ApiOperation({
    summary: 'Estorna pagamento (janela 90 dias EFI)',
    description:
      'ADMIN/FINANCEIRO estorna pagamento via PIX ou cartão. Requer 2FA recente (<5min). Estorno parcial suportado.',
  })
  refund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RefundDto,
    @Req() req: any,
  ) {
    return this.refundService.processRefund(id, dto, req.user.id);
  }
}
