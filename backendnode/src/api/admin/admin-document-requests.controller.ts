import {
  Body,
  Controller,
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
  ApiTags,
} from '@nestjs/swagger';
import { DocumentRequestStatus } from '@prisma/client';
import { AuthGuard } from '../../auth/auth.guard';
import { ComplianceGuard } from '../../auth/compliance.guard';
import { AdminDocumentRequestsService } from './admin-document-requests.service';
import { CreateDocumentRequestDto } from './dto/document-request.dto';

/**
 * Compliance Officer cria e gerencia solicitações de documentos extras.
 * POST   /admin/document-requests               — compliance cria
 * GET    /admin/document-requests               — lista (filtros)
 * PATCH  /admin/document-requests/:id/cancel    — cancela uma PENDING
 */
@Controller('admin/document-requests')
@UseGuards(AuthGuard, ComplianceGuard)
@ApiCookieAuth()
@ApiTags('Admin - Document Requests (Compliance)')
export class AdminDocumentRequestsController {
  constructor(private readonly service: AdminDocumentRequestsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar solicitação de documento adicional para uma startup',
    description:
      'Compliance cria uma nova request; o founder é notificado em in-app ' +
      '(NotificationType.COMPLIANCE_REQUEST). O prazo é opcional.',
  })
  async create(@Body() dto: CreateDocumentRequestDto, @Req() req: any) {
    const complianceUserId = req.user.id;
    const result = await this.service.create({
      startupId: dto.startupId,
      requestedById: complianceUserId,
      type: dto.type,
      description: dto.description,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
    });
    return result.ok
      ? {
          data: result.data,
          message: 'Solicitação criada e founder notificado.',
        }
      : { error: true, message: result.error };
  }

  @Get()
  @ApiOperation({
    summary: 'Listar solicitações de documentos (filtros opcionais)',
  })
  @ApiQuery({ name: 'startupId', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: DocumentRequestStatus,
    description: 'PENDING | FULFILLED | EXPIRED | CANCELED',
  })
  async list(
    @Query('startupId') startupId?: string,
    @Query('status') status?: DocumentRequestStatus,
  ) {
    const result = await this.service.list({
      startupId: startupId ? parseInt(startupId, 10) : undefined,
      status,
    });
    return { data: result.data };
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancelar uma solicitação PENDING (não pode ser revertida)',
  })
  async cancel(@Param('id', ParseIntPipe) id: number) {
    const result = await this.service.cancel(id);
    return result.ok
      ? { data: result.data, message: 'Solicitação cancelada.' }
      : { error: true, message: result.error };
  }
}
