import {
  Body,
  Controller,
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
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { ActionCampaignDto } from './dto/action-campaign.dto';
import { CreateNewRoundDto } from './dto/create-new-round.dto';
import { QueryCampaignsDto } from './dto/query-campaigns.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { UpdateResourcesDto } from './dto/update-resources.dto';
import { CampaignResourceService } from './service/campaign-resource.service';
import { CampaignsCreateService } from './service/campaigns-create.service';
import { CampaignsCrudService } from './service/campaigns-crud.service';
import { CampaignsStateService } from './service/campaigns-state.service';

@ApiTags('Campanhas')
@Controller('campaigns')
export class CampaignsController {
  constructor(
    private readonly crud: CampaignsCrudService,
    private readonly create: CampaignsCreateService,
    private readonly state: CampaignsStateService,
    private readonly resources: CampaignResourceService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as campanhas' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'FUNDED', 'PAID_OUT'],
  })
  findAll(@Query() query: QueryCampaignsDto) {
    return this.crud.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar campanha por ID' })
  @ApiParam({ name: 'id', type: Number })
  findOne(@Param('id') id: string) {
    return this.crud.findOne(+id);
  }

  @Get(':id/checkout')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Dados de checkout para campanha (requer auth)' })
  @ApiParam({ name: 'id', type: Number })
  getCheckoutData(@Param('id') id: string) {
    return this.crud.getCheckoutData(+id);
  }

  /**
   * S01.2b - POST /campaigns/:startupId
   * Cria a PRIMEIRA campanha da startup (sem regra B05).
   * Status inicial: DRAFT (admin precisa aprovar antes de virar OPEN).
   */
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post(':startupId')
  @ApiOperation({
    summary: 'Criar primeira campanha da startup',
    description:
      'Cria a 1a campanha em status DRAFT (sem regra B05). Bloqueia se ja existe qualquer campanha previa para a startup.',
  })
  @ApiParam({ name: 'startupId', type: Number })
  async createFirstCampaign(
    @Param('startupId') startupId: string,
    @Body() dto: CreateNewRoundDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.create.createFirstCampaign(+startupId, dto, req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post(':startupId/new-round')
  @ApiOperation({
    summary: 'Solicitar nova rodada para uma startup',
    description:
      'Aplica regra M5 B05: so permite nova rodada se a anterior foi 100% vendida + 3 meses de intervalo.',
  })
  @ApiParam({ name: 'startupId', type: Number })
  async requestNewRound(
    @Param('startupId') startupId: string,
    @Body() dto: CreateNewRoundDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.create.requestNewRound(+startupId, dto, req.user);
  }

  /**
   * S01.2b - PATCH /campaigns/:id/draft
   * Edita campanha APENAS em status DRAFT.
   * Recalcula snapshots financeiros (ADR-008) se targetAmount/totalTokens mudarem.
   */
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':id/draft')
  @ApiOperation({
    summary: 'Editar campanha em status DRAFT',
    description:
      'Permite editar campos da campanha enquanto status === DRAFT. Recalcula snapshots financeiros (ADR-008) se targetAmount/totalTokens mudarem.',
  })
  @ApiParam({ name: 'id', type: Number })
  async updateDraft(
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.state.updateDraft(
      +id,
      dto,
      req.user,
      (req.headers['x-forwarded-for'] as string) ||
        (req.headers['x-real-ip'] as string) ||
        undefined,
      req.headers['user-agent'],
    );
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':id/action')
  @ApiOperation({
    summary: 'Executar acao em campanha (state machine)',
    description:
      'OPEN -> PAUSE; PAUSED -> RESUME|FINISH; CLOSED -> FINISH; FUNDED -> nenhuma.',
  })
  @ApiParam({ name: 'id', type: Number })
  async executeAction(
    @Param('id') id: string,
    @Body() dto: ActionCampaignDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.state.executeAction(+id, dto.action, req.user);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar status da campanha (legado, use /action)',
    description:
      'PATCH generico bloqueado em campanhas CLOSED ou FUNDED (use PATCH /:id/action).',
  })
  @ApiParam({ name: 'id', type: Number })
  async update(
    @Param('id') id: string,
    @Body() dto: { status?: string },
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.state.update(
      +id,
      dto,
      req.user,
      (req.headers['x-forwarded-for'] as string) ||
        (req.headers['x-real-ip'] as string) ||
        undefined,
      req.headers['user-agent'],
    );
  }

  /**
   * Lista alocacoes de recursos de uma campanha.
   *
   * @param id - ID da campanha
   * @returns Lista de alocacoes ordenadas por categoria
   */
  /**
   * Lista alocacoes publicas somente de campanhas publicadas.
   */
  @Get(':id/resources')
  @ApiOperation({
    summary: 'Listar alocacoes publicas de recursos da campanha',
  })
  @ApiParam({ name: 'id', type: Number })
  getResources(@Param('id') id: string) {
    return this.resources.findByCampaign(+id);
  }

  /**
   * Lista alocacoes de uma campanha para o founder owner ou papel administrativo.
   */
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Get(':id/resources/private')
  @ApiOperation({
    summary: 'Listar alocacoes privadas de recursos da campanha',
  })
  @ApiParam({ name: 'id', type: Number })
  getPrivateResources(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.resources.findByCampaignForUser(+id, req.user);
  }

  /**
   * Substitui todas as alocacoes de recursos de uma campanha (atomico).
   *
   * @param id - ID da campanha
   * @param dto - DTO com array de resourceAllocations (soma = 100%)
   * @returns Lista das alocacoes criadas
   */
  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Put(':id/resources')
  @ApiOperation({
    summary: 'Substituir alocacoes de recursos da campanha',
    description:
      'Substitui atomicamente todas as alocacoes. Soma dos percentuais deve ser 100%.',
  })
  @ApiParam({ name: 'id', type: Number })
  async updateResources(
    @Param('id') id: string,
    @Body() dto: UpdateResourcesDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.resources.replaceAll(+id, dto.resourceAllocations, req.user);
  }
}
