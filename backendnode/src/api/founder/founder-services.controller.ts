/**
 * Founder Services Controller
 *
 * Lista o catálogo de serviços disponíveis para o fundador contratar.
 * Lê do model `Service` (Prisma) — filtrando apenas `available=true`.
 * Endpoint público (só AuthGuard, sem AdminGuard).
 *
 * O frontend faz cache 5min via TanStack Query (`useFounderServices`).
 */

import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { ResponseDto } from '../../common/dto/response.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('founder/services')
@UseGuards(AuthGuard)
@ApiCookieAuth()
@ApiTags('Founder - Serviços')
export class FounderServicesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'Catálogo de serviços disponíveis para o fundador',
    description:
      'Retorna os serviços com `available=true`, ordenados por `order ASC, id ASC`. Serviços marcados com `highlight=true` aparecem no topo da lista.',
  })
  @ApiResponse({ status: 200, description: 'Lista de serviços retornada' })
  async list() {
    const services = await this.prisma.service.findMany({
      where: { available: true },
      orderBy: [{ order: 'asc' }, { id: 'asc' }],
    });
    return ResponseDto.success('Catálogo de serviços', 200, services);
  }
}
