import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { CreateLivenessTelemetryDto } from './dto/create-liveness-telemetry.dto';
import { LivenessTelemetryService } from './liveness-telemetry.service';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard)
export class LivenessTelemetryController {
  constructor(private readonly service: LivenessTelemetryService) {}

  /**
   * Registra a telemetria da prova de vida associada ao envio da selfie.
   *
   * POST /users/me/liveness-telemetry
   */
  @Post('me/liveness-telemetry')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar telemetria de prova de vida (liveness)' })
  @ApiResponse({ status: 201, description: 'Telemetria registrada' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  async record(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateLivenessTelemetryDto,
  ) {
    const userId = Number(req.user.id);
    const userAgent = req.headers['user-agent'] ?? null;
    const result = await this.service.record(userId, dto, userAgent);
    return {
      success: true,
      message: 'Telemetria de prova de vida registrada.',
      data: result,
    };
  }
}
