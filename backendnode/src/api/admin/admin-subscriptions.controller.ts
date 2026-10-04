import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
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
import { AdminGuard } from '../../auth/admin.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('admin/subscriptions')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Assinaturas')
export class AdminSubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todas as assinaturas',
    description:
      'Retorna uma lista paginada de todas as assinaturas do sistema.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Buscar por nome do usuário ou slug do plano',
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
    description: 'Lista de assinaturas retornada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Assinaturas carregadas com sucesso',
        codigo: 200,
        data: [
          {
            id: 1,
            startedAt: '2026-01-01T00:00:00.000Z',
            expiresAt: '2027-01-01T00:00:00.000Z',
            status: 'ACTIVE',
            plan: { slug: 'premium', preco: 99.9, periodoMeses: 12 },
            user: { id: 1, nome: 'João Silva' },
          },
          {
            id: 2,
            startedAt: '2026-02-01T00:00:00.000Z',
            expiresAt: '2026-08-01T00:00:00.000Z',
            status: 'ACTIVE',
            plan: { slug: 'basic', preco: 49.9, periodoMeses: 6 },
            user: { id: 2, nome: 'Maria Santos' },
          },
        ],
        pagina: 1,
        total: 50,
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
  findAll(@Query() query: { page?: number; limit?: number; search?: string }) {
    return this.subscriptionsService.findAll({
      page: +query.page! || 1,
      limit: +query.limit! || 25,
      search: query.search,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar assinatura por ID',
    description: 'Retorna os dados de uma assinatura específica pelo ID.',
  })
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
          startedAt: '2026-01-01T00:00:00.000Z',
          expiresAt: '2027-01-01T00:00:00.000Z',
          status: 'ACTIVE',
          userId: 1,
          planId: 1,
          plan: {
            id: 1,
            slug: 'premium',
            nome: 'Plano Premium',
            preco: 99.9,
            periodoMeses: 12,
            isActive: true,
          },
          user: { id: 1, email: 'joao@teste.com', nome: 'João Silva' },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Assinatura não encontrada.' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar assinatura',
    description: 'Atualiza os dados de uma assinatura existente.',
  })
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
          status: 'ACTIVE',
          expiresAt: '2027-06-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Assinatura não encontrada.' })
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.subscriptionsService.update(+id, updateData);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover assinatura',
    description: 'Remove uma assinatura do sistema.',
  })
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
  @ApiResponse({ status: 404, description: 'Assinatura não encontrada.' })
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(+id);
  }
}
