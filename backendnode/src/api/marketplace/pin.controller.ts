/**
 * S4-T01/T02 — PinController + Admin Marketplace endpoints
 *
 * POST   /admin/startups/:id/pin           (AdminGuard/ComplianceGuard) — S4-T01
 * DELETE /admin/startups/:id/pin           (AdminGuard/ComplianceGuard) — S4-T01
 * GET    /admin/marketplace/pinned         (AdminGuard/ComplianceGuard) — S4-T02
 *
 * Auth guard: ADMIN, COMPLIANCE ou FINANCEIRO (mesmo padrao de /admin/startups).
 * Audit log obrigatorio em toda acao (PIN_STARTUP/UNPIN_STARTUP).
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/auth.guard';
import { ResponseDto } from 'src/common/dto/response.dto';
import type { Request } from 'express';
import { PinService } from './pin.service';
import type { PinnedStartup } from './pin.service';

@ApiTags('Admin Marketplace')
@Controller('admin')
@UseGuards(AuthGuard)
export class PinController {
  constructor(private readonly pinService: PinService) {}

  @Post('startups/:id/pin')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Pinar startup manualmente (max 3 ativos)',
    description:
      'Auth: ADMIN, COMPLIANCE ou FINANCEIRO. Reason >= 20 chars. ' +
      'Retorna 409 se ja existirem 3 pinos ativos.',
  })
  async pin(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user as { id: number };
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.ip ??
      null;
    const userAgent = req.headers['user-agent'] ?? null;

    const result = await this.pinService.pin(id, {
      reason: body.reason,
      actorId: user.id,
      ip,
      userAgent,
    });

    return ResponseDto.success('Startup pinada com sucesso', 201, result);
  }

  @Delete('startups/:id/pin')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Despinar startup manualmente',
    description:
      'Auth: ADMIN, COMPLIANCE ou FINANCEIRO. Preserva reason no AuditLog (LGPD).',
  })
  async unpin(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = (req as any).user as { id: number };
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.ip ??
      null;
    const userAgent = req.headers['user-agent'] ?? null;

    const result = await this.pinService.unpin(id, {
      actorId: user.id,
      ip,
      userAgent,
    });

    return ResponseDto.success('Startup despinada com sucesso', 200, result);
  }

  @Get('marketplace/pinned')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Lista startups pinadas manualmente (max 3)',
    description:
      'Auth: ADMIN, COMPLIANCE ou FINANCEIRO. Ordena por manuallyPinnedAt DESC.',
  })
  async listPinned(): Promise<ResponseDto<PinnedStartup[]>> {
    const list = await this.pinService.listPinned();
    return ResponseDto.success(
      'Lista de pinos retornada com sucesso',
      200,
      list,
    );
  }
}
