import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateStartupOnboardingDto } from './dto/create-startup-onboarding.dto';
import { RequestVerificationDto } from './dto/request-verification.dto';
import { UpdateComplementaryDto } from './dto/update-complementary.dto';
import { UpdateStartupDto } from './dto/update-startup.dto';
import { StartupListOverviewResponseEntity } from './entities/dashboard-overview.entity';
import { StartupService } from './service/startup.service';
import { ValidateFundador } from './service/validate.fundador';

@ApiTags('Startup')
@Controller('startup')
export class StartupController {
  constructor(
    private readonly startupService: StartupService,
    private readonly validateFundador: ValidateFundador,
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // =====================================================
  // PUBLICO - Marketplace (sem auth)
  // =====================================================

  @Get('marketplace/featured')
  @ApiOperation({
    summary: 'Startups em destaque para marketplace',
    description: 'Lista startups Featured para o marketplace público',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de startups em destaque',
  })
  async findFeatured() {
    return this.startupService.findByMarketplaceTag('featured');
  }

  @Get('marketplace/verified')
  @ApiOperation({
    summary: 'Startups verificadas para marketplace',
    description: 'Lista startups Verificadas para o marketplace público',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de startups verificadas',
  })
  async findVerified() {
    return this.startupService.findByMarketplaceTag('verified');
  }

  @Get('marketplace/accelerated')
  @ApiOperation({
    summary: 'Startups aceleradas para marketplace',
    description: 'Lista startups em fase de aceleração',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de startups aceleradas',
  })
  async findAccelerated() {
    return this.startupService.findByMarketplaceTag('accelerated');
  }

  @Get('marketplace/approval')
  @ApiOperation({
    summary: 'Startups em aprovação para marketplace',
    description: 'Lista startups em fase de aprovação',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de startups em aprovação',
  })
  async findApprovalPhase() {
    return this.startupService.findByMarketplaceTag('approval');
  }

  @Get('marketplace/all')
  @ApiOperation({
    summary: 'Todas as startups aprobadas para marketplace',
    description: 'Lista todas as startups APPROVED públicas',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista completa de startups',
  })
  async findAllApproved() {
    return this.startupService.findAllPublic();
  }

  // =====================================================
  // PUBLICO - Detail (sem auth)
  // =====================================================

  @Get('marketplace/private/:slug')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Buscar detalhe privado de startup por slug',
    description:
      'Retorna dados autorizados somente ao fundador da startup ou a papéis administrativos',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhe privado encontrado',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findPrivate(
    @Param('slug') slug: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.findPrivate(slug, req.user);
  }

