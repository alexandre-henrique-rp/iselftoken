import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';
import { NotificationsService } from 'src/api/notifications/notifications.service';
import { NotificationType } from 'src/api/notifications/dto/query-notifications.dto';
import { buildMultilineDescription } from 'src/api/notifications/description.helpers';

/**
 * S1-T09 — Serviço de notificações do fluxo da startup.
 *
 * Reflete o padrão de notificações por etapa descrito em
 * `scripts/startups/fluxo_startup.md` (§2 "Notificações ao concluir cada etapa"):
 *  (a) conclusão da etapa, (b) próximos passos, (c) pendência financeira
 *  (quando houver) e (d) notificação específica ao confirmar um pagamento.
 *
 * Estratégia (igual ao RepassesNotificationService):
 *  - Notificação IN-APP via NotificationsService (persistida — sempre disparada).
 *  - E-mail best-effort via EmailService.sendTemplateBySlug (log em caso de
 *    falha; nunca lança para não quebrar o fluxo de negócio).
 *  - Escuta eventos de domínio (@OnEvent) emitidos pelos serviços do fluxo,
 *    mantendo baixo acoplamento com payment/startup/campaign services.
 *
 * LGPD: nunca loga CPF/e-mail/telefone em texto livre — apenas ids opacos.
 */
