import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import { AffiliateService } from './affiliate.service';
import { AffiliateCommissionService } from './affiliate-commission.service';
import { AffiliateGuard } from './affiliate.guard';
import {
  CreateAffiliateProgramDto,
  DecideAffiliateProgramDto,
  DecideAffiliationDto,
  TrackReferralDto,
  UpdateCommissionStatusDto,
} from './dto/affiliate.dto';

// ==========================================
// AFILIADO — vitrine, candidatura e painel
// ==========================================

@ApiTags('Afiliados')
@ApiCookieAuth()
@Controller('affiliate')
@UseGuards(AuthGuard)
export class AffiliateController {
  constructor(
    private readonly affiliateService: AffiliateService,
    private readonly commissionService: AffiliateCommissionService,
  ) {}

  @Get('programs')
  @ApiOperation({
    summary: 'Startups abertas a candidatura de afiliados',
    description:
      'Lista os programas APPROVED. Não exige plano de afiliado — serve de vitrine.',
  })
  async listOpenPrograms() {
    return this.affiliateService.listOpenPrograms();
  }

  @Post('programs/:programId/apply')
  @UseGuards(AffiliateGuard)
  @ApiOperation({
    summary: 'Candidatar-se a afiliado de uma startup',
    description:
      'Exige papel FOUNDER ou INVESTOR e assinatura ACTIVE do plano AFILIADO. ' +
      'A candidatura nasce em PENDING_FOUNDER.',
  })
  async apply(
    @Param('programId', ParseIntPipe) programId: number,
    @Req() req: any,
  ) {
    return this.affiliateService.apply(programId, req.user.id);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Minhas afiliações',
    description: 'Códigos, links de compra, indicados e total comissionado.',
  })
  async listMine(@Req() req: any) {
    return this.affiliateService.listMine(req.user.id);
  }

  @Get('me/commissions')
  @ApiOperation({ summary: 'Minhas comissões' })
  @ApiQuery({ name: 'status', required: false })
  async listMyCommissions(@Req() req: any, @Query('status') status?: string) {
    return this.commissionService.listMine(req.user.id, status);
  }

  @Post('track')
  @ApiOperation({
    summary: 'Registrar indicação a partir do link do afiliado',
    description:
      'Grava o vínculo investidor↔afiliado. Idempotente: repetir o mesmo par não duplica.',
  })
  async track(@Body() dto: TrackReferralDto, @Req() req: any) {
    return this.commissionService.trackReferral(dto.code, req.user.id);
  }
}

// ==========================================
// FUNDADOR — adesão da startup e triagem
// ==========================================

@ApiTags('Afiliados — Fundador')
@ApiCookieAuth()
@Controller('founder/affiliate')
@UseGuards(AuthGuard)
export class FounderAffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @Post('startups/:startupId/program')
  @ApiOperation({
    summary: 'Aderir ao programa de afiliados',
    description:
      'Só para startups APPROVED. A adesão fica PENDING até a análise da iSelfToken.',
  })
  async requestProgram(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Body() dto: CreateAffiliateProgramDto,
    @Req() req: any,
  ) {
    return this.affiliateService.requestProgram(startupId, req.user.id, dto);
  }

  @Get('startups/:startupId/program')
  @ApiOperation({ summary: 'Consultar a adesão da minha startup' })
  async getProgram(@Param('startupId', ParseIntPipe) startupId: number) {
    return this.affiliateService.getProgramByStartup(startupId);
  }

  @Get('affiliations')
  @ApiOperation({ summary: 'Candidaturas às minhas startups' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Ex.: PENDING_FOUNDER',
  })
  @ApiQuery({
    name: 'startupId',
    required: false,
    type: Number,
    description: 'Filtra candidaturas de uma startup específica',
  })
  async listAffiliations(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('startupId') startupId?: string,
  ) {
    return this.affiliateService.listAffiliationsForFounder(req.user.id, {
      status,
      startupId: startupId ? Number(startupId) : undefined,
    });
  }

  @Post('affiliations/:id/decide')
  @ApiOperation({
    summary: 'Triar uma candidatura',
    description:
      'Aprovar exige tokensAllocated (validado contra os tokens disponíveis) e ' +
      'encaminha para a iSelfToken (PENDING_ADMIN); não ativa o afiliado.',
  })
  async decide(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideAffiliationDto,
    @Req() req: any,
  ) {
    return this.affiliateService.founderDecide(id, req.user.id, dto);
  }
}

// ==========================================
// ADMIN iSelfToken — aprovações e comissões
// ==========================================

@ApiTags('Afiliados — Admin')
@ApiCookieAuth()
@Controller('admin/affiliate')
@UseGuards(AuthGuard, AdminGuard)
export class AdminAffiliateController {
  constructor(
    private readonly affiliateService: AffiliateService,
    private readonly commissionService: AffiliateCommissionService,
  ) {}

  @Get('programs')
  @ApiOperation({ summary: 'Adesões de startups ao programa' })
  @ApiQuery({ name: 'status', required: false, description: 'Ex.: PENDING' })
  async listPrograms(@Query('status') status?: string) {
    return this.affiliateService.listPrograms(status);
  }

  @Post('programs/:id/decide')
  @ApiOperation({
    summary: 'Aprovar ou rejeitar a adesão de uma startup',
    description:
      'Na aprovação é possível fixar os percentuais definitivos, sobrepondo os sugeridos pelo fundador.',
  })
  async decideProgram(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideAffiliateProgramDto,
    @Req() req: any,
  ) {
    return this.affiliateService.decideProgram(id, req.user.id, dto);
  }

  @Get('affiliations')
  @ApiOperation({ summary: 'Candidaturas de afiliados' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Ex.: PENDING_ADMIN',
  })
  async listAffiliations(@Query('status') status?: string) {
    return this.affiliateService.listAffiliationsForAdmin(status);
  }

  @Post('affiliations/:id/decide')
  @ApiOperation({
    summary: 'Aval final e preparação de tokens/link',
    description:
      'Aprovar ativa a afiliação, grava os tokens alocados e gera o link de compra com o código do afiliado.',
  })
  async decideAffiliation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DecideAffiliationDto,
    @Req() req: any,
  ) {
    return this.affiliateService.adminDecide(id, req.user.id, dto);
  }

  @Get('commissions')
  @ApiOperation({ summary: 'Comissões apuradas' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startupId', required: false, type: Number })
  async listCommissions(
    @Query('status') status?: string,
    @Query('startupId') startupId?: string,
  ) {
    return this.commissionService.listAll({
      status,
      startupId: startupId ? Number(startupId) : undefined,
    });
  }

  @Post('commissions/:id/status')
  @ApiOperation({
    summary: 'Mudar o status de uma comissão',
    description:
      'PAID credita o valor na carteira do afiliado na mesma transação.',
  })
  async updateCommissionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommissionStatusDto,
  ) {
    return this.commissionService.updateStatus(id, dto);
  }
}
