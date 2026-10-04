import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/auth/auth.guard';
import { RepassesService } from './repasses.service';
import { ComplianceOrAdminGuard } from './guards/compliance.guard';
import { FinanceiroGuard } from './guards/financeiro.guard';
import { DeliberateRepasseDto } from './dto/deliberate-repasse.dto';
import { ConfigureRepasseDto } from './dto/configure-repasse.dto';
import {
  CancelRepasseDto,
  MarkInstallmentPaidDto,
  RejectInstallmentDto,
  UpdateInstallmentDto,
} from './dto/update-installment.dto';

@Controller('api')
@UseGuards(AuthGuard)
export class RepassesController {
  constructor(private readonly service: RepassesService) {}

  // ============ Compliance ============

  @Post('compliance/campaigns/:campaignId/repasse/deliberate')
  @UseGuards(ComplianceOrAdminGuard)
  @HttpCode(HttpStatus.OK)
  async deliberate(
    @Param('campaignId', ParseIntPipe) campaignId: number,
    @Body() dto: DeliberateRepasseDto,
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.service.deliberate(campaignId, dto, userId);
  }

  @Post('compliance/repasses/:id/cancel')
  @UseGuards(ComplianceOrAdminGuard)
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelRepasseDto,
    @Req() req: any,
  ) {
    return this.service.cancel(id, dto.motivo, req.user.id);
  }

  // ============ Financeiro ============

  @Post('financeiro/repasses/:id/configure')
  @UseGuards(FinanceiroGuard)
  @HttpCode(HttpStatus.OK)
  async configure(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConfigureRepasseDto,
    @Req() req: any,
  ) {
    return this.service.configure(id, dto, req.user.id);
  }

  @Post('financeiro/installments/:id/approve')
  @UseGuards(FinanceiroGuard)
  @HttpCode(HttpStatus.OK)
  async approveInstallment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInstallmentDto,
    @Req() req: any,
  ) {
    return this.service.approveInstallment(id, dto, req.user.id);
  }

  @Post('financeiro/installments/:id/reject')
  @UseGuards(FinanceiroGuard)
  @HttpCode(HttpStatus.OK)
  async rejectInstallment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectInstallmentDto,
    @Req() req: any,
  ) {
    return this.service.rejectInstallment(id, dto.motivo, req.user.id);
  }

  @Post('financeiro/installments/:id/mark-paid')
  @UseGuards(FinanceiroGuard)
  @HttpCode(HttpStatus.OK)
  async markInstallmentPaid(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkInstallmentPaidDto,
    @Req() req: any,
  ) {
    return this.service.markInstallmentPaid(
      id,
      dto.txidC6,
      dto.endToEndId,
      req.user.id,
    );
  }

  @Post('financeiro/installments/:id/mark-paid-comprovante')
  @UseGuards(FinanceiroGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async markInstallmentPaidWithComprovante(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('txId') txId: string,
    @Req() req: any,
  ) {
    return this.service.markInstallmentPaidWithComprovante(
      id,
      file,
      txId,
      req.user.id,
    );
  }
}
