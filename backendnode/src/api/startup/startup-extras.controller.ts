import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { StartupDocumentCategory } from '@prisma/client';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { SkipSessionFilter } from 'src/common/decorators/skip-session-filter.decorator';
import {
  BankingUpdateInput,
  StartupExtrasService,
} from './service/startup-extras.service';

/**
 * Endpoints "extras" do edit-startup (Fase 3d/3e):
 * - PATCH /startup/:id/pitch
 * - PATCH /startup/:id/banking
 * - GET /startup/:id/documents
 * - POST /startup/:id/documents (multipart)
 * - DELETE /startup/:id/documents/:docId
 *
 * Todas exigem AuthGuard. Ownership (`startup.founderId === req.user.id`)
 * é validada dentro do `StartupExtrasService`. `@SkipSessionFilter()` no
 * nível da classe pra que founders sem plano ativo (raro mas possível
 * pós-cancelamento) consigam ao menos visualizar/editar dados.
 */
@Controller('startup')
@ApiTags('Startup - Extras (edit)')
@UseGuards(AuthGuard)
@SkipSessionFilter()
@ApiCookieAuth()
export class StartupExtrasController {
  constructor(private readonly service: StartupExtrasService) {}

  @Patch(':id/pitch')
  @ApiOperation({ summary: 'Atualizar pitch (texto livre, máx 10k chars)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['pitch'],
      properties: { pitch: { type: 'string' } },
    },
  })
  async updatePitch(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { pitch: string },
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.updatePitch(id, req.user.id, body?.pitch ?? '');
  }

  @Patch(':id/banking')
  @ApiOperation({ summary: 'Atualizar dados bancários (payout)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        titular: { type: 'string' },
        documentoTitular: { type: 'string', example: '12345678909' },
        banco: { type: 'string' },
        tipoConta: { type: 'string', enum: ['corrente', 'poupanca'] },
        agencia: { type: 'string' },
        conta: { type: 'string' },
        digito: { type: 'string' },
        chavePix: { type: 'string' },
      },
    },
  })
  async updateBanking(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: BankingUpdateInput,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.updateBanking(id, req.user.id, body ?? {});
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Listar documentos da startup' })
  @ApiParam({ name: 'id', type: Number })
  async listDocuments(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.listDocuments(id, req.user.id);
  }

  /**
   * GET /startup/:id/captacao
   *
   * Dados da campanha ativa (DRAFT/OPEN) da startup para o founder owner.
   * Complementa o loader de `/founder/startups/:id/captacao`. Auth +
   * ownership garantidos pelo service (`assertOwnership`).
   */
  @Get(':id/captacao')
  @ApiOperation({
    summary: 'Dados de captação (campaign ativa) da startup do founder',
    description:
      'Retorna a Campaign ativa (DRAFT/OPEN/PAUSED) com targetAmount, valuation, ' +
      'tokenPrice, totalTokens, payments (TOKEN_RESERVATION), resources, ' +
      'tese, lucros/benefícios e CVM. Valida ownership.',
  })
  @ApiParam({ name: 'id', type: Number })
  async getCaptacao(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.getCaptacaoData(id, req.user.id);
  }

  @Put(':id/documents/na')
  @ApiOperation({
    summary: 'Marcar categoria como "Não se aplica"',
    description:
      'Marca uma categoria NÃO-essencial como "Não se aplica" com justificativa obrigatória (fluxo §2). Idempotente por categoria.',
  })
  @ApiParam({ name: 'id', type: Number })
  async setDocumentNA(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { categoria: StartupDocumentCategory; justificativa: string },
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.setDocumentNA(
      id,
      req.user.id,
      body?.categoria,
      body?.justificativa,
    );
  }

  @Delete(':id/documents/na/:categoria')
  @ApiOperation({ summary: 'Remover marcação "Não se aplica"' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'categoria', type: String })
  async removeDocumentNA(
    @Param('id', ParseIntPipe) id: number,
    @Param('categoria') categoria: StartupDocumentCategory,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.removeDocumentNA(id, req.user.id, categoria);
  }

  @Get(':id/prorrogacao')
  @ApiOperation({
    summary: 'Dados da prorrogação da captação',
    description:
      'Meta original + preço do token da campanha FUNDED, para o founder definir o valor adicional e ver a nova meta/reserva.',
  })
  @ApiParam({ name: 'id', type: Number })
  async getProrrogacao(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.getProrrogacaoData(id, req.user.id);
  }

  @Post(':id/prorrogacao')
  @ApiOperation({
    summary: 'Criar cobrança da reserva adicional (prorrogação)',
    description:
      'Cria CampaignExtension + Payment TOKEN_RESERVATION_EXTENSION (PENDING). Ao pagar, a campanha é reativada (OPEN) com a meta somada.',
  })
  @ApiParam({ name: 'id', type: Number })
  async createProrrogacao(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { additionalAmount: number; periodDays?: number },
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.createProrrogacaoCheckout(
      id,
      req.user.id,
      Number(body?.additionalAmount),
      Number(body?.periodDays ?? 30),
    );
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload de documento',
    description:
      'Aceita PDF/JPG/PNG até 25 MB (teto técnico do backend; a trava ' +
      'real fica no frontend). Categorias: CONTRATO_SOCIAL, CNPJ, ' +
      'BALANCO, PITCH_DECK, OUTRO. Pra slots únicos (todas exceto OUTRO), ' +
      'um upload novo substitui o anterior.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da startup' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'categoria'],
      properties: {
        file: { type: 'string', format: 'binary' },
        categoria: {
          type: 'string',
          enum: ['CONTRATO_SOCIAL', 'CNPJ', 'BALANCO', 'PITCH_DECK', 'OUTRO'],
        },
      },
    },
  })
  async uploadDocument(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('categoria') categoria: StartupDocumentCategory,
    @Query('categoria') categoriaQuery: StartupDocumentCategory,
    @Req() req: Request & { user: { id: number } },
  ) {
    // Aceita categoria via body field OU query string (alguns clients
    // multipart enviam só por query). Body tem prioridade.
    const cat = categoria ?? categoriaQuery;
    return this.service.uploadDocument(id, req.user.id, file, cat);
  }

  @Get(':id/documents/:docId/download')
  @ApiOperation({
    summary: 'URL pré-assinada de download',
    description: 'Gera URL temporária (1h) pra baixar o documento do bucket.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'docId', type: Number })
  async downloadDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.getDocumentDownloadUrl(id, req.user.id, docId);
  }

  @Delete(':id/documents/:docId')
  @ApiOperation({ summary: 'Remover documento' })
  @ApiParam({ name: 'id', type: Number })
  @ApiParam({ name: 'docId', type: Number })
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @Param('docId', ParseIntPipe) docId: number,
    @Req() req: Request & { user: { id: number } },
  ) {
    return this.service.deleteDocument(id, req.user.id, docId);
  }
}
