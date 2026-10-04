import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthGuard } from '../../auth/auth.guard';
import { ComplianceGuard } from '../../auth/compliance.guard';
import { ComplianceDeleteService } from './compliance-delete.service';
import { DeleteStartupDto } from './dto/delete-startup.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    publicId: string;
    role: string;
    [key: string]: unknown;
  };
}

@Controller('admin')
@ApiCookieAuth()
@ApiTags('Admin - Compliance Delete')
export class AdminComplianceDeleteController {
  constructor(
    private readonly complianceDeleteService: ComplianceDeleteService,
  ) {}

  /**
   * HARD DELETE de startup (Compliance M6-S17).
   *
   * Endpoint exclusivo para role COMPLIANCE.
   * Executa exclusao atomica com log de auditoria imutavel.
   *
   * Requer role COMPLIANCE via AuthGuard + ComplianceGuard.
   */
  @Delete('startups/:id')
  @UseGuards(AuthGuard, ComplianceGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Excluir startup (HARD DELETE)',
    description:
      'Exclui startup com todas as relacoes. Log de auditoria obrigatorio. ' +
      'Exclusivo para role COMPLIANCE. Operacao atomica - se o log falhar, ' +
      'o delete NAO ocorre.',
  })
  @ApiResponse({
    status: 204,
    description: 'Startup excluida com sucesso. Log de auditoria registrado.',
  })
  @ApiResponse({
    status: 401,
    description: 'Nao autorizado - Token invalido ou expirado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito a usuarios compliance.',
  })
  @ApiResponse({
    status: 404,
    description: 'Startup nao encontrada.',
  })
  @ApiResponse({
    status: 400,
    description: 'Motivo invalido (deve ter pelo menos 10 caracteres).',
  })
  async deleteStartup(
    @Param('id') id: string,
    @Body() deleteStartupDto: DeleteStartupDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const ipAddress =
      req.ip ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    await this.complianceDeleteService.deleteStartup(
      req.user,
      id,
      deleteStartupDto.reason,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Lista logs de auditoria de delete de startups.
   *
   * CNPJs mascarados. IPs e User-Agents redatados.
   *
   * Requer role COMPLIANCE via AuthGuard + ComplianceGuard.
   */
  @Get('audit-logs/delete')
  @UseGuards(AuthGuard, ComplianceGuard)
  @ApiOperation({
    summary: 'Listar logs de auditoria de delete',
    description:
      'Retorna lista paginada de logs de exclusao de startups. ' +
      'CNPJs mascarados, IPs e User-Agents redatados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logs retornados com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Logs retornados com sucesso',
        codigo: 200,
        data: [
          {
            id: 'clx1234567890',
            startupId: '42',
            startupSnapshot:
              '{"id":42,"nome":"Startup XYZ","cnpj":"12.345.***/****-00",...}',
            rodadaSnapshot: '{"id":1,"title":"Rodada Seed",...}',
            investmentsSnapshot: null,
            paymentsSnapshot: null,
            documentsSnapshot: null,
            signedDocsSnapshot: null,
            deletedByUserId: 'usr_abc123',
            deletedByRole: 'COMPLIANCE',
            deletedAt: '2026-07-10T12:00:00.000Z',
            ipAddress: '[REDATADO]',
            userAgent: '[REDATADO]',
            reason: 'Startup duplicada no sistema',
            retentionUntil: '2033-07-10T12:00:00.000Z',
            createdAt: '2026-07-10T12:00:00.000Z',
          },
        ],
        pagina: 1,
        totalPaginas: 5,
        total: 100,
        porPagina: 25,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Nao autorizado - Token invalido ou expirado.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito a usuarios compliance.',
  })
  async listAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.complianceDeleteService.listAuditLogs(
      parseInt(page || '1', 10),
      parseInt(limit || '25', 10),
    );

    return {
      error: false,
      message: 'Logs retornados com sucesso',
      codigo: 200,
      data: result.data,
      pagina: result.pagina,
      totalPaginas: result.totalPaginas,
      total: result.total,
      porPagina: result.porPagina,
    };
  }
}
