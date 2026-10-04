import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { AuthGuard } from '../../auth/auth.guard';
import { ResponseDto } from 'src/common/dto/response.dto';
import { AdminGuard } from '../../auth/admin.guard';
import { PlansService } from '../plans/services/plans.service';
import { StartupService } from '../startup/service/startup.service';
import { PaymentService } from '../payment/payment.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AdminService } from './admin.service';
import { IncrementScoreDto } from './dto/admin.dto';

@Controller('admin/plans')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Planos')
export class AdminPlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os planos',
    description:
      'Retorna uma lista de todos os planos de assinatura do sistema.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome ou slug do plano',
    schema: { type: 'string' },
    example: 'premium',
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
  @ApiResponse({
    status: 200,
    description: 'Lista de planos retornada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Planos encontrados com sucesso',
        codigo: 200,
        data: [
          {
            id: 1,
            nome: 'Plano Premium',
            slug: 'premium',
            preco: 99.9,
            periodoMeses: 12,
            isActive: true,
          },
          {
            id: 2,
            nome: 'Plano Basic',
            slug: 'basic',
            preco: 49.9,
            periodoMeses: 6,
            isActive: true,
          },
        ],
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
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.plansService.findAll({
      page: +query.page! || 1,
      limit: +query.limit! || 25,
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar plano por ID',
    description: 'Retorna os dados de um plano específico pelo ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plano encontrado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Plano encontrado com sucesso',
        codigo: 200,
        data: {
          id: 1,
          nome: 'Plano Premium',
          slug: 'premium',
          preco: 99.9,
          periodoMeses: 12,
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Plano não encontrado.' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(+id);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar novo plano',
    description: 'Cria um novo plano de assinatura no sistema.',
  })
  @ApiResponse({
    status: 201,
    description: 'Plano criado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Plano criado com sucesso',
        codigo: 200,
        data: {
          id: 3,
          nome: 'Plano Enterprise',
          slug: 'enterprise',
          preco: 299.9,
          periodoMeses: 12,
          isActive: true,
        },
      },
    },
  })
  create(@Body() createData: any) {
    return this.plansService.create(createData);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar plano',
    description: 'Atualiza os dados de um plano existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plano atualizado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Plano atualizado com sucesso',
        codigo: 200,
        data: {
          id: 1,
          nome: 'Plano Premium Atualizado',
          slug: 'premium',
          preco: 119.9,
          periodoMeses: 12,
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Plano não encontrado.' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.plansService.update(+id, updateData);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover plano',
    description: 'Desativa um plano (soft delete).',
  })
  @ApiResponse({
    status: 200,
    description: 'Plano removido com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Plano deletado com sucesso',
        codigo: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Plano não encontrado.' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(+id);
  }
}

@Controller('admin/startups')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Startups')
export class AdminStartupsController {
  constructor(
    private readonly startupService: StartupService,
    private readonly adminService: AdminService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todas as startups',
    description: 'Retorna uma lista de todas as startups do sistema.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome, área de atuação ou estágio',
    schema: { type: 'string' },
    example: 'Tecnologia',
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
  @ApiResponse({
    status: 200,
    description: 'Lista de startups retornada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Startups retornadas com sucesso',
        codigo: 200,
        data: [
          {
            id: '1',
            nome: 'Startup XYZ',
            segmento: 'Tecnologia',
            status: 'aprovada',
            estagio: 'Seed',
            totalTokens: 100000,
            tokensVendidos: 25000,
            percentualVendido: 25,
          },
          {
            id: '2',
            nome: 'Startup ABC',
            segmento: 'Fintech',
            status: 'em_analise',
            estagio: 'Pre-seed',
            totalTokens: 50000,
            tokensVendidos: 0,
            percentualVendido: 0,
          },
        ],
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
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.startupService.findAllAdmin({
      page: +query.page! || 1,
      limit: +query.limit! || 25,
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar startup por ID',
    description: 'Retorna os dados de uma startup específica pelo ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Startup encontrado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Startup encontrado com sucesso',
        codigo: 200,
        data: {
          id: 1,
          nome: 'Startup XYZ',
          razao_social: 'XYZ Tecnologia Ltda',
          cnpj: '12.345.678/0001-90',
          area_atuacao: 'Tecnologia',
          estagio: 'Seed',
          status: 'APPROVED',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Startup não encontrado.' })
  findOne(@Param('id') id: string) {
    // Delega ao detalhe completo de compliance: inclui logo, cover, pitch_deck,
    // documents (com URLs presigned resolvidas a partir do s3Key), documentNAs,
    // founder enriquecido e campaigns.resources. O findOneAdmin do StartupService
    // retornava os documentos SEM url, quebrando a visualização do pitch deck e
    // demais anexos nas páginas de Fase (/admin/startups/:id/1|2|3).
    return this.adminService.getStartupDetail(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar startup',
    description: 'Atualiza os dados de uma startup existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Startup atualizado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Startup atualizado com sucesso',
        codigo: 200,
        data: {
          id: 1,
          nome: 'Startup XYZ Atualizada',
          area_atuacao: 'Tecnologia',
          estagio: 'Series A',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Startup não encontrado.' })
  update(@Param('id') id: string, @Body() updateData: any, @Req() req: any) {
    return this.startupService.update(+id, updateData, req?.user);
  }

  @Patch(':id/score')
  @ApiOperation({
    summary: 'Atualizar score manual da startup (0-100)',
    description:
      'Atribui o score manual usado para ordenar a seção Destaque da home pública. ' +
      'Score deve ser inteiro entre 0 e 100.',
  })
  @ApiResponse({
    status: 200,
    description: 'Score atualizado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Score atualizado com sucesso',
        codigo: 200,
        data: { id: 1, nome: 'Startup XYZ', score: 87 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Score inválido (deve ser 0-100).' })
  @ApiResponse({ status: 404, description: 'Startup não encontrada.' })
  updateScore(@Param('id') id: string, @Body() body: { score: number }) {
    return this.adminService.updateStartupScore(+id, +body?.score!);
  }

  /**
   * Ação "Coroar" — incrementa o score de marketplace em +N pontos (ou -N com
   * delta negativo), com clamp em 0..100. Exclusivo para ADMIN e restrito a
   * startups com a Fase 3 (Detalhes de Captação) APROVADA. Defesa em
   * profundidade: a checagem de fase é feita no service, não no controller.
   *
   * @see CASE.md §Curadoria Premium
   */
  @Patch(':id/score/increment')
  @ApiOperation({
    summary: 'Incrementar score de marketplace (ação "Coroar", pós-Fase 3)',
    description:
      'Soma `delta` ao score atual da startup. O resultado é clampado em 0..100. ' +
      'Restrito a ADMIN e exige que a Fase 3 esteja APPROVED em ' +
      '`startup_review_decisions`. Grava em AuditLog com oldValue/newValue/delta/reason.',
  })
  @ApiResponse({
    status: 200,
    description: 'Score incrementado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Score incrementado com sucesso',
        codigo: 200,
        data: {
          id: 1,
          nome: 'Startup XYZ',
          score: 55,
          previousScore: 42,
          appliedDelta: 13,
          reason: 'Performance Q3 validada',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Delta inválido (deve ser inteiro entre -100 e 100, ≠ 0).',
  })
  @ApiResponse({
    status: 403,
    description: 'Fase 3 não aprovada — score não pode ser incrementado.',
  })
  @ApiResponse({ status: 404, description: 'Startup não encontrada.' })
  incrementScore(
    @Param('id') id: string,
    @Body() body: IncrementScoreDto,
    @Req() req: any,
  ) {
    const admin = req?.user ?? null;
    const ip =
      req?.ip ||
      req?.socket?.remoteAddress ||
      req?.connection?.remoteAddress ||
      null;
    return this.adminService.incrementStartupScore(
      +id,
      body?.delta,
      body?.reason,
      {
        adminUserId: admin?.id ?? null,
        adminName: admin?.nome ?? null,
        ip,
      },
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover startup',
    description: 'Remove uma startup do sistema.',
  })
  @ApiResponse({
    status: 200,
    description: 'Startup removido com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Startup removido com sucesso',
        codigo: 200,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Startup não encontrado.' })
  remove(@Param('id') id: string) {
    return this.startupService.remove(+id);
  }

  /**
   * Histórico de decisões de auditoria (aprovar/rejeitar) da startup.
   *
   * Query params:
   *   - phase?: filtra por fase específica (1, 2 ou 3). Sem filtro retorna
   *     todas as fases, ordenadas por phase asc, createdAt desc.
   *
   * Cada entrada inclui `rejectedSnapshot` (JSON) quando `decision='REJECTED'`
   * — usado pelo frontend para diff field-by-field no admin.
   */
  @Get(':id/review-decisions')
  @ApiOperation({
    summary: 'Histórico de decisões de auditoria da startup',
    description:
      'Lista todas as decisões (APPROVED/REJECTED) tomadas pelos admins, ' +
      'ordenadas por fase asc + createdAt desc. Inclui `rejectedSnapshot` ' +
      'JSON para diff field-by-field quando o founder atualiza após rejeição.',
  })
  @ApiQuery({
    name: 'phase',
    required: false,
    type: Number,
    description: 'Filtrar por fase específica (1, 2 ou 3)',
  })
  async getReviewDecisions(
    @Param('id') id: string,
    @Query('phase') phase?: string,
  ) {
    if (phase) {
      const decision = await this.adminService.getLatestDecisionForPhase(
        +id,
        +phase,
      );
      return ResponseDto.success('Última decisão da fase', 200, decision);
    }
    const all = await this.adminService.listDecisions(+id);
    return ResponseDto.success('Histórico de decisões', 200, all);
  }
}

@Controller('admin/payments')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Pagamentos')
export class AdminPaymentsController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os pagamentos',
    description: 'Retorna uma lista de todos os pagamentos do sistema.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por ID do usuário, email ou status',
    schema: { type: 'string' },
    example: 'PAID',
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
    name: 'status',
    required: false,
    enum: ['PENDING', 'PAID', 'CANCELED', 'REFUNDED', 'EXPIRED'],
    description: 'Filtro por status do pagamento',
  })
  @ApiQuery({
    name: 'purpose',
    required: false,
    enum: [
      'SUBSCRIPTION',
      'INVESTMENT',
      'TOKEN_RESERVATION',
      'EARLY_ACCESS',
      'P2P_BUY',
      'VERIFICATION_SEAL',
      'COMPLIANCE_FEE',
      'TOKEN_RESERVATION_EXTENSION',
      'FAST_TRACK_REVIEW',
    ],
    description: 'Filtro por propósito do pagamento',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de pagamentos retornada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Lista de pagamentos retornada com sucesso',
        codigo: 200,
        data: [
          {
            id: 1,
            amount: 99.9,
            method: 'PIX',
            purpose: 'SUBSCRIPTION',
            status: 'PAID',
            userId: 1,
          },
          {
            id: 2,
            amount: 49.9,
            method: 'CARD',
            purpose: 'SUBSCRIPTION',
            status: 'PENDING',
            userId: 2,
          },
        ],
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
      status?: string;
      purpose?: string;
    },
  ) {
    return this.paymentService.findAll({
      page: +query.page! || 1,
      limit: +query.limit! || 25,
      search: query.search,
      status: query.status,
      purpose: query.purpose,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar pagamento por ID',
    description: 'Retorna os dados de um pagamento específico pelo ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pagamento encontrado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Pagamento encontrado com sucesso',
        codigo: 200,
        data: {
          id: 1,
          amount: 99.9,
          method: 'PIX',
          purpose: 'SUBSCRIPTION',
          status: 'PAID',
          userId: 1,
          paidAt: '2026-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado.' })
  findOne(@Param('id') id: string) {
    return this.paymentService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar pagamento',
    description: 'Atualiza os dados de um pagamento existente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pagamento atualizado com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Pagamento atualizado com sucesso',
        codigo: 200,
        data: { id: 1, status: 'REFUNDED' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Pagamento não encontrado.' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.paymentService.update(+id, updateData);
  }
}

@Controller('admin/transactions')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Transações')
export class AdminTransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todas as transações',
    description: 'Retorna uma lista de todas as transações do sistema.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome do usuário, email ou status',
    schema: { type: 'string' },
    example: 'PAID',
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
  @ApiResponse({
    status: 200,
    description: 'Lista de transações retornada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Transações retornadas com sucesso',
        codigo: 200,
        data: [
          {
            id: 1,
            amount: 99.9,
            method: 'PIX',
            purpose: 'SUBSCRIPTION',
            status: 'PAID',
            user: { id: 1, nome: 'João Silva', email: 'joao@teste.com' },
          },
          {
            id: 2,
            amount: 1000.0,
            method: 'PIX',
            purpose: 'INVESTMENT',
            status: 'PAID',
            user: { id: 2, nome: 'Maria Santos', email: 'maria@teste.com' },
          },
        ],
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
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.transactionsService.findAllAdmin({
      page: +query.page! || 1,
      limit: +query.limit! || 25,
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar transação por ID',
    description: 'Retorna os dados de uma transação específica pelo ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transação encontrada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Transação encontrada com sucesso',
        codigo: 200,
        data: {
          id: 1,
          amount: 99.9,
          method: 'PIX',
          purpose: 'SUBSCRIPTION',
          status: 'PAID',
          user: { id: 1, nome: 'João Silva', email: 'joao@teste.com' },
          subscription: { id: 1 },
          investment: null,
          campaign: null,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Transação não encontrada.' })
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOneAdmin(+id);
  }
}
