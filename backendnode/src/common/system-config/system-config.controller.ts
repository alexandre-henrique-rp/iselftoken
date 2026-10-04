/**
 * Controller admin para SystemConfig.
 *
 * Endpoints:
 * - GET    /admin/configs        Lista todas as configs (ADMIN/FINANCEIRO/COMPLIANCE)
 * - GET    /admin/configs/:key   Detalhe de uma chave
 * - PATCH  /admin/configs/:key   Atualiza valor (ADMIN/FINANCEIRO)
 *
 * Guards:
 * - AuthGuard + AdminGuard — replicando o padrão de src/api/admin/admin.controller.ts
 *   (AdminGuard aceita ADMIN, FINANCEIRO, COMPLIANCE).
 *
 * Resposta: sempre em ResponseDto (padrão do projeto).
 */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import { ResponseDto } from 'src/common/dto/response.dto';
import { SystemConfigService } from './system-config.service';
import { UpdateConfigDto } from './dto/update-config.dto';
import {
  FINANCIAL_CONFIG_KEYS,
  FinancialConfigs,
} from './interfaces/financial-configs.interface';

interface AuthedRequest extends Request {
  user: { id: number; role: string };
}

@ApiTags('Admin - System Config')
@Controller('admin/configs')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
export class SystemConfigController {
  constructor(private readonly systemConfig: SystemConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar configurações do sistema',
    description:
      'Retorna o snapshot completo de configs financeiras (camada de cache). ' +
      'Todas as chaves Financeiras garantidas — ausentes vêm como 0.',
  })
  @ApiResponse({
    status: 200,
    description: 'Snapshot retornado com sucesso.',
  })
  async listAll(): Promise<ResponseDto<FinancialConfigs>> {
    const configs = await this.systemConfig.getFinancialConfigs();
    return ResponseDto.success('Configurações retornadas', 200, configs);
  }

  @Get(':key')
  @ApiOperation({
    summary: 'Buscar uma configuração específica',
  })
  @ApiParam({ name: 'key', example: 'PLATFORM_ADMIN_FEE_PCT' })
  @ApiResponse({ status: 200, description: 'Configuração encontrada.' })
  @ApiResponse({ status: 404, description: 'Chave não encontrada.' })
  async getOne(
    @Param('key') key: string,
  ): Promise<ResponseDto<{ key: string; value: number }>> {
    if (!this.isFinancialKey(key)) {
      return ResponseDto.error(
        `Chave de configuração não encontrada: ${key}`,
        404,
      );
    }
    const value = await this.systemConfig.get(key as keyof FinancialConfigs);
    return ResponseDto.success('Configuração retornada', 200, { key, value });
  }

  @Patch(':key')
  @ApiOperation({
    summary: 'Atualizar configuração financeira',
    description:
      'Atualiza o valor de uma chave e invalida o cache IMEDIATAMENTE. ' +
      'Apenas ADMIN/FINANCEIRO. Body: { value: number }.',
  })
  @ApiParam({ name: 'key', example: 'PLATFORM_ADMIN_FEE_PCT' })
  @ApiResponse({ status: 200, description: 'Configuração atualizada.' })
  @ApiResponse({ status: 400, description: 'Valor inválido.' })
  @ApiResponse({ status: 404, description: 'Chave não encontrada.' })
  async update(
    @Param('key') key: string,
    @Body() body: UpdateConfigDto,
    @Req() req: AuthedRequest,
  ): Promise<
    ResponseDto<{ key: string; value: number; updatedBy: number | null }>
  > {
    if (!this.isFinancialKey(key)) {
      return ResponseDto.error(
        `Chave de configuração não encontrada: ${key}`,
        404,
      );
    }
    const result = await this.systemConfig.setConfig(
      key as keyof FinancialConfigs,
      body.value,
      req.user.id,
    );
    return ResponseDto.success('Configuração atualizada', 200, result);
  }

  private isFinancialKey(key: string): key is keyof FinancialConfigs {
    return (FINANCIAL_CONFIG_KEYS as ReadonlyArray<string>).includes(key);
  }
}
