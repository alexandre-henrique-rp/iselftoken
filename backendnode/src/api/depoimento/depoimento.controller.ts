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
import { CreateDepoimentoDto } from './dto/create-depoimento.dto';
import { UpdateDepoimentoDto } from './dto/update-depoimento.dto';
import { DepoimentoService } from './depoimento.service';

@ApiTags('Depoimento')
@Controller('depoimento')
export class DepoimentoController {
  constructor(private readonly depoimentoService: DepoimentoService) {}

  // =====================================================
  // PUBLICO - Listar todos os depoimentos
  // =====================================================

  @Get()
  @ApiOperation({
    summary: 'Listar todos os depoimentos',
    description:
      'Retorna lista de depoimentos com limite padrão de 6, configurável via ?limit=N',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de depoimentos retornada com sucesso',
  })
  async findAll(@Query('limit') limit?: string) {
    return this.depoimentoService.findAllGeneral(
      limit ? parseInt(limit, 10) : 6,
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar depoimento por ID',
    description: 'Retorna um depoimento específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Depoimento retornado com sucesso',
  })
  async findOne(@Param('id') id: string) {
    return this.depoimentoService.findOne(+id);
  }

  // =====================================================
  // PRIVADO - Criar/Atualizar/Remover depoimento (com auth)
  // =====================================================

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Criar novo depoimento',
    description: 'Cria um novo depoimento no sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Depoimento criado com sucesso',
  })
  async create(
    @Body() createDto: CreateDepoimentoDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.depoimentoService.create(createDto);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar depoimento',
    description: 'Atualiza um depoimento existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Depoimento atualizado com sucesso',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateDepoimentoDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.depoimentoService.update(+id, updateDto);
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Remover depoimento',
    description: 'Remove um depoimento (soft delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Depoimento removido com sucesso',
  })
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    return this.depoimentoService.remove(+id);
  }
}
