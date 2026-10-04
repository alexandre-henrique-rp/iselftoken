import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AdminGuard } from 'src/auth/admin.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { SkipSessionFilter } from 'src/common/decorators/skip-session-filter.decorator';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
@SkipSessionFilter()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * Cria uma nova assinatura
   * @name create
   * @description Cria uma nova assinatura para um usuário
   */
  @Post()
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiBody({
    type: CreateSubscriptionDto,
    description:
      'Body esperado para criar assinatura. Campos obrigatórios: ' +
      'userId (ID do usuário), planId (ID do plano) e status. ' +
      'Status permitidos: PENDING, ACTIVE, EXPIRED, CANCELED.',
    examples: {
      pending: {
        summary: 'Assinatura pendente',
        value: {
          userId: 1,
          planId: 2,
          status: 'PENDING',
        },
      },
      active: {
        summary: 'Assinatura ativa',
        value: {
          userId: 1,
          planId: 2,
          status: 'ACTIVE',
        },
      },
      expired: {
        summary: 'Assinatura expirada',
        value: {
          userId: 1,
          planId: 2,
          status: 'EXPIRED',
        },
      },
      canceled: {
        summary: 'Assinatura cancelada',
        value: {
          userId: 1,
          planId: 2,
          status: 'CANCELED',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Criar nova assinatura (rota protegida)',
    description:
      'Cria uma assinatura vinculando um usuário a um plano. ' +
      'Requer autenticação via Bearer Token e recebe os dados do usuário, ' +
      'do plano e o status inicial da assinatura. ' +
      'Retorna os dados da assinatura criada.',
  })
  @ApiResponse({
    status: 201,
    description: 'Assinatura criada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Assinatura criada com sucesso',
        codigo: 201,
        data: {
          id: 1,
          userId: 1,
          planId: 2,
          status: 'PENDING',
          startedAt: null,
          expiresAt: null,
          createdAt: '2026-02-02T14:00:00.000Z',
          updatedAt: '2026-02-02T14:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos.',
    schema: {
      example: {
        error: true,
        message: 'Dados inválidos',
        codigo: 400,
        detalhe: {
          status: 'Status inválido',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
    schema: {
      example: {
        error: true,
        message: 'Não autorizado - Token inválido ou expirado.',
        codigo: 401,
      },
    },
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflito — usuário já possui assinatura ACTIVE para este mesmo plano (CASE.md §Planos).',
    schema: {
      example: {
        error: true,
        message:
          'Você já possui este plano ativo. Para trocar, cancele o plano atual em /pricing.',
        codigo: 409,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
    schema: {
      example: {
        error: true,
        message: 'Erro interno do servidor',
        codigo: 500,
      },
    },
  })
  create(
    @Body() createSubscriptionDto: CreateSubscriptionDto,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.subscriptionsService.create(createSubscriptionDto, req.user.id);
  }

  /**
   * Lista todas as assinaturas com paginação
   * @name findAll
   * @description Retorna todas as assinaturas do sistema com paginação
   */
  @Get()
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Número da página (padrão: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (padrão: 25)',
  })
  @ApiOperation({
    summary: 'Listar todas as assinaturas com paginação (rota protegida)',
  })
  @ApiResponse({
    status: 200,
    description: 'Assinaturas retornadas com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Assinaturas retornadas com sucesso',
        codigo: 200,
        data: [
          {
            id: 1,
            userId: 1,
            planId: 2,
            status: 'ACTIVE',
            startedAt: '2026-02-01T12:00:00.000Z',
            expiresAt: '2026-03-01T12:00:00.000Z',
            createdAt: '2026-02-01T12:00:00.000Z',
            updatedAt: '2026-02-01T12:00:00.000Z',
          },
        ],
        total: 1,
        pagina: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
    schema: {
      example: {
        error: true,
        message: 'Não autorizado - Token inválido ou expirado.',
        codigo: 401,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
    schema: {
      example: {
        error: true,
        message: 'Erro interno do servidor',
        codigo: 500,
      },
    },
  })
  findAll(
    @Req() req: Request & { user: { id: number } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.subscriptionsService.findAll(
      {
        page: +page! || 1,
        limit: +limit! || 10,
      },
      req.user.id,
    );
  }

  /**
   * Busca uma assinatura específica por ID
   * @name findOne
   * @description Retorna os dados completos de uma assinatura
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiParam({ name: 'id', description: 'ID da assinatura', type: Number })
  @ApiOperation({ summary: 'Buscar assinatura por ID (rota protegida)' })
  @ApiResponse({
    status: 200,
    description: 'Assinatura encontrada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Assinatura encontrada com sucesso',
        codigo: 200,
        data: {
          id: 1,
          userId: 1,
          planId: 2,
          status: 'ACTIVE',
          startedAt: '2026-02-01T12:00:00.000Z',
          expiresAt: '2026-03-01T12:00:00.000Z',
          createdAt: '2026-02-01T12:00:00.000Z',
          updatedAt: '2026-02-01T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
    schema: {
      example: {
        error: true,
        message: 'Não autorizado - Token inválido ou expirado.',
        codigo: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assinatura não encontrada.',
    schema: {
      example: {
        error: true,
        message: 'Assinatura não encontrada',
        codigo: 404,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
    schema: {
      example: {
        error: true,
        message: 'Erro interno do servidor',
        codigo: 500,
      },
    },
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.subscriptionsService.findOne(+id, req.user.id);
  }

  /**
   * Atualiza uma assinatura existente
   * @name update
   * @description Atualiza os dados de uma assinatura
   */
  @Patch(':id')
  @UseGuards(AuthGuard, AdminGuard)
  @ApiCookieAuth()
  @ApiParam({ name: 'id', description: 'ID da assinatura', type: Number })
  @ApiBody({ type: UpdateSubscriptionDto })
  @ApiOperation({ summary: 'Atualizar assinatura (rota protegida)' })
  @ApiResponse({
    status: 200,
    description: 'Assinatura atualizada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Assinatura atualizada com sucesso',
        codigo: 200,
        data: {
          id: 1,
          userId: 1,
          planId: 2,
          status: 'CANCELED',
          startedAt: '2026-02-01T12:00:00.000Z',
          expiresAt: '2026-03-01T12:00:00.000Z',
          createdAt: '2026-02-01T12:00:00.000Z',
          updatedAt: '2026-02-02T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos.',
    schema: {
      example: {
        error: true,
        message: 'Dados inválidos',
        codigo: 400,
        detalhe: {
          status: 'Status inválido',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
    schema: {
      example: {
        error: true,
        message: 'Não autorizado - Token inválido ou expirado.',
        codigo: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assinatura não encontrada.',
    schema: {
      example: {
        error: true,
        message: 'Assinatura não encontrada',
        codigo: 404,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
    schema: {
      example: {
        error: true,
        message: 'Erro interno do servidor',
        codigo: 500,
      },
    },
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(+id, updateSubscriptionDto);
  }

  /**
   * Remove uma assinatura do sistema
   * @name remove
   * @description Remove permanentemente uma assinatura
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiParam({ name: 'id', description: 'ID da assinatura', type: Number })
  @ApiOperation({ summary: 'Remover assinatura (rota protegida)' })
  @ApiResponse({
    status: 200,
    description: 'Assinatura removida com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Assinatura removida com sucesso',
        codigo: 200,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado - Token inválido ou expirado.',
    schema: {
      example: {
        error: true,
        message: 'Não autorizado - Token inválido ou expirado.',
        codigo: 401,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Assinatura não encontrada.',
    schema: {
      example: {
        error: true,
        message: 'Assinatura não encontrada',
        codigo: 404,
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Erro interno do servidor.',
    schema: {
      example: {
        error: true,
        message: 'Erro interno do servidor',
        codigo: 500,
      },
    },
  })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.subscriptionsService.remove(+id, req.user.id);
  }

  /**
   * Historico de subscriptions do usuario autenticado, com plan + payments.
   * Usado pela pagina /profile/plans para gerenciar planos ativos e ver
   * o historico de compras. (decisao 2026-09-06 — wireframe /profile/plans).
   */
  @Get('me/history')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Historico de subscriptions do usuario autenticado',
    description:
      'Retorna todas as subscriptions do user logado com plano e lista de ' +
      'pagamentos, ordenadas por data de criacao decrescente. Alimenta a ' +
      'pagina /profile/plans (planos ativos + datas + historico de compras).',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de subscriptions com plan + payments.',
  })
  @ApiResponse({
    status: 401,
    description: 'Nao autorizado - Token invalido ou expirado.',
  })
  findHistory(@Req() req: Request & { user: { id: number } }) {
    return this.subscriptionsService.findHistoryByUser(req.user.id);
  }

  /**
   * Auto-cancelamento — user cancela a própria assinatura. Disparado pelo
   * fluxo de troca de plano em /pricing: o user precisa cancelar a sub
   * atual antes de criar a nova. Validação de ownership feita no service.
   * Não exige justificativa (diferente do admin cancel) porque é ação do
   * próprio dono.
   */
  @Post(':id/cancel')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiParam({ name: 'id', description: 'ID da assinatura', type: Number })
  @ApiOperation({
    summary: 'Cancelar minha assinatura',
    description:
      'User cancela a própria Subscription. Vira CANCELED e expiresAt = now ' +
      '(revoga acesso imediato, sem reembolso do período pago).',
  })
  cancelOwn(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.subscriptionsService.cancelOwn(id, req.user.id, req);
  }
}
