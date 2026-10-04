import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Tipos de notificação in-app.
 *
 * Os valores sao snake_case (ex: `kyc_approved`) — alinhados com:
 *  - o enum Prisma `NotificationType` em `prisma/schema.sqlite.prisma`
 *  - o que e serializado via WS Gateway para o frontend
 *  - o que o frontend ja consome no `NotificationRaw.type`
 *  - a migration `20261011010000_notification_type_enum` (backfill seguro)
 *
 * **Fonte de verdade dupla (intencional):**
 *  - Backend: este enum TS (TS reverse-mapped: `key === value`).
 *  - Banco: enum Prisma no schema.
 * Os DOIS devem estar sincronizados. Adicionar/renomear aqui DEVE ser
 * refletido em:
 *  - `prisma/schema.sqlite.prisma` (enum + model)
 *  - o `typeMap` em `frontend/app/components/notifications.tsx`
 *  - `frontend/app/lib/queries.ts` (NOTIFICATION_FILTER_TO_TYPES)
 *  - o `NotificationFilter` type no frontend
 */
export enum NotificationType {
  KYC_APPROVED = 'kyc_approved',
  KYC_RESUBMISSION_REQUESTED = 'kyc_resubmission_requested',
  INVESTMENT_CONFIRMED = 'investment_confirmed',
  TOKEN_PURCHASED = 'token_purchased',
  CAMPAIGN_FUNDED = 'campaign_funded',
  CAMPAIGN_DEADLINE = 'campaign_deadline',
  CAMPAIGN_CLOSED = 'campaign_closed',
  STARTUP_APPROVED = 'startup_approved',
  STARTUP_REJECTED = 'startup_rejected',
  /** @deprecated usar PHASE_APPROVED. Mantido para retro-compat. */
  STARTUP_PHASE_APPROVED = 'startup_phase_approved',
  /** Cobre Fase 1/2/3 aprovadas. */
  PHASE_APPROVED = 'phase_approved',
  COMPLIANCE_REQUEST = 'compliance_request',
  SECURITY = 'security',
  GENERAL = 'general',
  /** Admin ativou o usuario. */
  USER_APPROVED = 'user_approved',
  /** Admin desativou o usuario. */
  USER_SUSPENDED = 'user_suspended',
  /** 1a assinatura de plano confirmada. */
  PLAN_PURCHASED = 'plan_purchased',
  /** Assinatura adicional confirmada (coexiste com outra ACTIVE). */
  PLAN_ADDED = 'plan_added',
  /** Founder solicitou nova parcela. */
  REPASSE_REQUEST = 'repasse_request',
  /** Parcela aprovada pelo financeiro. */
  REPASSE_APPROVED = 'repasse_approved',
  /** Parcela rejeitada pelo financeiro. */
  REPASSE_REJECTED = 'repasse_rejected',
  /** Parcela depositada. */
  REPASSE_PAID = 'repasse_paid',
}

/**
 * DTO de query para listagem de notificacoes.
 *
 * Aceita **um** `type` (back-compat) **ou varios** `types` (multi-valor,
 * separados por virgula). Quando ambos sao fornecidos, `types` vence.
 */
export class QueryNotificationsDto {
  @ApiProperty({ required: false, enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  /** Multi-valor: `?types=plan_purchased,plan_added&types=token_purchased`. */
  @ApiProperty({
    required: false,
    type: String,
    description:
      'CSV ou multi-valor: filtra por varios tipos (ex: "plan_purchased,plan_added").',
    example: 'plan_purchased,plan_added',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value.flatMap((v) => String(v).split(','));
    if (typeof value === 'string') return value.split(',');
    return value;
  })
  @Type(() => String)
  types?: string[];

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  limit?: number;
}
