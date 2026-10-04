import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { TokenGateGuard } from './guards/token-gate.guard';
import { FeaturedReportService } from './featured-report.service';

/**
 * Controller do Post Principal Vigente da startup (TRANSP-03).
 *
 * GET /transparency/startups/:startupId/featured-report
 *   - 200 com o post vigente do mes atual (FINANCIAL_REPORT)
 *   - 204 No Content se nao houver post vigente
 *
 * Cache Redis 5min (TTL = 300s). Leitura sempre cache-first.
 */
@ApiTags('Transparency — Featured Report')
@ApiBearerAuth()
@Controller('transparency')
@UseGuards(AuthGuard)
export class FeaturedReportController {
  constructor(private readonly service: FeaturedReportService) {}

  @Get('startups/:startupId/featured-report')
  @UseGuards(TokenGateGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Post Principal Vigente da startup (relatorio financeiro do mes atual)',
    description:
      'Retorna 200 com o post ou 204 No Content se nao houver post do mes vigente. Cache Redis 5min.',
  })
  @ApiResponse({ status: 200, description: 'Post vigente encontrado.' })
  @ApiResponse({ status: 204, description: 'Sem post vigente este mes.' })
  @ApiResponse({ status: 403, description: 'Sem token da startup.' })
  async get(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const post = await this.service.getFeaturedReport(startupId);
    if (!post) {
      res.status(HttpStatus.NO_CONTENT);
      return null;
    }
    return { success: true, data: post };
  }
}
