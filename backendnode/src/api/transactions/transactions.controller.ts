import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiCookieAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * @name create
   * @description Cria uma transação com base no propósito e método informados.
   *
   * @param createTransactionDto Dados da transação
   * @param req Requisição com usuário autenticado
   */
  @Post()
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiBody({
    type: CreateTransactionDto,
    description:
      'Cria um pagamento para assinatura, investimento, reserva de tokens, ' +
      'serviço avulso ou compra P2P. O valor final é calculado no backend.',
  })
  @ApiOperation({
    summary: 'Criar transação (rota protegida)',
    description:
      'Orquestra a criação de pagamentos. Em PIX/BOLETO/CARTÃO gera pagamento ' +
      'PENDING com dados do gateway. Em WALLET processa pagamento imediato ' +
      'e executa as ações de negócio (assinatura, investimento, etc.).',
  })
  @ApiResponse({
    status: 201,
    description: 'Transação criada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Transação criada com sucesso',
        codigo: 201,
        data: {
          id: 102,
          status: 'PENDING',
          amount: 10000.0,
          method: 'PIX',
          purpose: 'TOKEN_RESERVATION',
          txid: 'e728f7d5-0e5f-4f3d-9a09-bd4d9f8a9c22',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou regras de negócio violadas.',
    schema: {
      example: {
        error: true,
        message: 'Dados inválidos',
        codigo: 400,
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
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.transactionsService.create(createTransactionDto, req.user);
  }

  /**
   * @name findAll
   * @description Lista todas as transações do usuário autenticado.
   *
   * @param page Número da página (opcional)
   * @param limit Itens por página (opcional)
   * @param req Requisição com usuário autenticado
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
    summary: 'Listar transações do usuário (rota protegida)',
    description:
      'Retorna as transações do usuário autenticado, com paginação opcional.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transações retornadas com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Transações retornadas com sucesso',
        codigo: 200,
        data: [
          {
            id: 1,
            amount: 100.0,
            method: 'PIX',
            status: 'PENDING',
            purpose: 'SUBSCRIPTION',
          },
        ],
        total: 1,
        pagina: 1,
      },
    },
  })
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.transactionsService.findAll(
      { page: +page, limit: +limit },
      req.user,
    );
  }

  /**
   * @name findOne
   * @description Busca uma transação específica do usuário autenticado.
   *
   * @param id ID da transação
   * @param req Requisição com usuário autenticado
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiParam({ name: 'id', description: 'ID da transação', type: Number })
  @ApiOperation({
    summary: 'Buscar transação por ID (rota protegida)',
    description: 'Retorna os detalhes de uma transação específica do usuário.',
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
          amount: 100.0,
          method: 'PIX',
          status: 'PENDING',
          purpose: 'SUBSCRIPTION',
        },
      },
    },
  })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.transactionsService.findOne(id, req.user);
  }

  /**
   * @name confirm
   * @description Confirma uma transação PENDING e aplica regras de negócio.
   *
   * @param id ID da transação
   * @param req Requisição com usuário autenticado
   */
  @Post(':id/confirm')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiParam({ name: 'id', description: 'ID da transação', type: Number })
  @ApiOperation({
    summary: 'Confirmar transação (rota protegida)',
    description:
      'Confirma pagamento PENDING, atualiza status para PAID e executa ' +
      'ações relacionadas (assinatura, investimento, reserva de tokens).',
  })
  @ApiResponse({
    status: 200,
    description: 'Transação confirmada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Transação confirmada com sucesso',
        codigo: 200,
        data: {
          id: 1,
          status: 'PAID',
          paidAt: '2026-02-02T14:00:00.000Z',
        },
      },
    },
  })
  confirm(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.transactionsService.confirm(id, req.user);
  }

  /**
   * @name cancel
   * @description Cancela uma transação PENDING.
   *
   * @param id ID da transação
   * @param req Requisição com usuário autenticado
   */
  @Post(':id/cancel')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiParam({ name: 'id', description: 'ID da transação', type: Number })
  @ApiOperation({
    summary: 'Cancelar transação (rota protegida)',
    description:
      'Cancela uma transação com status PENDING. Se houver investimento, ' +
      'o status do investimento também é atualizado para CANCELED.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transação cancelada com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Transação cancelada com sucesso',
        codigo: 200,
      },
    },
  })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.transactionsService.cancel(id, req.user);
  }

  /**
   * @name exportCSV
   * @description Exporta transações do usuário em formato CSV.
   *
   * @param type Filtro por tipo de transação
   * @param status Filtro por status
   * @param startDate Data inicial
   * @param endDate Data final
   * @param req Requisição com usuário autenticado
   * @param res Response para stream do CSV
   */
  @Get('export/csv')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiQuery({ name: 'type', required: false, description: 'Filtro por tipo' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtro por status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Data inicial (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Data final (YYYY-MM-DD)',
  })
  @ApiOperation({
    summary: 'Exportar transações em CSV',
    description:
      'Exporta todas as transações do usuário em formato CSV com todos os campos.',
  })
  @ApiResponse({ status: 200, description: 'CSV gerado com sucesso.' })
  async exportCSV(
    @Query()
    query: {
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    @Req() req: Request & { user: PayloadEntity },
    @Res() res: Response,
  ) {
    return this.transactionsService.exportCSV(query, req.user, res);
  }

  /**
   * @name exportPDF
   * @description Exporta transações do usuário em formato PDF (HTML tabular).
   *
   * @param type Filtro por tipo de transação
   * @param status Filtro por status
   * @param startDate Data inicial
   * @param endDate Data final
   * @param req Requisição com usuário autenticado
   * @param res Response para stream do PDF
   */
  @Get('export/pdf')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiQuery({ name: 'type', required: false, description: 'Filtro por tipo' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filtro por status',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Data inicial (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Data final (YYYY-MM-DD)',
  })
  @ApiOperation({
    summary: 'Exportar transações em PDF',
    description:
      'Exporta todas as transações do usuário em formato PDF tabular com headers.',
  })
  @ApiResponse({ status: 200, description: 'PDF gerado com sucesso.' })
  async exportPDF(
    @Query()
    query: {
      type?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    },
    @Req() req: Request & { user: PayloadEntity },
    @Res() res: Response,
  ) {
    return this.transactionsService.exportPDF(query, req.user, res);
  }
}
