/**
 * Admin Services Controller
 *
 * CRUD do catálogo de serviços que o founder pode contratar para suas
 * startups (TOKEN_RESERVATION, COMPLIANCE_FEE, VERIFICATION_SEAL,
 * TOKEN_RESERVATION_EXTENSION, EARLY_ACCESS, etc).
 *
 * Endpoints:
 *   GET    /admin/services             - lista todos (com filtro ?available)
 *   GET    /admin/services/:id         - detalhe
 *   POST   /admin/services             - criar
 *   PATCH  /admin/services/:id         - atualizar
 *   DELETE /admin/services/:id         - deletar
 *
 * O backend expoe em `services` (slug unico) e o frontend founder lê via
 * `/founder/services` (rota publica com só AuthGuard).
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminGuard } from '../../auth/admin.guard';
import { ResponseDto } from '../../common/dto/response.dto';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateServiceDto {
  slug: string;
  name: string;
  shortDesc?: string;
  description: string;
  benefits?: string[];
  category: string;
  paymentPurpose: string;
  price?: number;
  currency?: string;
  highlight?: boolean;
  available?: boolean;
  order?: number;
  requiresCampaignStatus?: string[];
  endpoint?: string;
}

interface UpdateServiceDto extends Partial<CreateServiceDto> {}

@Controller('admin/services')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - Serviços')
export class AdminServicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os serviços do catálogo',
    description:
      'Retorna todos os serviços (incluindo os desabilitados). Use ?available=true para filtrar os habilitados.',
  })
  @ApiQuery({
    name: 'available',
    required: false,
    schema: { type: 'boolean' },
    description: 'Filtrar apenas serviços disponíveis para o founder',
  })
  async list(@Query('available') available?: string) {
    const where =
      available === 'true'
        ? { available: true }
        : available === 'false'
          ? { available: false }
          : {};
    const services = await this.prisma.service.findMany({
      where,
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    return ResponseDto.success('Serviços listados', 200, services);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um serviço' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const svc = await this.prisma.service.findUnique({ where: { id } });
    if (!svc) return ResponseDto.error('Serviço não encontrado', 404);
    return ResponseDto.success('Serviço encontrado', 200, svc);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar novo serviço no catálogo',
    description:
      'Adiciona um serviço que o founder pode contratar. O `slug` deve ser único (ex.: `meu-servico-vip`).',
  })
  async create(@Body() dto: CreateServiceDto) {
    const created = await this.prisma.service.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        shortDesc: dto.shortDesc ?? null,
        description: dto.description,
        benefits: dto.benefits ? JSON.stringify(dto.benefits) : null,
        category: dto.category,
        paymentPurpose: dto.paymentPurpose,
        price: dto.price ?? null,
        currency: dto.currency ?? 'BRL',
        highlight: dto.highlight ?? false,
        available: dto.available ?? true,
        order: dto.order ?? 0,
        requiresCampaignStatus: dto.requiresCampaignStatus
          ? JSON.stringify(dto.requiresCampaignStatus)
          : null,
        endpoint: dto.endpoint ?? null,
      },
    });
    return ResponseDto.success('Serviço criado', 201, created);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar serviço existente' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceDto,
  ) {
    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.shortDesc !== undefined && { shortDesc: dto.shortDesc }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.benefits !== undefined && {
          benefits: dto.benefits ? JSON.stringify(dto.benefits) : null,
        }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.paymentPurpose !== undefined && {
          paymentPurpose: dto.paymentPurpose,
        }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.highlight !== undefined && { highlight: dto.highlight }),
        ...(dto.available !== undefined && { available: dto.available }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.requiresCampaignStatus !== undefined && {
          requiresCampaignStatus: dto.requiresCampaignStatus
            ? JSON.stringify(dto.requiresCampaignStatus)
            : null,
        }),
        ...(dto.endpoint !== undefined && { endpoint: dto.endpoint }),
      },
    });
    return ResponseDto.success('Serviço atualizado', 200, updated);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar serviço do catálogo' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.prisma.service.delete({ where: { id } });
    return ResponseDto.success('Serviço deletado', 200, { id });
  }
}
