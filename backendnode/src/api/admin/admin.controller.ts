import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { ResponseDto } from '../../common/dto/response.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '../config/config.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UsersService } from '../users/users.service';
import { AdminService } from './admin.service';
import { SetConfigParameterDto } from './dto/set-config-parameter.dto';

@Controller('admin/users')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin')
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os usuários',
    description:
      'Retorna uma lista paginada de todos os usuários. Supports search by nome, email, id or documento.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome, email, id ou documento',
    schema: { type: 'string' },
    example: 'João Silva',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Quantidade de itens por página',
    example: 25,
  })
  @ApiQuery({
    name: 'kycStatus',
    required: false,
    description: 'Filtrar pelo status KYC do documento principal',
    example: 'PENDING',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Usuários retornados com sucesso',
        codigo: 200,
        data: [
          {
            id: 1,
            email: 'admin@teste.com',
            nome: 'Admin User',
            subscriptions: [],
            createdAt: '2026-01-15T10:30:00.000Z',
            avatar: {
              url_sm:
                'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/avatar.jpg',
            },
          },
          {
            id: 2,
            email: 'joao@teste.com',
            nome: 'João Silva',
            subscriptions: [{ id: 1, status: 'ACTIVE' }],
            createdAt: '2026-01-10T08:00:00.000Z',
            avatar: null,
          },
        ],
        pagina: 1,
        totalPaginas: 5,
        total: 120,
        porPagina: 25,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito a administradores.',
  })
  findAll(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      status?: 'active' | 'suspended';
      createdFrom?: string;
      role?: string;
      kycStatus?: string;
    },
  ) {
    // Delega para adminService.listUsers que tem o select correto
    // (id, publicId, email, nome, role, isActive, createdAt, avatar, subscriptions)
    // + filtros completos: status, createdFrom, role, kycStatus (legacy).
    return this.adminService.listUsers({
      page: +query.page! || 1,
      limit: +query.limit! || 25,
      search: query.search,
      status: query.status,
      createdFrom: query.createdFrom,
      role: query.role,
      kycStatus: query.kycStatus,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description: 'Retorna os dados de um usuário específico pelo ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário encontrado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Usuário encontrado com sucesso',
        codigo: 200,
        data: {
          id: 1,
          publicId: 'usr_abc123',
          email: 'admin@teste.com',
          nome: 'Admin User',
          role: 'ADMIN',
          telefone: '+5511999999999',
          data_nascimento: '1990-01-15',
          genero: 'MASCULINO',
          endereco: 'Rua Teste',
          numero: '123',
          complemento: 'Apto 1',
          bairro: 'Bairro Teste',
          cidade: 'São Paulo',
          uf: 'SP',
          cep: '01234-567',
          pais: 'Brasil',
          termosAceitos: true,
          politicaAceita: true,
          tipo_documento: 'CPF',
          reg_documento: '123.456.789-00',
          isActive: true,
          createdAt: '2026-01-15T10:30:00.000Z',
          updatedAt: '2026-01-15T10:30:00.000Z',
          avatar: {
            url_sm:
              'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/avatar.jpg',
          },
          payments: [],
          subscriptions: [
            { id: 1, status: 'ACTIVE', plan: { nome: 'Premium' } },
          ],
          tokens: [],
          startups: [],
          investments: [],
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar dados do usuário',
    description: 'Atualiza os dados de um usuário existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário atualizados com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Usuário atualizado com sucesso',
        codigo: 200,
        data: {
          id: 1,
          email: 'admin@teste.com',
          nome: 'Admin Atualizado',
          role: 'ADMIN',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover usuário',
    description: 'Remove um usuário do sistema permanentemente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário removido com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Usuário removido com sucesso',
        codigo: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}

// ==========================================
// Admin Config Controller
// ==========================================

export interface FundraisingConfig {
  authFeePerToken: number;
  minCampaign: number;
  maxCampaign: number;
  equityMin: number;
  equityMax: number;
  tokenPrice: number;
  platformFee: number;
  fastTrackReview: number;
  // B02/B03 - Taxas de compliance
  complianceFee: number; // R$ 1.500,00 (padrao)
  fastTrackFee: number; // R$ 2.500,00 (compliance + prioridade)
}

@Controller('admin/config')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin Config')
export class AdminConfigController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias e áreas de atuação' })
  async listTaxonomy() {
    const categories = await this.prisma.category.findMany({
      include: { areas: { orderBy: { ordem: 'asc' } } },
      orderBy: { ordem: 'asc' },
    });
    return ResponseDto.success('Taxonomia retornada', 200, categories);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Adicionar categoria ou área de atuação' })
  async createTaxonomy(@Body() body: any) {
    const nome = String(body?.nome ?? '').trim();
    if (!nome) throw new BadRequestException('Nome é obrigatório');
    const slug = this.slugify(String(body?.slug || nome));
    const ordem = Number.isFinite(Number(body?.ordem)) ? Number(body.ordem) : 0;

    if (body?.type === 'area') {
      const categoryId = Number(body?.categoryId);
      if (!Number.isInteger(categoryId)) {
        throw new BadRequestException('Categoria é obrigatória para a área');
      }
      const area = await this.prisma.areaAtuacao.create({
        data: {
          nome,
          slug,
          descricao: body?.descricao?.trim() || null,
          categoryId,
          ordem,
        },
      });
      return ResponseDto.success('Área criada', 201, area);
    }

    const category = await this.prisma.category.create({
      data: { nome, slug, descricao: body?.descricao?.trim() || null, ordem },
    });
    return ResponseDto.success('Categoria criada', 201, category);
  }

  @Patch('categories')
  @ApiOperation({ summary: 'Editar categoria ou área de atuação' })
  async updateTaxonomy(@Body() body: any) {
    const id = Number(body?.id);
    const nome = String(body?.nome ?? '').trim();
    if (!Number.isInteger(id) || !nome) {
      throw new BadRequestException('ID e nome são obrigatórios');
    }
    const data = {
      nome,
      slug: this.slugify(String(body?.slug || nome)),
      descricao: body?.descricao?.trim() || null,
      ordem: Number.isFinite(Number(body?.ordem)) ? Number(body.ordem) : 0,
      ...(body?.ativo !== undefined ? { ativo: Boolean(body.ativo) } : {}),
    };
    const updated =
      body?.type === 'area'
        ? await this.prisma.areaAtuacao.update({ where: { id }, data })
        : await this.prisma.category.update({ where: { id }, data });
    return ResponseDto.success('Item atualizado', 200, updated);
  }

  @Delete('categories')
  @ApiOperation({ summary: 'Desativar categoria ou área de atuação' })
  async deleteTaxonomy(@Body() body: any) {
    const id = Number(body?.id);
    if (!Number.isInteger(id)) throw new BadRequestException('ID inválido');
    const data = { ativo: false };
    const updated =
      body?.type === 'area'
        ? await this.prisma.areaAtuacao.update({ where: { id }, data })
        : await this.prisma.category.update({ where: { id }, data });
    return ResponseDto.success('Item desativado', 200, updated);
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private rowsToConfig(
    rows: { key: string; value: string }[],
  ): FundraisingConfig {
    const cfg: Record<string, number> = {};
    const DEFAULTS: Record<string, number> = {
      authFeePerToken: 1,
      minCampaign: 300000,
      maxCampaign: 12000000,
      equityMin: 5,
      equityMax: 20,
      tokenPrice: 200,
      platformFee: 0.05,
      fastTrackReview: 600,
      complianceFee: 1500,
      fastTrackFee: 2500,
    };
    for (const row of rows) {
      const field = row.key.replace('fundraising.', '');
      const v = parseFloat(row.value);
      // Fallback defensivo: parseFloat retorna NaN para strings invalidas
      // (ex: "abc"). Sem fallback, o objeto retornado teria NaN em todos os
      // campos, quebrando o frontend (toFixed(NaN) = "NaN").
      cfg[field] = Number.isFinite(v) ? v : (DEFAULTS[field] ?? 0);
    }
    return {
      authFeePerToken: cfg['authFeePerToken'] ?? DEFAULTS.authFeePerToken,
      minCampaign: cfg['minCampaign'] ?? DEFAULTS.minCampaign,
      maxCampaign: cfg['maxCampaign'] ?? DEFAULTS.maxCampaign,
      equityMin: cfg['equityMin'] ?? DEFAULTS.equityMin,
      equityMax: cfg['equityMax'] ?? DEFAULTS.equityMax,
      tokenPrice: cfg['tokenPrice'] ?? DEFAULTS.tokenPrice,
      platformFee: cfg['platformFee'] ?? DEFAULTS.platformFee,
      fastTrackReview: cfg['fastTrackReview'] ?? DEFAULTS.fastTrackReview,
      complianceFee: cfg['complianceFee'] ?? DEFAULTS.complianceFee,
      fastTrackFee: cfg['fastTrackFee'] ?? DEFAULTS.fastTrackFee,
    };
  }

  @Get('fundraising')
  @ApiOperation({
    summary: 'Obter configuração de fundraising',
    description:
      'Retorna as configurações atuais de taxas e limites para campanhas de investimento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração retornada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Configuração de fundraising',
        codigo: 200,
        data: {
          authFeePerToken: 1,
          minCampaign: 300000,
          maxCampaign: 12000000,
          equityMin: 5,
          equityMax: 20,
          tokenPrice: 200,
          platformFee: 0.05,
          fastTrackReview: 600,
        },
      },
    },
  })
  async getFundraisingConfig() {
    const rows = await this.prisma.financeConfig.findMany({
      where: { key: { startsWith: 'fundraising.' } },
    });
    return {
      error: false,
      message: 'Configuração de fundraising',
      codigo: 200,
      data: this.rowsToConfig(rows),
    };
  }

  @Put('fundraising')
  @ApiOperation({
    summary: 'Atualizar configuração de fundraising',
    description: `Atualiza as configurações de taxas e limites para campanhas.

**Campos**:
- \`authFeePerToken\`: Custo de geração por token (R$/token, ex: 1.00)
- \`minCampaign\`: Valor mínimo para campanha (R$)
- \`maxCampaign\`: Valor máximo para campanha (R$)
- \`equityMin\`: Porcentagem mínima de equity (%)
- \`equityMax\`: Porcentagem máxima de equity (%)
- \`tokenPrice\`: Preço base do token (R$)
- \`platformFee\`: Taxa da plataforma (ex: 0.05 = 5%)
- \`fastTrackReview\`: Taxa de fast-track review (R$)`,
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada com sucesso.',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  async updateFundraisingConfig(@Body() data: Partial<FundraisingConfig>) {
    // Whitelist explicita — impede poluicao de dados via body com chaves
    // desconhecidas (qualquer string no body vira linha em financeConfig).
    const ALLOWED_KEYS = [
      'authFeePerToken',
      'minCampaign',
      'maxCampaign',
      'equityMin',
      'equityMax',
      'tokenPrice',
      'platformFee',
      'complianceFee',
      'fastTrackFee',
      'fastTrackReview',
    ] as const;

    // Caps defensivos. Valores absurdos quebram calculos downstream
    // (Math.ceil(meta/tokenPrice) → 0 se Infinity, etc.).
    const CAPS: Record<(typeof ALLOWED_KEYS)[number], number> = {
      authFeePerToken: 1_000, // R$ 1.000/token (acima disso e absurdo)
      minCampaign: 1_000_000_000, // R$ 1B
      maxCampaign: 10_000_000_000, // R$ 10B
      equityMin: 20,
      equityMax: 20,
      tokenPrice: 1_000_000, // R$ 1M/token (acima disso e absurdo)
      platformFee: 1, // 100%
      complianceFee: 1_000_000, // R$ 1M
      fastTrackFee: 1_000_000, // R$ 1M
      fastTrackReview: 1_000_000,
    };

    // Valida campos numericos. Number.isFinite cobre NaN, Infinity,
    // -Infinity, undefined (via coerção), null (via coerção).
    const validate = (
      k: (typeof ALLOWED_KEYS)[number],
      min: number,
      max: number,
    ) => {
      const v = data[k];
      if (v === undefined) return; // campo nao enviado — skip
      if (!Number.isFinite(v)) {
        throw new BadRequestException(`${k} invalido: deve ser numero finito`);
      }
      if (v < min || v > max) {
        throw new BadRequestException(
          `${k} invalido: deve estar entre ${min} e ${max}`,
        );
      }
    };

    validate('complianceFee', 0, CAPS.complianceFee);
    validate('fastTrackFee', 0, CAPS.fastTrackFee);
    validate('authFeePerToken', 0, CAPS.authFeePerToken);
    validate('tokenPrice', 0.01, CAPS.tokenPrice);
    validate('minCampaign', 1_000, CAPS.minCampaign);
    validate('maxCampaign', 1_000, CAPS.maxCampaign);
    validate('equityMin', 5, CAPS.equityMin);
    validate('equityMax', 5, CAPS.equityMax);
    if (
      data.equityMin !== undefined &&
      data.equityMax !== undefined &&
      data.equityMin > data.equityMax
    ) {
      throw new BadRequestException(
        'equityMin invalido: deve ser menor ou igual a equityMax',
      );
    }

    // Upsert apenas chaves whitelisted — ignora chaves desconhecidas no body.
    for (const k of ALLOWED_KEYS) {
      const v = data[k];
      if (v === undefined) continue;
      await this.prisma.financeConfig.upsert({
        where: { key: `fundraising.${k}` },
        update: { value: String(v) },
        create: {
          key: `fundraising.${k}`,
          value: String(v),
          description: `Fundraising config: ${k}`,
        },
      });
    }
    return this.getFundraisingConfig();
  }

  @Get('parameters')
  @ApiOperation({
    summary: 'Listar todos os parâmetros de configuração',
    description:
      'Retorna parâmetros de cálculo com valor vigente hoje, alteração agendada e histórico de versões.',
  })
  @ApiResponse({
    status: 200,
    description: 'Parâmetros retornados com sucesso.',
  })
  async listParameters() {
    const data = await this.configService.listForAdmin();
    return ResponseDto.success(
      'Parâmetros de configuração retornados',
      200,
      data,
    );
  }

  @Post('parameters')
  @ApiOperation({
    summary: 'Criar ou agendar nova versão de parâmetro de configuração',
    description:
      'Cria uma versão append-only a partir de effectiveFrom. Não altera versões anteriores.',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuração atualizada com sucesso.',
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  async setParameter(@Body() body: SetConfigParameterDto, @Req() req: any) {
    try {
      const effectiveFrom = body.effectiveFrom
        ? new Date(body.effectiveFrom)
        : new Date();
      if (isNaN(effectiveFrom.getTime())) {
        throw new BadRequestException('Data de vigência inválida');
      }

      const result = await this.configService.setValue({
        key: body.key,
        value: body.value,
        effectiveFrom,
        note: body.note,
        createdById: req?.user?.id ?? null,
      });

      return ResponseDto.success(
        'Configuração atualizada com sucesso',
        200,
        result,
      );
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(err?.message ?? 'Erro ao salvar parâmetro');
    }
  }
}
