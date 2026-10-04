import { Controller, Get, HttpCode, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ErrorEntity } from 'src/common/dto/error.entity';
import { CnpjLookupResponseDto } from './dto/cnpj-lookup-response.dto';
import { BancosListResponseDto } from './dto/banco-response.dto';
import { GeralService } from './geral.service';

@Controller('geral')
@ApiTags('Geral')
export class GeralController {
  constructor(private readonly geralService: GeralService) {}

  @Get('bancos')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Listar bancos brasileiros (via BrasilAPI)',
    description:
      'Retorna lista de bancos comerciais brasileiros (com código febraban). ' +
      'Cache Redis de 7 dias — a lista raramente muda. ' +
      'Throttle global de 1 req/s compartilhado com /geral/cnpj.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de bancos',
    type: BancosListResponseDto,
  })
  @ApiResponse({
    status: 502,
    description: 'Erro no provedor',
    type: ErrorEntity,
  })
  @ApiResponse({
    status: 503,
    description: 'Rate limit interno excedido',
    type: ErrorEntity,
  })
  @ApiResponse({ status: 504, description: 'Timeout', type: ErrorEntity })
  listBancos(): Promise<BancosListResponseDto> {
    return this.geralService.listBancos();
  }

  @Get('cnpj/:cnpj')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Consultar CNPJ na Receita Federal (via BrasilAPI)',
    description:
      'Retorna razão social, nome fantasia e endereço para o CNPJ informado. ' +
      'Cache de 24h em Redis amortece consultas repetidas. ' +
      'Throttle global de 1 chamada/s aplicado APENAS quando há cache miss — ' +
      'cache hits não consomem quota e respondem livremente. ' +
      'Limite alinhado à BrasilAPI free tier (1 req/s por IP).',
  })
  @ApiResponse({
    status: 200,
    description: 'CNPJ encontrado',
    type: CnpjLookupResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'CNPJ inválido ou inexistente',
    type: ErrorEntity,
  })
  @ApiResponse({
    status: 502,
    description: 'Erro no provedor de CNPJ',
    type: ErrorEntity,
  })
  @ApiResponse({
    status: 503,
    description: 'Rate limit interno ou upstream excedido',
    type: ErrorEntity,
  })
  @ApiResponse({
    status: 504,
    description: 'Timeout ao consultar Receita',
    type: ErrorEntity,
  })
  lookup(@Param('cnpj') cnpj: string): Promise<CnpjLookupResponseDto> {
    return this.geralService.lookupCnpj(cnpj);
  }
}
