import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ConfigService } from './config.service';

/**
 * Leitura operacional para fluxos autenticados, sem dados administrativos.
 * O endpoint administrativo continua em /admin/config/fundraising.
 */
@Controller('config')
@UseGuards(AuthGuard)
@ApiCookieAuth()
@ApiTags('Configuração operacional')
export class FundraisingConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('fundraising')
  @ApiOperation({
    summary: 'Obter parâmetros operacionais de fundraising',
    description:
      'Retorna somente taxas e limites necessários ao cadastro de uma startup. Não inclui histórico ou metadados administrativos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Parâmetros operacionais retornados com sucesso.',
  })
  async getFundraisingConfig() {
    const data = await this.configService.getPublicFundraisingConfig();
    return ResponseDto.success(
      'Parâmetros operacionais de fundraising',
      200,
      data,
    );
  }
}