  @Get('marketplace/preview/:slug')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Visualizar preview da startup pelo fundador',
    description:
      'Retorna o preview autorizado do fundador mesmo quando a campanha ainda não está OPEN.',
  })
  @ApiResponse({ status: 200, description: 'Preview encontrado' })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  async findPreview(
    @Param('slug') slug: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.findPreview(slug, req.user);
  }

  @Get('marketplace/authenticated/:slug')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Buscar oportunidade autenticada por slug',
    description:
      'Retorna somente os dados necessários para descoberta e investimento; não expõe o ID interno da startup',
  })
  @ApiResponse({
    status: 200,
    description: 'Oportunidade autenticada encontrada',
  })
  async findAuthenticatedMarketplace(@Param('slug') slug: string) {
    return this.startupService.findAuthenticatedMarketplace(slug);
  }

  @Get('marketplace/public/:slugOrId')
  @ApiOperation({
    summary: 'Buscar startup pública por ID ou slug',
    description: 'Retorna os dados públicos de uma startup com rodada aberta',
  })
  @ApiResponse({
    status: 200,
    description: 'Startup pública encontrada',
  })
  async findPublic(@Param('slugOrId') slugOrId: string) {
    return this.startupService.findPublic(slugOrId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar startup por ID (público)',
    description: 'Retorna detalhes de uma startup específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Startup encontrada',
  })
  async findOne(@Param('id') id: string) {
    return this.startupService.findOne(+id);
  }

  // =====================================================
  // PRIVADO - Criação/Update/Delete (com auth)
  // =====================================================

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Criar nova startup',
    description:
      'Cria uma startup com dados iniciais. O usuário autenticado será o fundador.',
  })
  @ApiResponse({
    status: 201,
    description: 'Startup criada com sucesso',
    content: {
      'application/json': {
        example: {
          nome: 'TechNova',
          razaoSocial: 'TechNova Tecnologia S.A.',
          cnpj: '12345678000195',
          paisIso3: 'BRA',
          areaAtuacao: 'Tecnologia / SaaS',
          estagio: 'seed',
          descricao:
            'Plataforma SaaS para automação de processos financeiros de PMEs.',
          totalTokens: 100000,
          prazoCapitacao: 90,
          logo: 6,
          pitchDeck: 3,
          videoPitch: 'https://www.youtube.com/watch?v=abc123',
          redesSociais: {
            website: 'https://technova.com.br',
            linkedin: 'https://linkedin.com/company/technova',
            instagram: 'https://instagram.com/technova',
            twitter: 'https://x.com/technova',
          },
          dadosBancarios: {
            banco: '341',
            tipoConta: 'corrente',
            agencia: '1234',
            conta: '56789',
            digito: '0',
            titular: 'TechNova Tecnologia S.A.',
            documentoTitular: '12345678000195',
            chavePix: 'financeiro@technova.com.br',
          },
        },
      },
    },
  })
  async create(
    @Body() createStartupDto: CreateStartupOnboardingDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.create(createStartupDto, req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':id/complementary')
  @ApiOperation({
    summary: 'Atualizar dados complementares da startup',
    description:
      'Preenche dados complementares após pagamento da taxa de reserva. Status deve ser >= RESERVATION_PAID.',
  })
  @ApiResponse({ status: 200, description: 'Dados complementares atualizados' })
  @ApiResponse({
    status: 400,
    description: 'Status insuficiente ou dados inválidos',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({ status: 404, description: 'Startup não encontrada' })
  async updateComplementary(
    @Param('id') id: string,
    @Body() data: UpdateComplementaryDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.updateComplementary(+id, data, req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post(':id/verification')
  @ApiOperation({
    summary: 'Solicitar selo "Startup Verificada"',
    description:
      'Solicita o selo de verificação gerando pagamento de R$ 890,00. Forneça IDs dos documentos legais já enviados.',
  })
  @ApiResponse({
    status: 201,
    description: 'Solicitação criada com pagamento pendente',
  })
  @ApiResponse({
    status: 400,
    description: 'Startup já verificada ou dados inválidos',
  })
  @ApiResponse({ status: 403, description: 'Acesso negado' })
  @ApiResponse({
    status: 404,
    description: 'Startup ou documento não encontrado',
  })
  async requestVerification(
    @Param('id') id: string,
    @Body() data: RequestVerificationDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.requestVerification(+id, data, req.user);
  }

  // =====================================================
  // PRIVADO - Apenas founder pode listar/proprias
  // =====================================================

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Listar startups do fundador logado',
    description: 'Retorna apenas as startups do usuário autenticado',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de startups retornada com sucesso. Mantém campos antigos (retrocompat) + summary + tabsCount',
    type: StartupListOverviewResponseEntity,
  })
  async findAll(@Req() req: Request & { user: PayloadEntity }) {
    await this.validateFundador.validateOrThrow(req.user);
    return this.startupService.findAll(req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar startup (Apenas founder)',
    description: 'Atualiza dados de uma startup existente',
  })
  async update(
    @Param('id') id: string,
    @Body() updateStartupDto: UpdateStartupDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    await this.validateFundador.validateOrThrow(req.user);
    return this.startupService.update(+id, updateStartupDto, req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post(':id/complete-stage2')
  @ApiOperation({
    summary: 'Finalizar Fase 2 e enviar para análise do Compliance',
    description:
      'Confirma o envio do cadastro completo e notifica o fundador sobre o prazo de até 3 dias úteis para a pré-análise.',
  })
  async completeStage2(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    const startupId = Number(id);
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true, founderId: true },
    });
    if (!startup) throw new NotFoundException('Startup não encontrada');
    if (startup.founderId !== req.user.id) {
      throw new ForbiddenException('Acesso não permitido');
    }

    this.events.emit('startup.stage2.completed', { startupId });
    return ResponseDto.success(
      'Fase 2 enviada para análise do Compliance',
      200,
      { startupId, status: 'PENDING_COMPLIANCE_REVIEW' },
    );
  }

  /**
   * BUG-FT-004 (B1) — Finaliza o lançamento da Fase 3 (Detalhes de Captação
   *  preenchidos, campanha DRAFT) e emite `startup.stage3.completed` para
   *  disparar a comunicação de pendência da Taxa de Compliance ao founder.
   *
   *  Sem este endpoint, o listener `onStage3Completed` em
   *  `StartupNotificationService` ficava órfão (evento nunca era emitido) e a
   *  notificação/e-mail da Taxa de Compliance nunca chegava ao founder.
   *
   *  Padrão espelhado de `completeStage2` (AuthGuard + ownership + emit).
   */
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post(':id/complete-stage3')
  @ApiOperation({
    summary: 'Finalizar Fase 3 (Detalhes de Captação) e enviar para validação',
    description:
      'Confirma o envio da campanha DRAFT preenchida. Dispara a notificação de pendência da Taxa de Compliance + e-mail `startup-pagamento-confirmado` ao founder.',
  })
  async completeStage3(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    const startupId = Number(id);
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: { id: true, founderId: true },
    });
    if (!startup) throw new NotFoundException('Startup não encontrada');
    if (startup.founderId !== req.user.id) {
      throw new ForbiddenException('Acesso não permitido');
    }

    this.events.emit('startup.stage3.completed', { startupId });
    return ResponseDto.success(
      'Fase 3 enviada para validação do Compliance',
      200,
      { startupId, status: 'PENDING_PHASE3_REVIEW' },
    );
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post(':id/resubmit')
  async resubmit(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    await this.validateFundador.validateOrThrow(req.user);
    return this.startupService.resubmit(+id, req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover startup (Apenas founder)',
    description: 'Remove uma startup existente',
  })
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    await this.validateFundador.validateOrThrow(req.user);
    return this.startupService.remove(+id, req.user);
  }

  // =====================================================
  // FOUNDER DASHBOARD METRICS
  // =====================================================

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Get('dashboard/metrics')
  @ApiOperation({
    summary: 'Métricas do dashboard do founder',
    description:
      'Retorna investor_count, amount_raised, days_remaining, average_progress',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas retornadas com sucesso',
    schema: {
      example: {
        success: true,
        data: {
          investor_count: 42,
          amount_raised: 150000,
          days_remaining: 30,
          total_campaigns: 3,
          open_campaigns: 1,
          average_progress: 65,
        },
      },
    },
  })
  async getDashboardMetrics(@Req() req: Request & { user: PayloadEntity }) {
    await this.validateFundador.validateOrThrow(req.user);
    return this.startupService.getFounderDashboardMetrics(req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Get(':id/investors')
  @ApiOperation({
    summary: 'Lista investidores (CONFIRMED) de uma startup',
    description:
      'Retorna nome + email (LGPD-safe) + total investido + total de tokens por investidor. Apenas founder owner ou ADMIN.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de investidores retornada com sucesso',
  })
  @ApiResponse({ status: 403, description: 'Sem permissao' })
  @ApiResponse({ status: 404, description: 'Startup nao encontrada' })
  async getStartupInvestors(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.findStartupInvestors(+id, req.user);
  }

  // ==========================================
  // Auto-save Drafts
  // ==========================================

  @Post('draft')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Salvar rascunho da startup do usuário autenticado',
  })
  async saveCurrentDraft(
    @Body() data: any,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.saveDraft(req.user.id, data);
  }

  @Post(':id/draft')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Salvar rascunho da startup',
    description: `Salva o rascunho atual da startup para recuperação posterior.
    
**Auto-save**: O frontend executa este endpoint a cada 30 segundos enquanto o usuário edita o formulário.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Rascunho salvo com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Rascunho salvo automaticamente',
        codigo: 200,
        data: { savedAt: '2026-05-02T10:00:00.000Z' },
      },
    },
  })
  async saveDraft(
    @Param('id') id: string,
    @Body() data: any,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.saveDraft(req.user.id, data);
  }

  @Get('draft')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Recuperar rascunho da startup',
    description: 'Recupera o último rascunho salvo do usuário.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rascunho recuperado.',
    schema: {
      example: {
        error: false,
        message: 'Rascunho recuperado',
        codigo: 200,
        data: { data: {}, savedAt: '2026-05-02T10:00:00.000Z' },
      },
    },
  })
  async getDraft(@Req() req: Request & { user: PayloadEntity }) {
    return this.startupService.getDraft(req.user.id);
  }

  @Delete('draft')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @ApiOperation({
    summary: 'Remover rascunho',
    description: 'Remove o rascunho após submissão da startup.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rascunho removido.',
  })
  async deleteDraft(@Req() req: Request & { user: PayloadEntity }) {
    return this.startupService.deleteDraft(req.user.id);
  }

  // =====================================================
  // ROUND ACTIONS (T107, T108)
  // =====================================================

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':startupId/rodada/:rodadaId/pausar')
  @ApiOperation({
    summary: 'Pausar rodada (T107)',
    description:
      'Pausa uma rodada de captação. Validacao: roundStatus deve ser "ativa". Retorna 409 se estado invalido.',
  })
  @ApiResponse({ status: 200, description: 'Rodada pausada com sucesso' })
  @ApiResponse({ status: 404, description: 'Startup ou rodada nao encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Acao nao permitida para o estado atual',
  })
  async pauseRound(
    @Param('startupId') startupId: string,
    @Param('rodadaId') rodadaId: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.pauseRound(+startupId, +rodadaId, req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':startupId/rodada/:rodadaId/cancelar')
  @ApiOperation({
    summary: 'Cancelar rodada (T108)',
    description:
      'Cancela uma rodada de captação. Validacao: roundStatus deve ser "criada_aguardando_reserva" ou "pausada". Retorna 409 se estado invalido.',
  })
  @ApiResponse({ status: 200, description: 'Rodada cancelada com sucesso' })
  @ApiResponse({ status: 404, description: 'Startup ou rodada nao encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Acao nao permitida para o estado atual',
  })
  async cancelRound(
    @Param('startupId') startupId: string,
    @Param('rodadaId') rodadaId: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupService.cancelRound(+startupId, +rodadaId, req.user);
  }
}
