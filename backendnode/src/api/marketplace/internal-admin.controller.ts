/**
 * S5-T02 — InternalAdminController
 *
 * Endpoints internos para staging/teste operacional. NAO expor publicamente
 * — autenticacao via header `X-Internal-Token` (env var `INTERNAL_ADMIN_TOKEN`).
 *
 * POST /internal/admin/recalculate-scores
 *   - Dispara ScoreCalculatorService.recalculateAll() manualmente
 *   - Util para teste em staging antes do cron 03:00 BRT entrar em producao
 *
 * Quando X-Internal-Token nao bate: 401.
 * Quando env var nao configurada: 503 (protege contra deploy acidental).
 */

import {
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  InternalServerErrorException,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScoreCalculatorService } from './score-calculator.service';
import { ScoreRecalcCron } from './score-recalc.cron';

@ApiTags('Internal Admin (staging only)')
@Controller('internal/admin')
export class InternalAdminController {
  constructor(
    private readonly scoreCalculator: ScoreCalculatorService,
    private readonly scoreRecalcCron: ScoreRecalcCron,
  ) {}

  @Post('recalculate-scores')
  @HttpCode(202)
  @ApiOperation({
    summary: 'Dispara recalculo de scores manualmente (staging)',
    description:
      'Auth: header X-Internal-Token deve bater com env INTERNAL_ADMIN_TOKEN. ' +
      'Retorna 202 Accepted; recalculo roda em background via cron handler.',
  })
  async recalculateScores(
    @Headers('x-internal-token') token: string | undefined,
  ): Promise<{ status: 'accepted'; total?: number; outliers?: number }> {
    const expected = process.env.INTERNAL_ADMIN_TOKEN;
    if (!expected) {
      throw new ServiceUnavailableException(
        'INTERNAL_ADMIN_TOKEN nao configurado; endpoint desabilitado em prod',
      );
    }
    if (!token || token !== expected) {
      throw new ForbiddenException('X-Internal-Token invalido ou ausente');
    }

    try {
      await this.scoreRecalcCron.handleCron();
      return { status: 'accepted' };
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Falha no recalculo: ${error?.message ?? error}`,
      );
    }
  }
}