@Injectable()
export class StartupNotificationService {
  private readonly logger = new Logger(StartupNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────

  /**
   * Nome exibido quando o founder não tem nome preenchido. Evita que os
   * templates (que escapam valores via `escapeHtml`, convertendo `undefined`
   * na string literal "undefined") exibam "Olá, undefined".
   */
  private static readonly FOUNDER_NAME_FALLBACK = 'fundador(a)';

  /** Carrega founder (id + nome + email) e nome da startup. */
  private async loadStartup(startupId: number): Promise<{
    founderId: number;
    founderName: string;
    founderEmail: string | null;
    startupName: string;
  } | null> {
    const startup = await this.prisma.startup.findUnique({
      where: { id: startupId },
      select: {
        nome: true,
        founderId: true,
        founder: { select: { nome: true, email: true } },
      },
    });
    if (!startup) return null;
    return {
      founderId: startup.founderId,
      founderName:
        startup.founder?.nome?.trim() ||
        StartupNotificationService.FOUNDER_NAME_FALLBACK,
      founderEmail: startup.founder?.email ?? null,
      startupName: startup.nome,
    };
  }

  /** Cria a notificação in-app; loga (sem PII) em caso de erro. */
  private async notifyInApp(
    userId: number,
    title: string,
    description: string,
    type: NotificationType = NotificationType.GENERAL,
  ): Promise<void> {
    try {
      await this.notifications.create(userId, title, description, type);
    } catch (err) {
      this.logger.error(
        `Falha ao criar notificação in-app (user=${userId}): ${
          (err as Error).message
        }`,
      );
    }
  }

  /** Envia e-mail por template (best-effort). */
  private async notifyEmail(
    to: string | null,
    slug: string,
    ctx: Record<string, unknown>,
  ): Promise<void> {
    if (!to) return;
    try {
      const result = await this.email.sendTemplateBySlug(to, slug, ctx);
      if (!result.success) {
        this.logger.warn(`E-mail "${slug}" não enviado: ${result.message}`);
      }
    } catch (err) {
      this.logger.error(
        `Erro ao enviar e-mail "${slug}": ${(err as Error).message}`,
      );
    }
  }

  /**
   * Dispara o e-mail em modo fire-and-forget: a notificação in-app (sempre
   * aguardada ANTES desta chamada) e o push WebSocket chegam primeiro, sem
   * ficar bloqueados pela latência do SMTP. O envio continua best-effort —
   * `notifyEmail` já trata/loga qualquer falha, então o `.catch` aqui é apenas
   * defesa extra contra rejeições não previstas (nunca propaga).
   */
  private dispatchEmail(
    to: string | null,
    slug: string,
    ctx: Record<string, unknown>,
  ): void {
    void this.notifyEmail(to, slug, ctx).catch((err) => {
      this.logger.error(
        `Erro inesperado no envio fire-and-forget "${slug}": ${
          (err as Error).message
        }`,
      );
    });
  }

  // ─── Fase 1 — Cadastro + Reserva ───────────────────────────────

  /**
   * startup.stage1.completed — Fase 1 concluída (cadastro criado + reserva
   * pendente de pagamento). Dispara conclusão + próximos passos + pendência
   * financeira (fluxo_startup §1).
   */
  @OnEvent('startup.stage1.completed')
  async onStage1Completed(payload: { startupId: number }): Promise<void> {
    const s = await this.loadStartup(payload.startupId);
    if (!s) return;

    await this.notifyInApp(
      s.founderId,
      'Startup criada com sucesso!',
      buildMultilineDescription(
        `Sua startup ${s.startupName} foi criada e reservada.`,
        'Conclua o pagamento da reserva do token para avançar.',
      ),
      NotificationType.GENERAL,
    );
    await this.notifyInApp(
      s.founderId,
      'Próximo passo: concluir cadastro',
      buildMultilineDescription(
        'Complete seu cadastro para publicar a captação.',
        'A Fase 2 é liberada após a confirmação do pagamento da reserva.',
      ),
      NotificationType.GENERAL,
    );
    await this.notifyInApp(
      s.founderId,
      'Pendência financeira: reserva do token',
      buildMultilineDescription(
        'A reserva do token está pendente de pagamento.',
        'Acesse a Central de Pendências para pagar ou gerar um novo pagamento.',
      ),
      NotificationType.GENERAL,
    );
    this.dispatchEmail(s.founderEmail, 'startup-etapa1-concluida', {
      startupName: s.startupName,
    });
  }

  // ─── Fase 2 — Cadastro completo (docs + termo) ─────────────────

  /**
   * startup.stage2.completed — Cadastro completo enviado para pré-análise
   * do Compliance.
   *
   * BUG-FT-004 (B2): a pendência da Taxa de Compliance **não** é mais
   * disparada aqui — ela migrou para `onStage3Completed` (Fase 3 = Detalhes
   * de Captação preenchidos). A Taxa de Compliance só é gerada após o
   * compliance liberar a Fase 2 e o founder preencher a Fase 3.
   */
  @OnEvent('startup.stage2.completed')
  async onStage2Completed(payload: { startupId: number }): Promise<void> {
    const s = await this.loadStartup(payload.startupId);
    if (!s) return;

    await this.notifyInApp(
      s.founderId,
      'Fase 2 concluída: cadastro enviado',
      buildMultilineDescription(
        `O preenchimento de ${s.startupName} foi concluído e enviado para a pré-análise do Compliance.`,
        'Aguarde a revisão: ela será realizada em até 3 dias úteis.',
        'Após a aprovação, a Fase 3 será liberada.',
      ),
      NotificationType.GENERAL,
    );
    this.dispatchEmail(s.founderEmail, 'startup-etapa2-concluida', {
      startupName: s.startupName,
    });
  }

  // ─── Fase 3 — Detalhes de captação (campanha DRAFT) ────────────

  /**
   * startup.stage3.completed — Detalhes de Captação preenchidos (campanha
   * DRAFT). Validação do Compliance é a última fase antes de liberar a
   * captação (fluxo_startup §3).
   *
   * BUG-FT-004 (B2): a partir daqui o sistema gera a Taxa de Compliance e
   * o founder deve pagá-la para destravar o gate final. Notificamos a
   * pendência financeira E disparamos o e-mail `startup-pagamento-confirmado`
   * (com `purposeLabel='O pagamento da Taxa de Compliance'`) para orientar
   * o próximo passo.
   *
   * O e-mail usa o template `startup-pagamento-confirmado` (mesmo do fluxo
   * de pagamento confirmado) com `purposeLabel` — o template espera esse
   * campo (não `purpose`) para evitar `escapeHtml(undefined)` → string
   * `'undefined'` no corpo do e-mail (BUG-FT-004 B3).
   */
  @OnEvent('startup.stage3.completed')
  async onStage3Completed(payload: { startupId: number }): Promise<void> {
    const s = await this.loadStartup(payload.startupId);
    if (!s) return;

    await this.notifyInApp(
      s.founderId,
      'Quase lá: captação pronta para validação',
      buildMultilineDescription(
        `Os detalhes de captação de ${s.startupName} foram preenchidos.`,
        'O Compliance validará se está dentro dos padrões da plataforma.',
      ),
      NotificationType.GENERAL,
    );
    await this.notifyInApp(
      s.founderId,
      'Pendência financeira: Taxa de Compliance',
      buildMultilineDescription(
        'Há uma Taxa de Compliance a pagar para destravar o gate final.',
        'Encontre-a no card do dashboard → Central de Pendências.',
      ),
      NotificationType.GENERAL,
    );
    this.dispatchEmail(s.founderEmail, 'startup-etapa3-concluida', {
      startupName: s.startupName,
    });
    this.dispatchEmail(s.founderEmail, 'startup-pagamento-confirmado', {
      startupName: s.startupName,
      purposeLabel: 'O pagamento da Taxa de Compliance',
    });
  }

  // ─── Pagamento confirmado (qualquer etapa) ──────────────────────

  /**
   * startup.payment.confirmed — Pagamento (reserva / taxa de compliance /
   * fast track) confirmado (status PAID). Notificação específica que
   * parabeniza o pagamento e libera o próximo passo (fluxo_startup §2).
   */
  @OnEvent('startup.payment.confirmed')
  async onPaymentConfirmed(payload: {
    startupId: number;
    purpose?: string;
  }): Promise<void> {
    const s = await this.loadStartup(payload.startupId);
    if (!s) return;

    const label = this.purposeLabel(payload.purpose);
    await this.notifyInApp(
      s.founderId,
      'Pagamento confirmado!',
      buildMultilineDescription(
        `${label} de ${s.startupName} foi confirmado com sucesso.`,
        'Você já pode seguir para o próximo passo.',
      ),
      NotificationType.GENERAL,
    );
    // BUG-FT-004 (B3): template + mapDataForDbTemplate esperam `purposeLabel`.
    // Antes passávamos `purpose` → template renderizava "undefined" no body.
    this.dispatchEmail(s.founderEmail, 'startup-pagamento-confirmado', {
      startupName: s.startupName,
      purposeLabel: label,
    });
  }

  // ─── Gate final — aprovação/rejeição do Compliance ──────────────

  /**
   * startup.approved — Startup aprovada no gate final; founder pode iniciar
   * a captação (fluxo_startup §5/§6). SÓ é emitido pelo AdminService quando
   * a campanha realmente abriu (DRAFT → OPEN), após todos os gates de Fase 3
   * estarem satisfeitos (CASE.md [Aprovação por Fases]).
   */
  @OnEvent('startup.approved')
  async onStartupApproved(payload: {
    startupId: number;
    fastDeploy?: boolean;
    scheduled?: boolean;
    scheduledPublishAt?: string | null;
    publishedNow?: boolean;
  }): Promise<void> {
    const s = await this.loadStartup(payload.startupId);
    if (!s) return;

    // Mensagem in-app condicional: publicação imediata (FAST_DEPLOY ou já
    // publicada pelo cron) vs agendada (+24h).
    const jaNoAr = payload.fastDeploy === true || payload.publishedNow === true;
    const inAppMsg = jaNoAr
      ? buildMultilineDescription(
          `${s.startupName} foi aprovada e já está publicada no marketplace.`,
          'Você já pode acompanhar a captação.',
        )
      : buildMultilineDescription(
          `${s.startupName} foi aprovada pelo Compliance.`,
          'Sua startup será publicada no marketplace em até 24h.',
        );

    await this.notifyInApp(
      s.founderId,
      'Startup aprovada!',
      inAppMsg,
      NotificationType.STARTUP_APPROVED,
    );
    // In-app já persistida/emitida (WS) acima; e-mail segue fire-and-forget
    // para não atrasar a notificação interna com a latência do SMTP.
    this.dispatchEmail(s.founderEmail, 'startup-aprovada', {
      founderName: s.founderName,
      startupName: s.startupName,
      // Imediata quando FAST_DEPLOY OU quando o cron já publicou (publishedNow).
      fastDeploy: jaNoAr,
      scheduledPublishAt: payload.scheduledPublishAt ?? null,
    });
  }

  /**
   * startup.phase_approved — Fase do Compliance aprovada SEM abrir a captação
   * (gate ainda não satisfeito). Disparado em:
   *  - Fase 1 ou 2 aprovada (sempre — apenas auditoria).
   *  - Fase 3 aprovada mas DRAFT vazia ou COMPLIANCE_FEE não paga.
   *
   * Notifica o founder para ele entender o estado atual e o próximo passo
   * (preencher captação ou pagar taxa). Caso legado: phase=null.
   */
  @OnEvent('startup.phase_approved')
  async onPhaseApproved(payload: {
    startupId: number;
    phase: number | null;
    campaignOpened: boolean;
    reason?: string;
  }): Promise<void> {
    const s = await this.loadStartup(payload.startupId);
    if (!s) return;

    const phaseLabel = payload.phase ? `Fase ${payload.phase}` : 'Auditoria';

    let nextStep: string;
    if (payload.reason === 'draft_campaign_not_filled') {
      nextStep =
        'Preencha os parâmetros de captação (meta, valuation, preço do token, quantidade) para liberar a Fase 3.';
    } else if (payload.reason === 'compliance_fee_not_paid') {
      nextStep =
        'Quite a Taxa de Compliance na Central de Pendências para liberar a captação.';
    } else if (payload.phase === 1) {
      nextStep =
        'Complete os documentos e a edição do cadastro para avançar para a Fase 2.';
    } else if (payload.phase === 2) {
      nextStep =
        'Preencha os parâmetros de captação (Fase 3) para que o Compliance faça a análise final.';
    } else {
      nextStep = 'Aguarde a próxima fase do fluxo.';
    }

    await this.notifyInApp(
      s.founderId,
      `${phaseLabel} aprovada`,
      buildMultilineDescription(
        `${s.startupName}: ${phaseLabel} aprovada.`,
        `Próximo passo — ${nextStep}`,
      ),
      NotificationType.PHASE_APPROVED,
    );

    // E-mail complementar (Sprint de Notificações — central).
    // Antes só tinha in-app; agora também dispara e-mail para garantir que
    // o founder seja notificado fora do app.
    this.dispatchEmail(s.founderEmail, 'fase-aprovada', {
      founderName: s.founderName,
      startupName: s.startupName,
      phaseLabel,
      nextStep,
    });
  }

  /**
   * startup.rejected — Startup rejeitada; founder revisa pendências e
   * resubmete (fluxo_startup §5).
   */
  @OnEvent('startup.rejected')
  async onStartupRejected(payload: {
    startupId: number;
    reason?: string;
  }): Promise<void> {
    const s = await this.loadStartup(payload.startupId);
    if (!s) return;

    const reason =
      payload.reason?.trim() || 'Verifique as pendências apontadas.';
    await this.notifyInApp(
      s.founderId,
      'Ajustes solicitados pelo Compliance',
      buildMultilineDescription(
        `${s.startupName}: ${reason}`,
        'Revise as pendências e reenvie para nova análise.',
      ),
      NotificationType.STARTUP_REJECTED,
    );
    // In-app primeiro; e-mail fire-and-forget (best-effort).
    this.dispatchEmail(s.founderEmail, 'startup-rejeitada', {
      founderName: s.founderName,
      startupName: s.startupName,
      reason,
    });
  }

  // ─── Rejeição de documento individual (Etapa 2 / fluxo_startup §2) ──

  /**
   * startup.document.rejected — Um documento específico da startup foi
   * rejeitado pelo Admin/Compliance na análise (etapa 2). O founder precisa
   * ser avisado com o nome do documento e o motivo para poder reenviá-lo.
   *
   * Diferente de `startup.rejected` (que reprova a startup inteira), este
   * evento é granular por documento. Notificação in-app (persistida + push
   * WebSocket) + e-mail best-effort.
   */
  @OnEvent('startup.document.rejected')
  async onDocumentRejected(payload: {
    startupId: number;
    categoria?: string;
    documentName?: string;
    reason?: string;
    rejectedById?: number;
    rejectedAt?: Date;
  }): Promise<void> {
    const s = await this.loadStartup(payload.startupId);
    if (!s) return;

    const docLabel = payload.documentName?.trim();
    const categoria = payload.categoria?.trim();
    const reason =
      payload.reason?.trim() || 'Verifique as observações do Compliance.';

    // Mensagem inclui a categoria do doc rejeitado para o founder saber
    // exatamente onde re-enviar o substituto (banner na UI lê isso também).
    const description = docLabel
      ? `${s.startupName}: o documento "${docLabel}" (${categoria ?? 'categoria não informada'}) foi rejeitado. Motivo: ${reason} Acesse "Documentação" para reenviar.`
      : `${s.startupName}: um documento (${categoria ?? 'categoria não informada'}) foi rejeitado. Motivo: ${reason} Acesse "Documentação" para reenviar.`;

    await this.notifyInApp(
      s.founderId,
      'Documento rejeitado',
      description,
      NotificationType.STARTUP_REJECTED,
    );
    // In-app primeiro; e-mail fire-and-forget (best-effort).
    this.dispatchEmail(s.founderEmail, 'startup-documento-rejeitado', {
      founderName: s.founderName,
      startupName: s.startupName,
      documentName: docLabel ?? '',
      categoria: categoria ?? '',
      reason,
    });
  }

  private purposeLabel(purpose?: string): string {
    switch (purpose) {
      case 'TOKEN_RESERVATION':
        return 'O pagamento da reserva do token';
      case 'COMPLIANCE_FEE':
        return 'O pagamento da Taxa de Compliance';
      case 'VERIFICATION_SEAL':
        return 'O pagamento do selo de verificação';
      default:
        return 'O pagamento';
    }
  }
}
