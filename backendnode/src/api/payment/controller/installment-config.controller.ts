/**
 * @description Controller admin para gestao de configuracoes de parcelamento.
 * Endpoints protegidos por AuthGuard + InstallmentConfigPermissionGuard (ADMIN/FINANCEIRO).
 */
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../auth/auth.guard';
import { InstallmentConfigPermissionGuard } from '../guards/installment-config-permission.guard';
import { InstallmentConfigService } from '../service/installment-config.service';
import { CreateInstallmentConfigDto } from '../dto/create-installment-config.dto';
import { ResponseDto } from '../../../common/dto/response.dto';

@ApiTags('Installment Config')
@ApiBearerAuth()
@UseGuards(AuthGuard, InstallmentConfigPermissionGuard)
@Controller('admin/installments')
export class InstallmentConfigController {
  constructor(private readonly configService: InstallmentConfigService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria nova config de parcelamento (fecha vigente anterior)',
  })
  async create(@Body() dto: CreateInstallmentConfigDto, @Req() req: any) {
    const config = await this.configService.create(dto, req.user.id);
    return ResponseDto.success(
      'Configuracao de parcelamento criada',
      201,
      config,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Lista historico de configs (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(@Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.configService.list(page || 1, limit || 20);
    return ResponseDto.success(
      'Lista de configuracoes retornada',
      200,
      result.data,
      result.total,
      result.page,
    );
  }

  @Get('vigente')
  @ApiOperation({ summary: 'Retorna config vigente (effectiveUntil=null)' })
  async vigente() {
    const config = await this.configService.getVigente();
    return ResponseDto.success('Configuracao vigente', 200, config);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft delete: desativa config (effectiveUntil=now)',
  })
  async deactivate(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    await this.configService.deactivate(id, req.user.id);
  }
}
