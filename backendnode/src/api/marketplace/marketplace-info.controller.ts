/**
 * S2-T05 — MarketplaceInfoController
 *
 * GET /startups/:id/marketplace-info
 *
 * Retorna score + breakdown + pin info de uma startup.
 * Auth: AuthGuard + ownership check (founder da startup ou ADMIN/COMPLIANCE).
 */

import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import type { Request } from 'express';
import { MarketplaceInfoDto } from './dto/marketplace-info.dto';

@ApiTags('Marketplace - Info')
@Controller('startups')
@UseGuards(AuthGuard)
export class MarketplaceInfoController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id/marketplace-info')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Informacoes de marketplace da startup (score + breakdown + pin)',
    description:
      'Retorna score 0..100, breakdown de 9 chaves, info de pin manual e timestamp. ' +
      'Acesso: ADMIN, COMPLIANCE ou founder da propria startup (RF-09).',
  })
  async getInfo(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<ResponseDto<MarketplaceInfoDto>> {
    const user = (req as any).user as { id: number; role: string } | undefined;
    if (!user?.id) {
      throw new ForbiddenException('Sessao invalida');
    }

    const startup: any = await this.prisma.startup.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        founderId: true,
        score: true,
        scoreBreakdown: true,
        scoreLastCalculatedAt: true,
        manuallyPinned: true,
        manuallyPinnedBy: true,
        manuallyPinnedAt: true,
        manuallyPinnedReason: true,
      },
    });

    if (!startup) {
      throw new NotFoundException('Startup nao encontrada');
    }

    const isOwner = startup.founderId === user.id;
    const isPrivileged = ['ADMIN', 'COMPLIANCE', 'FINANCEIRO'].includes(
      user.role,
    );

    if (!isOwner && !isPrivileged) {
      throw new ForbiddenException(
        'Apenas o founder desta startup ou ADMIN/COMPLIANCE pode acessar',
      );
    }

    const dto: MarketplaceInfoDto = {
      startupId: startup.id,
      slug: startup.slug,
      score: startup.score ?? 0,
      scoreBreakdown: (startup.scoreBreakdown ?? {}) as any,
      scoreLastCalculatedAt: startup.scoreLastCalculatedAt,
      pin: {
        manuallyPinned: startup.manuallyPinned ?? false,
        manuallyPinnedBy: startup.manuallyPinnedBy,
        manuallyPinnedAt: startup.manuallyPinnedAt,
        manuallyPinnedReason: startup.manuallyPinnedReason,
      },
    };

    return ResponseDto.success(
      'Informacoes de marketplace retornadas com sucesso',
      200,
      dto,
    );
  }
}
