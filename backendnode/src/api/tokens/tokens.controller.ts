import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { TokensService } from './tokens.service';

/**
 * Rotas autenticadas dos tokens do investidor (carteira + certificado).
 * A rota de verificação pública fica em TokensPublicController.
 *
 * Ordem importa: `verify/:hash` (público) e `:id/certificate` não colidem com
 * `:id` porque têm literais/aridade diferentes de segmentos.
 */
@ApiTags('Tokens')
@Controller('tokens')
@UseGuards(AuthGuard)
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  @ApiOperation({ summary: 'Meus tokens (carteira)' })
  mine(@Req() req: any) {
    return this.tokensService.getUserTokens(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um token próprio' })
  @ApiParam({ name: 'id', type: String })
  detail(@Param('id') id: string, @Req() req: any) {
    return this.tokensService.getTokenById(id, req.user.id);
  }

  @Get(':id/certificate')
  @ApiOperation({
    summary: 'URL de download do certificado PDF do token (dono ou ADMIN)',
  })
  @ApiParam({ name: 'id', type: String })
  certificate(@Param('id') id: string, @Req() req: any) {
    return this.tokensService.getCertificateUrl(id, req.user.id, req.user.role);
  }
}

/**
 * Verificação PÚBLICA de autenticidade de token pelo hash (sem autenticação),
 * usada pelo QR do certificado. Não expõe dados sensíveis.
 */
@ApiTags('Tokens')
@Controller('tokens')
export class TokensPublicController {
  constructor(private readonly tokensService: TokensService) {}

  @Get('verify/:hash')
  @ApiOperation({ summary: 'Verificar autenticidade de um token pelo hash' })
  @ApiParam({ name: 'hash', type: String })
  verify(@Param('hash') hash: string) {
    return this.tokensService.verifyByHash(hash);
  }
}
