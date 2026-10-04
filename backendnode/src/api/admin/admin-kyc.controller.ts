import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminService } from './admin.service';
import {
  KycDecisionDto,
  PaginationQueryDto,
  StartupFilterQueryDto,
  UpdatePayoutInstallmentDateDto,
  UpdateStartupStatusDto,
  UserFilterQueryDto,
} from './dto/admin.dto';
import { ReviewStartupDocumentDto } from './dto/review-startup-document.dto';

/**
 * Admin KYC Controller - Gestão de KYC de Usuários e Startups
 *
 * Endpoints:
 * - GET /admin/kyc - Lista usuários com KYC pendente
 * - GET /admin/kyc/:userId - Detalhe de KYC de um usuário
 * - POST /admin/kyc/:kycProfileId/decide - Decidir sobre KYC de usuário
 * - GET /admin/startups/:id - Detalhe de startup para compliance
 * - PUT /admin/startups/:id/compliance-score - Calcular compliance score
 * - PUT /admin/startups/:id/status - Aprovar/rejeitar startup
 */
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
@ApiCookieAuth()
@ApiTags('Admin - KYC & Compliance')
export class AdminKycController {
  constructor(private readonly adminService: AdminService) {}

  // =====================================================
  // KYC USERS
  // =====================================================

  @Get('kyc')
  @ApiOperation({
    summary: 'Lista usuários com KYC pendente',
    description:
      'Retorna lista paginada de usuários que precisam de revisão de KYC',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários com KYC pendente',
    schema: {
      example: {
        error: false,
        message: 'KYC pending users retrieved successfully',
        codigo: 200,
        data: [
          {
            id: 1,
            publicId: 'usr_abc123',
            email: 'user@example.com',
            nome: 'João Silva',
            tipo_documento: 'CPF',
            reg_documento: '123.456.789-00',
            createdAt: '2026-01-15T10:30:00.000Z',
            avatar: {
              id: 1,
              originalName: 'avatar.jpg',
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/avatar.jpg',
              status: 'PENDING',
            },
            comprovante: {
              id: 2,
              originalName: 'comprovante.pdf',
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/comprovante.pdf',
              status: 'PENDING',
            },
            documento: {
              id: 3,
              originalName: 'documento.pdf',
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/documento.pdf',
              status: 'PENDING',
            },
            biofacial: {
              id: 4,
              originalName: 'biofacial.jpg',
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/biofacial.jpg',
              status: 'PENDING',
            },
          },
        ],
        total: 15,
        pagina: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autorizado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso restrito a administradores',
  })
  async listKycPending(@Query() query: PaginationQueryDto) {
    return this.adminService.listKycPendingUsers({
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('kyc/:userId')
  @ApiOperation({
    summary: 'Detalhe de KYC de usuário',
    description:
      'Retorna detalhes completos dos documentos KYC de um usuário, incluindo risk score e histórico',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhe de KYC do usuário',
    schema: {
      example: {
        error: false,
        message: 'User KYC detail retrieved',
        codigo: 200,
        data: {
          user: {
            id: 1,
            publicId: 'usr_abc123',
            email: 'user@example.com',
            nome: 'João Silva',
            tipo_documento: 'CPF',
            reg_documento: '123.456.789-00',
          },
          documents: {
            avatar: {
              id: 1,
              originalName: 'avatar.jpg',
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/avatar.jpg',
              status: 'PENDING',
            },
            comprovante: {
              id: 2,
              originalName: 'comprovante.pdf',
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/comprovante.pdf',
              status: 'PENDING',
            },
            documento: {
              id: 3,
              originalName: 'documento.pdf',
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/documento.pdf',
              status: 'PENDING',
            },
            biofacial: {
              id: 4,
              originalName: 'biofacial.jpg',
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/biofacial.jpg',
              status: 'PENDING',
            },
          },
          activity: {
            investmentsCount: 3,
            tokensCount: 150,
            totalInvested: 15000.0,
          },
          riskScore: 85,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async getUserKycDetail(@Param('userId') userId: string) {
    return this.adminService.getUserKycDetail(+userId);
  }

  @Post('kyc/:kycProfileId/decide')
  @ApiOperation({
    summary: 'Decidir sobre KYC de usuário',
    description:
      'Aprova, rejeita, solicita reenvio ou revoga a aprovação de documentos KYC',
  })
  @ApiResponse({
    status: 200,
    description: 'Decisão registrada',
    schema: {
      example: {
        error: false,
        message: 'KYC approved',
        codigo: 200,
        data: {
          id: 1,
          status: 'APPROVED',
          rejectionReason: null,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Decisão inválida ou razão não fornecida',
  })
  @ApiResponse({ status: 404, description: 'Perfil KYC não encontrado' })
  async decideKycUser(
    @Param('kycProfileId') kycProfileId: string,
    @Body() dto: KycDecisionDto,
  ) {
    return this.adminService.decideKycUser(
      +kycProfileId,
      dto.decision,
      dto.reason,
    );
  }

  // =====================================================
  // KYC STARTUPS
  // =====================================================

  @Get('startups/:id')
  @ApiOperation({
    summary: 'Detalhe de startup para compliance',
    description:
      'Retorna detalhes completos de uma startup incluindo documentos legais e review financeiro',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalhe de startup',
    schema: {
      example: {
        error: false,
        message: 'Startup detail retrieved',
        codigo: 200,
        data: {
          id: 1,
          nome: 'TechNova',
          slug: 'technova',
          cnpj: '12.345.678/0001-95',
          razao_social: 'TechNova Tecnologia S.A.',
          status: 'PENDING',
          area_atuacao: 'Tecnologia',
          estagio: 'Seed',
          founder: {
            id: 1,
            publicId: 'usr_abc123',
            nome: 'João Silva',
            email: 'joao@technova.com.br',
            tipo_documento: 'CPF',
            reg_documento: '123.456.789-00',
            avatar: {
              id: 1,
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/avatar.jpg',
              status: 'APPROVED',
            },
            comprovante: {
              id: 2,
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/comprovante.pdf',
              status: 'APPROVED',
            },
            documento: {
              id: 3,
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/documento.pdf',
              status: 'APPROVED',
            },
            biofacial: {
              id: 4,
              url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/biofacial.jpg',
              status: 'APPROVED',
            },
          },
          logo: {
            id: 5,
            url: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/logo.png',
          },
          campaigns: [
            {
              id: 1,
              title: 'Rodada Seed',
              targetAmount: 500000.0,
              tokenPrice: 1.0,
              totalTokens: 500000,
              tokensSold: 125000,
              status: 'OPEN',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Startup não encontrada' })
  async getStartupDetail(@Param('id') id: string) {
    return this.adminService.getStartupDetail(+id);
  }

  @Get('startups/:id/payment-status')
  @ApiOperation({
    summary: 'Status de pagamento por fase',
    description:
      'Retorna os gates de pagamento das Fases 1/2/3 (reserva, taxa de compliance, tudo pago) para a tabela/páginas de fase do admin.',
  })
  @ApiResponse({ status: 200, description: 'Gates de pagamento por fase' })
  @ApiResponse({ status: 404, description: 'Startup não encontrada' })
  async getStartupPaymentStatus(@Param('id') id: string) {
    return this.adminService.getStartupPaymentStatus(+id);
  }

  @Get('payouts')
  @ApiOperation({
    summary: 'Lista consolidada de payouts',
    description:
      'Consolida captações finalizadas aguardando decisão (prorrogar/finalizar) e solicitações de parcela pendentes (aprovar/rejeitar/marcar pago).',
  })
  @ApiResponse({ status: 200, description: 'Payouts consolidados' })
  async listPayouts(@Query('page') page?: string) {
    return this.adminService.listPayouts(Number(page ?? 1));
  }

  @Patch('payouts/installments/:id/scheduled-date')
  @ApiOperation({
    summary: 'Alterar data prevista de uma parcela',
    description:
      'Atualiza a data prevista de pagamento de uma parcela ainda não concluída e registra auditoria.',
  })
  @ApiResponse({ status: 200, description: 'Data da parcela atualizada' })
  @ApiResponse({
    status: 400,
    description: 'Parcela já concluída ou data inválida',
  })
  @ApiResponse({ status: 404, description: 'Parcela não encontrada' })
  async updatePayoutInstallmentDate(
    @Param('id') id: string,
    @Body() dto: UpdatePayoutInstallmentDateDto,
    @Req() req: any,
  ) {
    return this.adminService.updatePayoutInstallmentDate(
      +id,
      dto.scheduledDate,
      { id: req?.user?.id ?? null, role: req?.user?.role ?? null },
    );
  }

  @Post('payouts/:campaignId/finalize')
  @ApiOperation({
    summary: 'Finalizar definitivamente (definir parcelas)',
    description:
      'Configura o repasse da campanha FUNDED: nº de parcelas (mín. 12), intervalo entre parcelas (15..60 dias), intervalo da PRIMEIRA parcela (opcional, 1..120 dias) e valores derivados do captado. Libera "Solicitar Parcela" para o founder.',
  })
  @ApiResponse({ status: 200, description: 'Repasse configurado' })
  async finalizePayout(
    @Param('campaignId') campaignId: string,
    @Body()
    body: {
      numeroParcelas: number;
      intervaloDias?: number;
      primeiraParcelaDias?: number;
      observacao?: string;
    },
    @Req() req: any,
  ) {
    const primeiraParcelaDias =
      body?.primeiraParcelaDias != null && body.primeiraParcelaDias !== 0
        ? Number(body.primeiraParcelaDias)
        : undefined;
    return this.adminService.finalizePayout(
      +campaignId,
      Number(body?.numeroParcelas),
      Number(body?.intervaloDias ?? 30),
      body?.observacao,
      { id: req?.user?.id ?? null, role: req?.user?.role ?? null },
      { primeiraParcelaDias },
    );
  }

  @Patch('startups/:id/documents/:docId/review')
  @ApiOperation({
    summary: 'Revisar documento da startup',
    description:
      'Aprova (APPROVED) ou reprova (REJECTED) um StartupDocument. ' +
      'Rejeição exige justificativa >=20 chars (LGPD), HARD-DELETA o doc + ' +
      'arquivo S3, registra `StartupDocumentRejection` (fonte de verdade do ' +
      'banner no founder), audita com snapshot pré-delete e dispara ' +
      'notificação + e-mail ao founder.',
  })
  @ApiResponse({ status: 200, description: 'Documento revisado' })
  @ApiResponse({ status: 400, description: 'Decisão/nota inválida' })
  @ApiResponse({ status: 404, description: 'Documento não encontrado' })
  async reviewStartupDocument(
    @Param('id') id: string,
    @Param('docId') docId: string,
    @Body() body: ReviewStartupDocumentDto,
    @Req() req: any,
  ) {
    return this.adminService.reviewStartupDocument(
      +id,
      +docId,
      body?.decision,
      body?.note,
      req?.user?.id ?? null,
    );
  }

  @Put('startups/:id/compliance-score')
  @ApiOperation({
    summary: 'Calcular compliance score',
    description:
      'Calcula e retorna o score de compliance de uma startup baseado em seus documentos',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance score calculado',
    schema: {
      example: {
        error: false,
        message: 'Compliance score calculated',
        codigo: 200,
        data: {
          startupId: 1,
          score: 85,
          factors: [
            'avatar_verified',
            'document_verified',
            'address_verified',
            'biofacial_verified',
            'logo_uploaded',
          ],
          maxScore: 100,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Startup não encontrada' })
  async calculateComplianceScore(@Param('id') id: string) {
    return this.adminService.calculateComplianceScore(+id);
  }

  @Put('startups/:id/status')
  @ApiOperation({
    summary: 'Aprovar ou rejeitar startup',
    description:
      'Atualiza o status de uma startup com approve ou reject e justificativa',
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado',
    schema: {
      example: {
        error: false,
        message: 'Startup approved successfully',
        codigo: 200,
        data: {
          id: 1,
          status: 'APPROVED',
          nome: 'TechNova',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Status inválido' })
  @ApiResponse({ status: 404, description: 'Startup não encontrada' })
  async updateStartupStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStartupStatusDto,
    @Req() req: any,
  ) {
    const admin = req?.user ?? {};
    const ip =
      (req?.headers?.['x-forwarded-for'] as string) ||
      (req?.headers?.['x-real-ip'] as string) ||
      req?.ip ||
      null;
    return this.adminService.updateStartupStatus(
      +id,
      dto.status,
      dto.justification,
      {
        phase: dto.phase,
        adminUserId: admin?.id ?? null,
        adminName: admin?.nome ?? null,
        adminEmail: admin?.email ?? null,
        ip,
      },
    );
  }

  // =====================================================
  // STARTUPS LIST (ADMIN)
  // =====================================================

  @Get('startups')
  @ApiOperation({
    summary: 'Lista startups (Admin)',
    description:
      'Retorna lista paginada de startups com filtros por status e busca',
  })
  @ApiResponse({
    status: 200,
    description: 'Startups retrieved successfully',
    schema: {
      example: {
        error: false,
        message: 'Startups retrieved successfully',
        codigo: 200,
        data: [
          {
            id: 1,
            nome: 'TechNova',
            slug: 'technova',
            status: 'APPROVED',
            area_atuacao: 'Tecnologia',
            estagio: 'Seed',
            founder: {
              id: 1,
              nome: 'João Silva',
              email: 'joao@technova.com.br',
            },
            logo: 'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/logo.png',
            campaigns: [],
            totalTokens: 500000,
            tokensSold: 125000,
          },
        ],
        total: 25,
        pagina: 1,
      },
    },
  })
  async listStartups(@Query() query: StartupFilterQueryDto) {
    return this.adminService.listStartups({
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
      segmento: query.segmento,
    });
  }

  // =====================================================
  // USERS LIST (ADMIN)
  // =====================================================

  @Get('users')
  @ApiOperation({
    summary: 'Lista usuários (Admin)',
    description:
      'Retorna lista paginada de usuários com filtros por role e KYC status',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      example: {
        error: false,
        message: 'Users retrieved successfully',
        codigo: 200,
        data: [
          {
            id: 1,
            publicId: 'usr_abc123',
            email: 'user@example.com',
            nome: 'João Silva',
            role: 'USER',
            isActive: true,
            createdAt: '2026-01-15T10:30:00.000Z',
            avatar: {
              id: 1,
              url_sm:
                'https://iselftoken-prod.s3.sa-east-1.amazonaws.com/avatar_sm.jpg',
              status: 'APPROVED',
            },
            subscriptions: [
              {
                id: 1,
                status: 'ACTIVE',
                plan: { nome: 'Investidor', slug: 'investidor' },
              },
            ],
          },
        ],
        total: 150,
        pagina: 1,
      },
    },
  })
  async listUsers(@Query() query: UserFilterQueryDto) {
    return this.adminService.listUsers({
      page: query.page,
      limit: query.limit,
      role: query.role,
      kycStatus: query.kycStatus,
      search: query.search,
    });
  }

  @Put('users/:id/status')
  @ApiOperation({
    summary: 'Ativar/desativar usuário',
    description: 'Habilita ou desabilita um usuário no sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated',
    schema: {
      example: {
        error: false,
        message: 'User disabled successfully',
        codigo: 200,
        data: {
          id: 1,
          publicId: 'usr_abc123',
          email: 'user@example.com',
          nome: 'João Silva',
          role: 'USER',
          isActive: false,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async toggleUserStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.adminService.toggleUserStatus(+id, body.isActive);
  }
}
