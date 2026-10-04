import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../auth/auth.guard';
import { ResponseDto } from 'src/common/dto/response.dto';
import { ErrorEntity } from 'src/common/dto/error.entity';
import { SkipSessionFilter } from 'src/common/decorators/skip-session-filter.decorator';
import { NotificationsService } from './notifications.service';
import {
  QueryNotificationsDto,
  NotificationType,
} from './dto/query-notifications.dto';

@Controller('notifications')
@UseGuards(AuthGuard)
@SkipSessionFilter()
@ApiCookieAuth()
@ApiTags('Notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar notificações do usuário',
    description: `Retorna as notificações do usuário autenticado com paginação.

**Tipos de notificação** (filtro via \`type\` ou multi-valor via \`types\`):
- \`kyc_approved\`: KYC aprovado
- \`kyc_resubmission_requested\`: Reenvio de documento KYC solicitado
- \`investment_confirmed\` / \`token_purchased\`: Compra de tokens confirmada
- \`campaign_funded\` / \`campaign_deadline\` / \`campaign_closed\`: Status da campanha
- \`startup_approved\` / \`startup_rejected\`: Decisao final do compliance
- \`startup_phase_approved\` / \`phase_approved\`: Fase 1/2/3 aprovada
- \`compliance_request\`: Solicitacao de documento pelo compliance
- \`user_approved\` / \`user_suspended\`: Admin ativou/desativou o usuario
- \`plan_purchased\`: 1a assinatura de plano confirmada
- \`plan_added\`: Assinatura adicional (coexiste com outra ACTIVE)
- \`repasse_request\` / \`repasse_approved\` / \`repasse_rejected\` / \`repasse_paid\`: Repasses
- \`security\`: Alerta de seguranca
- \`general\`: Notificacao geral

**Ordenacao**: \`createdAt DESC\` (mais novo primeiro).`,
  })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({
    name: 'types',
    required: false,
    type: String,
    description:
      'CSV de tipos para filtro multi-valor (ex: "plan_purchased,plan_added").',
    example: 'plan_purchased,plan_added',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Notificações retornadas com sucesso.',
    schema: {
      example: {
        error: false,
        message: 'Notificações retornadas com sucesso',
        codigo: 200,
        data: {
          data: [
            {
              id: 1,
              userId: 1,
              title: 'KYC Aprovado',
              description: 'Seu perfil KYC foi aprovado.',
              type: 'kyc_approved',
              isRead: false,
              createdAt: '2026-05-01T10:00:00.000Z',
            },
          ],
          pagination: { page: 1, limit: 20, total: 5, totalPages: 1 },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Não autorizado.',
    type: ErrorEntity,
  })
  async findAll(@Req() req: any, @Query() query: QueryNotificationsDto) {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseDto.error('Usuário não encontrado', 401);
    }

    return this.notificationsService.findByUserId(
      userId,
      query.page || 1,
      query.limit || 20,
      query.type,
      query.types,
    );
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Contar notificações não lidas',
    description: 'Retorna a quantidade de notificações não lidas do usuário.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contagem retornada.',
    schema: {
      example: {
        error: false,
        message: 'Contagem de não lidas',
        codigo: 200,
        data: { unreadCount: 3 },
      },
    },
  })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseDto.error('Usuário não encontrado', 401);
    }
    return this.notificationsService.getUnreadCount(userId);
  }

  @Post(':id/mark-as-read')
  @ApiOperation({
    summary: 'Marcar notificação como lida',
    description: 'Marca uma notificação específica como lida.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notificação marcada como lida.',
    schema: {
      example: {
        error: false,
        message: 'Notificação marcada como lida',
        codigo: 200,
        data: { id: 1, isRead: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Notificação não encontrada.',
    type: ErrorEntity,
  })
  async markAsRead(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseDto.error('Usuário não encontrado', 401);
    }
    return this.notificationsService.markAsRead(userId, +id);
  }

  @Post('mark-all-as-read')
  @ApiOperation({
    summary: 'Marcar todas como lidas',
    description: 'Marca todas as notificações do usuário como lidas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Todas notificações marcadas como lidas.',
  })
  async markAllAsRead(@Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      return ResponseDto.error('Usuário não encontrado', 401);
    }
    return this.notificationsService.markAllAsRead(userId);
  }

  /**
   * Endpoint DEV-only para testes E2E. Dispara uma notificação para um
   * userId arbitrário. NÃO existe em produção (NODE_ENV=production).
   *
   * Protegido por `@UseGuards(AuthGuard)` para evitar abuso em dev
   * compartilhado. Caller precisa ser um usuário autenticado e autorizado.
   */
  @Post('dev/trigger')
  @ApiOperation({
    summary: '[DEV] Disparar notificação para userId arbitrário',
    description:
      'Apenas disponível fora de produção. Usado por testes E2E para validar push real-time.',
  })
  async devTrigger(
    @Req() req: any,
    @Body()
    body: {
      userId: number;
      title: string;
      description: string;
      type?: NotificationType;
    },
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    const notif = await this.notificationsService.create(
      body.userId,
      body.title,
      body.description,
      body.type ?? NotificationType.GENERAL,
    );
    return ResponseDto.success('Notificação disparada (dev)', 201, notif);
  }
}
