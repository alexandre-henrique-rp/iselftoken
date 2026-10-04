/**
 * SplitController - Endpoints REST para gestão de SplitConfig.
 *
 * Rotas:
 * - POST   /payment/split          - Criar config de split (ADMIN/FINANCEIRO)
 * - GET    /payment/split          - Listar splits ativos (cached)
 * - GET    /payment/split/:id      - Buscar split por ID
 * - PATCH  /payment/split/:id      - Atualizar split (ADMIN/FINANCEIRO)
 * - DELETE /payment/split/:id      - Desativar split (soft delete, ADMIN/FINANCEIRO)
 *
 * @controller SplitController
 */
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/admin.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { CreateSplitDto } from './dto/create-split.dto';
import { UpdateSplitDto } from './dto/update-split.dto';
import { SplitService } from './split.service';

@ApiTags('Split')
@Controller('payment/split')
@UseGuards(AuthGuard, AdminGuard)
@ApiBearerAuth()
export class SplitController {
  constructor(private readonly splitService: SplitService) {}

  /**
   * Cria uma nova configuração de split.
   * Requer role ADMIN ou FINANCEIRO.
   */
  @Post()
  @ApiOperation({ summary: 'Cria configuração de split' })
  create(@Body() dto: CreateSplitDto) {
    return this.splitService.create(dto);
  }

  /**
   * Lista splits ativos (cache Redis 5min).
   */
  @Get()
  @ApiOperation({ summary: 'Lista splits ativos' })
  listActive() {
    return this.splitService.listActive();
  }

  /**
   * Busca split pelo ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Busca split por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.splitService.findOne(id);
  }

  /**
   * Atualiza uma configuração de split existente.
   * Requer role ADMIN ou FINANCEIRO.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza split' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSplitDto) {
    return this.splitService.update(id, dto);
  }

  /**
   * Desativa split (soft delete).
   * Requer role ADMIN ou FINANCEIRO.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativa split (soft delete)' })
  async deactivate(@Param('id', ParseIntPipe) id: number) {
    await this.splitService.deactivate(id);
  }
}
