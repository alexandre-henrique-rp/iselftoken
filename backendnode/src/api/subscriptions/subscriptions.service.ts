import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Request } from 'express';
import {
  PaymentCancelledEvent,
  PaymentConfirmedEvent,
  PaymentEvents,
} from 'src/api/payment/events/payment-events';
import { SessionService } from 'src/auth/session/session.service';
import { AuditService } from 'src/common/audit/audit.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

/**
 * Serviço de Assinaturas (Application Layer)
 *
 * Responsabilidade:
 * - Orquestrar operações CRUD de assinaturas
 * - Validar acesso a recursos premium baseado em planos ativos
 * - Gerenciar regras de negócio relacionadas a assinaturas
 *
 * Arquitetura:
 * - Camada de Aplicação (Use Cases)
 * - Utiliza PrismaService para acesso aos dados
 * - Implementa validação de planos para controle de acesso
 *
 * Dependências:
 * - PrismaService: Acesso ao banco de dados
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * Valida se o usuário possui plano ativo válido
   * @name validateUserPlan
   * @description Verifica se o usuário tem acesso a um plano específico baseado em assinatura ativa e não expirada
   *
   * @param userId ID do usuário a ser validado
   * @param planSlug Slug do plano a ser verificado (ex: "investor_pro")
   *
   * @throws ForbiddenException Se o usuário não possui plano ativo ou está expirado
   */
  /**
   * Listener: ativa Subscription quando Payment eh confirmado.
   *
   * Fase v3 do Hub de Pagamentos (2026-07-23). Substitui a chamada inline
   * `activateSubscriptionForPayment` que vivia no `payment.service.ts`.
   *
   * Fluxo:
   * 1. `paymentService.processWebhookPaymentReceived` marca Payment=PAID
   * 2. Dispara `payment.confirmed` (com payload minimo da Payment)
   * 3. Este listener:
   *    - Verifica purpose=SUBSCRIPTION e subscription!=null
   *    - Idempotente: se ja ACTIVE, no-op
   *    - Calcula expiresAt baseado em `plan.periodoMeses`
   *    - Atualiza Subscription: status=ACTIVE, startedAt, expiresAt
   *
   * LGPD: nao loga dados sensiveis. Apenas IDs.
   */
  /**
   * Listener de `payment.confirmed` — observabilidade + delegação.
   *
   * A ativação da Subscription é feita de forma síncrona, idempotente e
   * transacional por `PaymentService.processPaymentEffects` (fonte única),
   * chamado por todos os caminhos de confirmação (webhook PIX, cartão, manual,
   * sync, cron). Ativar aqui de novo causaria dupla-escrita — por isso este
   * handler NÃO ativa mais, apenas registra o recebimento.
   *
   * Sprint de Notificações — central (2026-10-04): as notificações
   * in-app + e-mail de "novo perfil" / "perfil adicional" agora são
   * responsabilidade do `UserNotificationService.onPlanPaymentConfirmed`
   * (que escuta o mesmo evento `payment.confirmed`).
   */
  @OnEvent(PaymentEvents.CONFIRMED)
  handlePaymentConfirmed(payload: PaymentConfirmedEvent): void {
    const payment = payload?.payment;
    if (!payment) return;
    if (payment.purpose === 'SUBSCRIPTION') {
      this.logger.log(
        `Evento payment.confirmed recebido para subscription ${payment.subscriptionId ?? '?'} (ativação feita pelo PaymentService; notif delegada ao UserNotificationService)`,
      );
    }
  }

  /**
   * Listener: cancela Subscription quando Payment eh cancelado.
   *
   * Fase v3 do Hub de Pagamentos (2026-07-23). Quando um pagamento de
   * assinatura eh cancelado (admin, webhook C6, etc), a subscription
   * vinculada volta para INACTIVE.
   *
   * Idempotente: se ja CANCELED/INACTIVE, no-op.
   */
  @OnEvent(PaymentEvents.CANCELLED)
  async handlePaymentCancelled(payload: PaymentCancelledEvent): Promise<void> {
    const payment = payload?.payment;
    const reason = payload?.reason;
    if (!payment || payment.purpose !== 'SUBSCRIPTION') return;
    const paymentId = payment.id;
    const subId = payment.subscriptionId;
    if (!subId) {
      this.logger.warn(`Payment ${paymentId} CANCELLED mas sem subscriptionId`);
      return;
    }
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subId },
    });
    if (!sub) {
      this.logger.warn(
        `Subscription ${subId} nao encontrada (payment ${paymentId} CANCELLED)`,
      );
      return;
    }
    if (sub.status === 'CANCELED') {
      this.logger.log(
        `Subscription ${sub.id} ja esta ${sub.status} (idempotente, payment ${paymentId} CANCELLED)`,
      );
      return;
    }
    const oldStatus = sub.status;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED' },
    });
    this.logger.log(
      `Subscription ${sub.id} cancelada via evento payment.cancelled (${oldStatus} -> CANCELED, motivo: ${reason ?? 'N/A'})`,
    );

    await this.audit.log({
      userId: sub.userId,
      action: 'SUBSCRIPTION_CANCELED_VIA_PAYMENT',
      entity: 'Subscription',
      entityId: String(sub.id),
      oldValue: { status: oldStatus },
      newValue: { status: 'CANCELED', reason: reason ?? null, paymentId },
    });
  }

  async validateUserPlan(userId: number, planId: number): Promise<void> {
    // busca assinatura ativa do usuário para o plano específico
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE',
        planId: planId,
        expiresAt: {
          gt: new Date(), // maior que a data atual (não expirado)
        },
      },
      include: {
        plan: true,
      },
    });

    // valida se encontrou assinatura válida
    if (!subscription) {
      throw new ForbiddenException(
        `Acesso negado. Você precisa de um plano ativo "${planId}" para acessar este recurso.`,
      );
    }
  }

  /**
   * Cria uma nova assinatura
   * @name create
   * @description Cria uma assinatura para um usuário com base em um plano
   *
   * @param createSubscriptionDto Dados da assinatura a ser criada
   */

  /**
   * Lista todas as subscriptions de um usuario com plan + payments.
   * Usado pela tela /profile/plans para gerenciar planos ativos, ver
   * data de aquisicao/vencimento e historico de compras.
   * (decisao 2026-09-06 — wireframe /profile/plans).
   *
   * Ordenacao:
   * - subscriptions mais recentes primeiro (createdAt desc)
   * - payments mais recentes primeiro dentro de cada subscription
   *
   * @param userId ID do usuario
   */
  async findHistoryByUser(userId: number) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async create(data: CreateSubscriptionDto, authenticatedUserId?: number) {
    try {
      // O userId do body é legado/documental. Em requisições HTTP, a
      // identidade confiável é sempre a sessão validada pelo AuthGuard.
      const userId = authenticatedUserId ?? data.userId;

      // Regra CASE.md §Planos: bloqueia compra duplicada do MESMO plano.
      // Um usuário pode ter múltiplas assinaturas para planos DIFERENTES
      // (ex.: FUNDADOR + INVESTIDOR) — perfis complementares.
      const existingActive = await this.prisma.subscription.findFirst({
        where: {
          userId,
          planId: data.planId,
          status: 'ACTIVE',
        },
      });
      if (existingActive) {
        await this.audit.log({
          userId,
          action: 'SUBSCRIPTION_DUPLICATE_BLOCKED',
          entity: 'Subscription',
          entityId: existingActive.id,
          oldValue: {
            userId,
            planId: data.planId,
            status: 'ACTIVE',
          },
        });
        this.logger.warn(
          `Compra bloqueada: userId=${data.userId} já possui Subscription ACTIVE #${existingActive.id} para planId=${data.planId}`,
        );
        throw new ConflictException(
          'Você já possui este plano ativo. Para trocar, cancele o plano atual em /pricing.',
        );
      }

      // Busca o plano para obter o período em meses
      const plan = await this.prisma.plan.findUnique({
        where: { id: data.planId },
      });

      if (!plan) {
        return ResponseDto.error('Plano não encontrado', 404);
      }

      // Define a data de início (hoje ou a informada)
      const startedAt = new Date();

      // Calcula a data de expiração baseada no período do plano
      const expiresAt = new Date(startedAt);
      expiresAt.setMonth(expiresAt.getMonth() + plan.periodoMeses);

      // Cria a assinatura com as datas calculadas
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planId: data.planId,
          status: data.status,
          startedAt,
          expiresAt,
        },
      });

      await this.audit.log({
        userId,
        action: 'SUBSCRIPTION_CREATED',
        entity: 'Subscription',
        entityId: String(subscription.id),
        newValue: {
          planId: data.planId,
          status: data.status,
          startedAt: startedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      });

      // Re-sync Redis após criar subscription PENDING para que o próximo
      // GET /users/me (via AuthGuard.getSession) já enxergue a nova sub
      // sem depender do ciclo `payment.confirmed` (Sprint fix cache-stale).
      await this.refreshUserSubscriptions(userId);

      return ResponseDto.success(
        'Assinatura criada com sucesso',
        201,
        subscription,
      );
    } catch (error) {
      // Re-raise explícito: ConflictException (regra CASE.md §Planos),
      // HttpException (validações de domínio) e NotFoundException
      // (plano inexistente) devem propagar até o filtro HTTP do NestJS
      // para gerar o status code correto (409/404/etc) — não devem
      // ser engolidos pelo catch genérico abaixo.
      if (
        error instanceof ConflictException ||
        error instanceof HttpException
      ) {
        throw error;
      }
      return ResponseDto.error('Erro ao criar assinatura', 500, error);
    }
  }

  /**
   * Lista todas as assinaturas com paginação e busca
   * @name findAll
   * @description Retorna todas as assinaturas do sistema com filtro de busca
   */
  async findAll(
    query: { page?: number; limit?: number; search?: string },
    userId?: number,
  ) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 25;

      const where: any = userId === undefined ? {} : { userId };

      const search = query.search?.trim();
      if (search) {
        where.OR = [
          { user: { nome: { contains: search } } },
          { plan: { slug: { contains: search } } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.subscription.findMany({
          where,
          take: limit,
          skip: (page - 1) * limit,
          select: {
            id: true,
            startedAt: true,
            expiresAt: true,
            status: true,
            plan: {
              select: {
                slug: true,
                isActive: true,
                periodoMeses: true,
                preco: true,
              },
            },
            user: {
              select: {
                id: true,
                nome: true,
              },
            },
          },
          orderBy: { startedAt: 'desc' },
        }),
        this.prisma.subscription.count({ where }),
      ]);

      return ResponseDto.success(
        'Assinaturas carregadas com sucesso',
        200,
        data,
        total,
        page,
      );
    } catch (error) {
      return ResponseDto.error(
        'Error ao carregar as subscription',
        Number(error.status),
        error.message,
      );
    }
  }

  /**
   * Busca uma assinatura específica
   * @name findOne
   * @description Busca uma assinatura por ID
   *
   * @param id ID da assinatura
   */
  async findOne(id: number, userId?: number) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        include: {
          payments: true,
          plan: true,
          user: true,
        },
      });

      if (
        !subscription ||
        (userId !== undefined && subscription.userId !== userId)
      ) {
        return ResponseDto.error('Assinatura não encontrada', 404);
      }

      return ResponseDto.success(
        'Assinatura carregada com sucesso',
        200,
        subscription,
      );
    } catch (error) {
      return ResponseDto.error(
        'Error ao carregar a subscription',
        Number(error.status),
        error.message,
      );
    }
  }

  /**
   * Atualiza uma assinatura
   * @name update
   * @description Atualiza os dados de uma assinatura existente
   *
   * @param id ID da assinatura
   * @param updateSubscriptionDto Dados a serem atualizados
   */
  async update(id: number, updateSubscriptionDto: UpdateSubscriptionDto) {
    try {
      const safeData = { ...updateSubscriptionDto };
      delete safeData.userId;
      const subscription = await this.prisma.subscription.update({
        where: { id },
        data: safeData,
      });

      return ResponseDto.success(
        'Assinatura atualizada com sucesso',
        200,
        subscription,
      );
    } catch (error) {
      return ResponseDto.error(
        'Error ao atualizar a subscription',
        Number(error.status),
        error.message,
      );
    }
  }

  /**
   * Remove uma assinatura
   * @name remove
   * @description Remove uma assinatura do sistema
   *
   * @param id ID da assinatura
   */
  async remove(id: number, userId?: number) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (
        !subscription ||
        (userId !== undefined && subscription.userId !== userId)
      ) {
        return ResponseDto.error('Assinatura não encontrada', 404);
      }

      await this.prisma.subscription.delete({
        where: { id },
      });

      return ResponseDto.success('Assinatura removida com sucesso', 200);
    } catch (error) {
      return ResponseDto.error(
        'Error ao remover a subscription',
        Number(error.status),
        error.message,
      );
    }
  }

  /**
   * Atualiza as subscriptions públicas armazenadas nas sessões Redis do usuário.
   *
   * A operação é best-effort: o banco é a fonte de verdade do cancelamento e
   * uma falha transitória do Redis não deve transformar uma mutação já concluída
   * em erro HTTP. A consulta relê todas as subscriptions para preservar outros
   * planos que o usuário possa ter.
   */
  private async refreshUserSubscriptions(userId: number): Promise<void> {
    try {
      const subscriptions = await this.prisma.subscription.findMany({
        where: { userId },
        include: { plan: { select: { id: true, nome: true, slug: true } } },
        take: 20,
      });

      const projected = subscriptions.map((subscription) => ({
        id: subscription.id,
        userId: subscription.userId,
        planId: subscription.planId,
        status: subscription.status,
        startedAt: subscription.startedAt ?? null,
        expiresAt: subscription.expiresAt ?? null,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
        plan: subscription.plan
          ? {
              id: subscription.plan.id,
              nome: subscription.plan.nome,
              slug: subscription.plan.slug,
            }
          : { id: subscription.planId, nome: '', slug: '' },
      }));

      const count = await this.sessionService.refreshUserSubscriptions(
        userId,
        projected,
      );
      this.logger.log(
        `Sessões atualizadas para user ${userId} pós-cancelamento (count=${count})`,
      );
    } catch (error) {
      this.logger.warn(
        `Falha ao atualizar sessão do user ${userId} pós-cancelamento: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Auto-cancelamento — usuário cancela a própria assinatura (ex: ao trocar
   * de plano via /pricing). Valida que a Subscription pertence ao user antes
   * de cancelar. Igual ao `cancelByAdmin` no efeito (status=CANCELED,
   * expiresAt=now, sem reembolso). Audit log com action distinta.
   */
  async cancelOwn(subscriptionId: number, userId: number, request?: Request) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) {
      throw new HttpException(
        'Assinatura não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }
    if (sub.userId !== userId) {
      throw new HttpException('Acesso negado', HttpStatus.FORBIDDEN);
    }
    if (sub.status === 'CANCELED') {
      await this.refreshUserSubscriptions(userId);
      return ResponseDto.success('Assinatura já estava CANCELED', 200, sub);
    }

    const oldValue = { status: sub.status, expiresAt: sub.expiresAt };
    const now = new Date();
    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELED', expiresAt: now },
    });

    await this.audit.log({
      userId,
      action: 'SUBSCRIPTION_USER_CANCEL',
      entity: 'Subscription',
      entityId: sub.id,
      oldValue,
      newValue: { status: 'CANCELED', expiresAt: now },
      request,
    });

    await this.refreshUserSubscriptions(userId);

    this.logger.log(
      `Subscription ${subscriptionId} cancelada pelo próprio user ${userId} (auto-cancel)`,
    );
    return ResponseDto.success('Assinatura cancelada', 200, updated);
  }

  /**
   * Cancelamento manual pelo painel financeiro. Marca a Subscription como
   * CANCELED e força `expiresAt = now` — efeito imediato: o user perde
   * acesso na próxima request (o `ensureActivePlan` do layout vai redirecionar
   * pra `/pricing`). Decisão de design da Fase 3: cancelar revoga acesso
   * imediato em vez de aproveitar o período pago.
   *
   * Idempotente: CANCELED → no-op.
   */
  async cancelByAdmin(
    subscriptionId: number,
    actorUserId: number,
    justification: string,
    request?: Request,
  ) {
    if (!justification || justification.trim().length < 10) {
      throw new HttpException(
        'Justificativa é obrigatória e deve ter ao menos 10 caracteres',
        HttpStatus.BAD_REQUEST,
      );
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) {
      throw new HttpException(
        'Assinatura não encontrada',
        HttpStatus.NOT_FOUND,
      );
    }
    if (sub.status === 'CANCELED') {
      return ResponseDto.success('Assinatura já estava CANCELED', 200, sub);
    }

    const oldValue = {
      status: sub.status,
      expiresAt: sub.expiresAt,
    };
    const now = new Date();
    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'CANCELED',
        expiresAt: now,
      },
    });

    await this.audit.log({
      userId: actorUserId,
      action: 'SUBSCRIPTION_CANCEL',
      entity: 'Subscription',
      entityId: sub.id,
      oldValue,
      newValue: {
        status: 'CANCELED',
        expiresAt: now,
        justification: justification.trim(),
      },
      request,
    });

    this.logger.warn(
      `Subscription ${subscriptionId} cancelada por user ${actorUserId} (status anterior: ${sub.status})`,
    );

    return ResponseDto.success('Assinatura cancelada', 200, updated);
  }
}
