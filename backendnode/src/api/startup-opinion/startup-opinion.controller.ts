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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { CreateStartupOpinionDto } from './dto/create-startup-opinion.dto';
import { UpdateStartupOpinionDto } from './dto/update-startup-opinion.dto';
import { StartupOpinionService } from './startup-opinion.service';

@ApiTags('Startup Opinion')
@Controller('startup-opinion')
export class StartupOpinionController {
  constructor(private readonly startupOpinionService: StartupOpinionService) {}

  // =====================================================
  // PUBLICO - Listar todas as opiniões (depoimentos)
  // =====================================================

  @Get()
  @ApiOperation({
    summary: 'Listar todas as opiniões (depoimentos)',
    description:
      'Retorna lista paginada de opiniões com limite padrão de 6, configurável via ?limit=N',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de opiniões retornada com sucesso',
  })
  async findAll(@Query('limit') limit?: string) {
    return this.startupOpinionService.findAllGeneral(
      limit ? parseInt(limit, 10) : 6,
    );
  }

  // =====================================================
  // PUBLICO - Listar opiniões por startup
  // =====================================================

  @Get('startup/:startupId')
  @ApiOperation({
    summary: 'Listar opiniões de uma startup',
    description: 'Retorna todas as opiniões ativas de uma startup específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de opiniões retornada com sucesso',
  })
  async findByStartup(@Param('startupId') startupId: string) {
    return this.startupOpinionService.findAll(startupId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar opinião por ID',
    description: 'Retorna uma opinião específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Opinião retornada com sucesso',
  })
  async findOne(@Param('id') id: string) {
    return this.startupOpinionService.findOne(+id);
  }

  // =====================================================
  // PRIVADO - Criar/Atualizar/Remover opinião (com auth)
  // =====================================================

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Criar nova opinião para uma startup',
    description: 'Cria uma opinião/review para uma startup específica',
  })
  @ApiResponse({
    status: 201,
    description: 'Opinião criada com sucesso',
  })
  async create(
    @Body() createDto: CreateStartupOpinionDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupOpinionService.create(createDto);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar opinião',
    description: 'Atualiza uma opinião existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Opinião atualizada com sucesso',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateStartupOpinionDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupOpinionService.update(+id, updateDto);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover opinião',
    description: 'Remove uma opinião (soft delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Opinião removida com sucesso',
  })
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.startupOpinionService.remove(+id);
  }
}
