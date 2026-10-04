import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { BackupInterceptor } from '../../backup/backup.interceptor';
import { SkipSessionFilter } from '../../common/decorators/skip-session-filter.decorator';
import { StartupService } from '../startup/service/startup.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

import { User } from './entities/user.entity';

@Controller('users')
@UseInterceptors(BackupInterceptor)
@ApiTags('Usuários')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly startupService: StartupService,
    private readonly cookiesService: CookiesService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Listar todos os usuários',
    description: 'Retorna uma lista paginada de todos os usuários.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    schema: { type: 'string' },
  })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 25 })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
  })
  findAll(@Query() query: { page?: number; limit?: number }) {
    return this.usersService.findAll({
      page: +query.page! || 1,
      limit: +query.limit! || 10,
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Obter dados do usuário logado',
    description:
      'Retorna o payload público do usuário armazenado na sessão Redis.\n\n' +
      'Shape inclui identidade, dados pessoais, endereço, referências KYC ' +
      '(id, URLs de preview e status), país, carteira resumida, ' +
      'subscriptions com dados de exibição do plano e startups resumidas.\n\n' +
      'Campos sensíveis e administrativos (senha, consentimentos, pagamentos, ' +
      'investimentos, tokens e auditLogs) NÃO são devolvidos aqui.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payload público do usuário logado.',
    type: User,
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
  })
  getMe(@Request() req: Request & { user: PayloadEntity }) {
    return this.usersService.getMe(req.user);
  }

  @Get('me/startup')
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Overview das startups do usuário logado (DB direto, sem cache)',
    description:
      'Retorna a lista de startups do founder + agregados financeiros.\n\n' +
      '**Shape (simplificado):**\n' +
      '- `startups[]`: cada startup traz `id`, `nome`, `slug`, `area_atuacao`, ' +
      '`estagio`, `status`, `logo` (url_sm), `pais` ({ iso3, nome, emoji }), ' +
      '**última campanha** em `campaigns` (singular: { id, status, tokens, ' +
      'tokens_sale }) e `createdAt`.\n' +
      '- `tokens` (por campanha) = COUNT(Token) emitidos — fonte: tabela **Token**.\n' +
      '- `tokens_sale` (por campanha) = COUNT(Token) cujo User está relacionado ' +
      '(`token.userId IS NOT NULL`) — fonte: tabela **Token**. No esquema atual ' +
      'equivale a `tokens` (Token só nasce com user), mas a distinção permanece ' +
      'semanticamente correta se houver tokens de reserva/tesouraria no futuro.\n' +
      '- `totalCaptado` = SUM(Token.purchaseVal) sobre todas as campanhas do founder.\n' +
      '- `totalInvestidores` = COUNT(DISTINCT Token.userId) — investidores únicos.\n' +
      '- `progressoCampanhaAtiva` = % vendido (tokens_sale/tokens) da campanha OPEN ' +
      'mais recente do founder. `null` se não houver.\n\n' +
      'Sem cache: 2 queries ao banco (startup.findMany + token.findMany agregado em JS).',
  })
  @ApiResponse({
    status: 200,
    description: 'Overview retornado com sucesso.',
  })
  getMyStartups(@Request() req: Request & { user: PayloadEntity }) {
    return this.startupService.getFounderStartupOverview(req.user);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Atualizar dados do usuário logado' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário atualizados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
  })
  updateMe(
    @Request() req: Request & { user: PayloadEntity },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const sessionId = this.cookiesService.getSessionId(req as any);
    return this.usersService.updateMe(req.user, updateUserDto, sessionId);
  }

  @Get('by-id/:id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Buscar usuário por ID (rota protegida)' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado com sucesso.' })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch('by-id/:id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Atualizar dados do usuário (rota protegida)' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário atualizados com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete('by-id/:id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Remover usuário (rota protegida)' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso.' })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
