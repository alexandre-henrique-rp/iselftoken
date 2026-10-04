import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorEntity } from 'src/common/dto/error.entity';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { ResponseEntity } from 'src/common/entities/response.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanEntity } from './entities/plan.entity';
import { AdminValidateService } from './services/admi-validate.service';
import { PlansService } from './services/plans.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { SkipSessionFilter } from 'src/common/decorators/skip-session-filter.decorator';

@Controller('plans')
@ApiExtraModels(ResponseEntity, PlanEntity)
@ApiTags('Planos')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly adminValidateService: AdminValidateService,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Criar plano',
    description: 'Cria um novo plano (apenas ADMIN).',
  })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({
    status: 200,
    description: 'Plano criado com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: { $ref: getSchemaPath(PlanEntity) },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Acesso restrito para administradores.',
    type: ErrorEntity,
  })
  create(
    @Body() createPlanDto: CreatePlanDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    this.adminValidateService.validate(req.user);
    return this.plansService.create(createPlanDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Listar planos',
    description: 'Lista planos ativos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Planos encontrados com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: {
              type: 'array',
              items: { $ref: getSchemaPath(PlanEntity) },
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Planos não encontrados.',
    type: ErrorEntity,
  })
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @SkipSessionFilter()
  @ApiCookieAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Buscar plano por ID',
    description: 'Retorna um plano específico.',
  })
  @ApiParam({ name: 'id', description: 'ID do plano', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Plano encontrado com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: { $ref: getSchemaPath(PlanEntity) },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Plano não encontrado.',
    type: ErrorEntity,
  })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Atualizar plano',
    description: 'Atualiza um plano existente (apenas ADMIN).',
  })
  @ApiParam({ name: 'id', description: 'ID do plano', example: 1 })
  @ApiBody({ type: UpdatePlanDto })
  @ApiResponse({
    status: 200,
    description: 'Plano atualizado com sucesso.',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ResponseEntity) },
        {
          properties: {
            data: { $ref: getSchemaPath(PlanEntity) },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Acesso restrito para administradores.',
    type: ErrorEntity,
  })
  update(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdatePlanDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    this.adminValidateService.validate(req.user);
    return this.plansService.update(+id, updatePlanDto);
  }

  @Get('admin/all')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Listar TODOS os planos (incluindo inativos) — apenas ADMIN',
    description:
      'Retorna planos ativos e inativos com contagem de assinantes ativos ' +
      'por plano. Usado pelo painel /financeiro/plans.',
  })
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Req() req?: Request & { user: PayloadEntity },
  ) {
    this.adminValidateService.validate(req!.user);
    return this.plansService.findAllForAdmin({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get(':id/stats')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Estatísticas de um plano — apenas ADMIN',
    description:
      'Retorna activeSubscribers (count), totalRevenue e MRR ' +
      '(totalRevenue / periodoMeses). Usado pela página /financeiro/plans/:id.',
  })
  async getStats(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    this.adminValidateService.validate(req.user);
    return this.plansService.getStats(+id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Remover plano',
    description: 'Desativa um plano (apenas ADMIN).',
  })
  @ApiParam({ name: 'id', description: 'ID do plano', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Plano deletado com sucesso.',
    type: ResponseEntity,
  })
  @ApiResponse({
    status: 401,
    description: 'Acesso restrito para administradores.',
    type: ErrorEntity,
  })
  remove(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    this.adminValidateService.validate(req.user);
    return this.plansService.remove(+id);
  }
}
