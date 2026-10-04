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
import { ManualApproveService } from '../service/manual-approve.service';
import { ManualApproveDto } from '../dto/manual-approve.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { TwoFactorGuard } from '../guards/two-factor.guard';
import { InstallmentConfigPermissionGuard } from '../guards/installment-config-permission.guard';

@Controller('payment/:id/manual-approve')
@ApiTags('Manual Approve')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ManualApproveController {
  constructor(private readonly manualApproveService: ManualApproveService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(TwoFactorGuard, InstallmentConfigPermissionGuard)
  @ApiOperation({
    summary: 'ADMIN/FINANCEIRO marca Payment como PAID manualmente',
    description:
      'Aprova manualmente um pagamento off-platform. Requer 2FA recente (<5min) e justificativa >= 20 caracteres.',
  })
  manualApprove(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ManualApproveDto,
    @Req() req: any,
  ) {
    return this.manualApproveService.manualApprove(id, dto, req.user.id);
  }
}
