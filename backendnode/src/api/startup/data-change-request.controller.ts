import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { PayloadEntity } from 'src/common/entities/payload.entity';
import { DataChangeRequestService } from './service/data-change-request.service';
import { CreateDataChangeRequestDto } from './dto/create-data-change-request.dto';
import { ReviewDataChangeRequestDto } from './dto/review-data-change-request.dto';
import { ResponseDto } from 'src/common/dto/response.dto';

/**
 * Controller de solicitações de alteração de dados bloqueados (B13).
 *
 * Endpoints para:
 * - Founder: criar e listar suas solicitações de alteração
 * - Compliance: listar pendentes e revisar (aprovar/rejeitar)
 *
 * Dados bloqueados pós-rodada: CNPJ, Razão Social, País (B07).
 */
@ApiTags('Data Change Requests')
@Controller()
export class DataChangeRequestController {
  constructor(
    private readonly dataChangeRequestService: DataChangeRequestService,
  ) {}

  // =====================================================
  // FOUNDER — Criar e listar solicitações
  // =====================================================

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Post('founder/startups/:id/change-request')
  @ApiOperation({
    summary: 'Criar solicitação de alteração de dado bloqueado',
    description:
      'Permite ao fundador solicitar alteração de CNPJ, Razão Social ou País após rodada de investimento.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da startup' })
  @ApiResponse({ status: 201, description: 'Solicitação criada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Campo não bloqueado ou valor igual ao atual',
  })
  @ApiResponse({ status: 403, description: 'Startup não pertence ao fundador' })
  @ApiResponse({ status: 404, description: 'Startup não encontrada' })
  async createRequest(
    @Param('id') id: string,
    @Body() dto: CreateDataChangeRequestDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    const result = await this.dataChangeRequestService.createRequest(
      +id,
      req.user.id,
      dto.field,
      dto.requestedValue,
    );

    return ResponseDto.success(
      'Solicitação de alteração criada com sucesso',
      201,
      result,
    );
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Get('founder/startups/:id/change-requests')
  @ApiOperation({
    summary: 'Listar solicitações de alteração do fundador',
    description:
      'Lista todas as solicitações de alteração de dados bloqueados feitas pelo fundador para a startup especificada.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da startup' })
  @ApiResponse({ status: 200, description: 'Lista de solicitações' })
  @ApiResponse({ status: 403, description: 'Startup não pertence ao fundador' })
  async listByStartup(
    @Param('id') id: string,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    const result = await this.dataChangeRequestService.listByStartup(
      +id,
      req.user.id,
    );

    return ResponseDto.success(
      'Solicitações listadas com sucesso',
      200,
      result,
    );
  }

  // =====================================================
  // COMPLIANCE — Listar pendentes e revisar
  // =====================================================

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Get('compliance/change-requests')
  @ApiOperation({
    summary: 'Listar todas as solicitações pendentes',
    description:
      'Lista todas as solicitações de alteração de dados com status PENDING para revisão pela equipe de compliance.',
  })
  @ApiResponse({ status: 200, description: 'Lista de solicitações pendentes' })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito ao role COMPLIANCE',
  })
  async listPending(@Req() req: Request & { user: PayloadEntity }) {
    // Validação de role no controller (simplificado — sem guard customizado)
    if (req.user.role !== 'COMPLIANCE' && req.user.role !== 'ADMIN') {
      return ResponseDto.error('Acesso restrito ao role COMPLIANCE', 403);
    }

    const result = await this.dataChangeRequestService.listPending();

    return ResponseDto.success(
      'Solicitações pendentes listadas com sucesso',
      200,
      result,
    );
  }

  @ApiCookieAuth()
  @UseGuards(AuthGuard)
  @Patch('compliance/change-requests/:id')
  @ApiOperation({
    summary: 'Aprovar ou rejeitar solicitação de alteração',
    description:
      'Permite ao compliance aprovar (atualiza campo na Startup) ou rejeitar uma solicitação pendente.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'ID da solicitação' })
  @ApiResponse({ status: 200, description: 'Solicitação revisada com sucesso' })
  @ApiResponse({
    status: 400,
    description: 'Solicitação não está pendente ou dados inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito ao role COMPLIANCE',
  })
  @ApiResponse({ status: 404, description: 'Solicitação não encontrada' })
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewDataChangeRequestDto,
    @Req() req: Request & { user: PayloadEntity },
  ) {
    if (req.user.role !== 'COMPLIANCE' && req.user.role !== 'ADMIN') {
      return ResponseDto.error('Acesso restrito ao role COMPLIANCE', 403);
    }

    const result = await this.dataChangeRequestService.review(
      +id,
      req.user.id,
      dto.decision,
      dto.reviewNote,
    );

    const message =
      dto.decision === 'APPROVED'
        ? 'Solicitação aprovada e campo atualizado com sucesso'
        : 'Solicitação rejeitada com sucesso';

    return ResponseDto.success(message, 200, result);
  }
}
