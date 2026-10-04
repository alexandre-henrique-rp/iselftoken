import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AssignSealDto, CreateSealDto, UpdateSealDto } from './dto/seal.dto';
import { SealsService } from './seals.service';

@Controller('admin/seals')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Seals')
export class AdminSealsController {
  constructor(private readonly service: SealsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        slug: { type: 'string', example: 'novo_selo' },
        name: { type: 'string', example: 'Novo Selo' },
        description: { type: 'string' },
        category: {
          type: 'string',
          enum: [
            'STAGE',
            'VERIFICATION',
            'PARTNERSHIP',
            'ACHIEVEMENT',
            'CUSTOM',
          ],
        },
      },
      required: ['image', 'slug', 'name'],
    },
  })
  @ApiOperation({
    summary: 'Criar novo selo (com upload de imagem PNG)',
    description:
      'Cria um novo tipo de selo no catálogo. Salva o PNG em backend/icons/<slug>.png e ' +
      'insere a entry correspondente. Imagem máxima: 200KB. Slug deve casar com /^[a-z0-9_]+$/.',
  })
  @ApiResponse({ status: 201, description: 'Selo criado com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Imagem ausente, formato inválido ou slug inválido.',
  })
  @ApiResponse({ status: 409, description: 'Slug já existe.' })
  async create(
    @UploadedFile()
    image: { buffer: Buffer; mimetype: string; size: number } | undefined,
    @Body() dto: CreateSealDto,
  ) {
    return this.service.createCustom(image, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar metadados de um selo',
    description:
      'Atualiza name, description ou active. Para trocar a imagem, delete e recrie.',
  })
  @ApiParam({ name: 'id', type: Number })
  async update(@Param('id') id: string, @Body() dto: UpdateSealDto) {
    return this.service.updateMeta(+id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar todos os selos (incluindo inativos) para painel compliance',
    description:
      'Retorna TODOS os selos cadastrados com status, contagem de atribuições e categoria. ' +
      'Diferente do /seals público, este endpoint requer role COMPLIANCE/ADMIN e inclui inativos.',
  })
  async listAll() {
    return this.service.listAllForAdmin();
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Desativar um selo (soft-delete)',
    description:
      'Marca active=false. Atribuições existentes em StartupSeal são mantidas.',
  })
  @ApiParam({ name: 'id', type: Number })
  async softDelete(@Param('id') id: string) {
    return this.service.softDelete(+id);
  }

  @Post('startup/:id')
  @ApiOperation({
    summary: 'Atribuir selo a uma startup',
    description:
      'Body: { sealSlug, metadata? }. issuedBy é registrado a partir do admin autenticado.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da startup' })
  async assign(@Param('id') id: string, @Body() dto: AssignSealDto) {
    // TODO: extrair issuedBy do request.user quando disponível.
    const issuedBy = 1;
    return this.service.assignToStartup(+id, dto, issuedBy);
  }

  @Delete('startup/:startupId/:sealId')
  @ApiOperation({
    summary: 'Remover selo de uma startup',
  })
  @ApiParam({ name: 'startupId', type: Number })
  @ApiParam({ name: 'sealId', type: Number })
  async remove(
    @Param('startupId') startupId: string,
    @Param('sealId') sealId: string,
  ) {
    return this.service.removeFromStartup(+startupId, +sealId);
  }

  @Get('startup/:id')
  @ApiOperation({
    summary: 'Listar selos atribuídos a uma startup (admin view, com issuedBy)',
  })
  @ApiParam({ name: 'id', type: Number })
  async listForStartup(@Param('id') id: string) {
    return this.service.getByStartup(+id);
  }
}
