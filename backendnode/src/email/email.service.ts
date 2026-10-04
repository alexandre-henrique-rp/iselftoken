import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailTemplatesService } from '../api/email-templates/email-templates.service';
import { escapeHtml } from './email-template-security';
import {
  forgotPasswordTemplate,
  ForgotPasswordTemplateData,
  kycApprovedTemplate,
  KycApprovedTemplateData,
  KycResubmissionRequestedData,
  kycResubmissionRequestedTemplate,
  newLoginAlertTemplate,
  NewLoginAlertTemplateData,
  phaseApprovedTemplate,
  PhaseApprovedTemplateData,
  planAddedTemplate,
  PlanAddedTemplateData,
  planPurchasedTemplate,
  PlanPurchasedTemplateData,
  startupAprovadaTemplate,
  StartupAprovadaTemplateData,
  startupDocumentoRejeitadoTemplate,
  StartupDocumentoRejeitadoTemplateData,
  startupEtapa1ConcluidaTemplate,
  startupEtapa2ConcluidaTemplate,
  startupEtapa3ConcluidaTemplate,
  StartupEtapaTemplateData,
  startupPagamentoConfirmadoTemplate,
  StartupPagamentoTemplateData,
  startupRejeitadaTemplate,
  StartupRejeitadaTemplateData,
  tokenPurchaseTemplate,
  TokenPurchaseTemplateData,
  userApprovedTemplate,
  UserApprovedTemplateData,
  userSuspendedTemplate,
  UserSuspendedTemplateData,
  ValidationEmailTemplateData,
  verificationCodeTemplate,
  VerificationCodeTemplateData,
  welcomeTemplate,
  WelcomeTemplateData,
} from './templates';

/**
 * Tipos de email suportados pelo serviço
 * - template: Usa um template HTML pré-definido
 * - simple: Texto simples convertido para HTML
 * - html: HTML fornecido diretamente
 */
type EmailType = 'template' | 'simple' | 'html';

/**
 * Interface para configuração do envio de email
 *
 * @interface SendEmailOptions
 * @property to Email do destinatário
 * @property subject Assunto do email
 * @property type Tipo de processamento do conteúdo
 * @property text Conteúdo (nome do template ou HTML/texto)
 * @property data Dados para preenchimento do template (opcional)
 */
interface SendEmailOptions {
  to: string | string[];
  subject: string;
  type: EmailType;
  text: string;
  data?: any;
}

/**
 * Serviço responsável pelo envio de emails utilizando AWS SES
 *
 * Este serviço gerencia o envio de emails transacionais através do Amazon Simple Email Service.
 * Suporta templates HTML, emails simples e personalizados.
 *
 * @author iSelfToken Team
 * @version 1.0.0
 * @since 13/01/2026
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name, { timestamp: true });
  // LOW-03 (audit): CC_LIST hardcoded com emails pessoais (gmail/hotmail)
  // viola LGPD (CC recebe IP, userAgent, timestamp em cada email).
  // Agora configuravel via EMAIL_CC_LIST env var (CSV). Vazio por padrao
  // em prod — equipe usa dashboards internos (Sentry, audit log) para
  // acompanhamento em vez de CC de email.
  private readonly ccList: string[];

  private transporter: Transporter;
  private fromEmail: string;
  constructor(
    private readonly configService: ConfigService,
    @Optional()
    @Inject(EmailTemplatesService)
    private readonly emailTemplates?: EmailTemplatesService,
  ) {
    this.ccList = this.parseEmailList(
      this.configService.get<string>('EMAIL_CC_LIST') ?? '',
    );
    this.initializeSMTP();
  }

  private parseEmailList(value: string): string[] {
    return [
      ...new Set(
        value
          .split(',')
          .map((address) => address.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
  }

  /**
   * Inicializa o transporte SMTP da AWS SES com as credenciais configuradas
   *
   * Lê as variáveis de ambiente:
   * - SMTP_HOST: Endpoint SMTP do SES
   * - SMTP_PORT: Porta SMTP (587 para STARTTLS ou 465 para TLS direto)
   * - SMTP_USER: Usuário SMTP
   * - SMTP_PASS: Senha SMTP
   * - SMTP_SECURE: true para TLS direto; false para STARTTLS
   * - SMTP_FROM_EMAIL: Email remetente (deve estar verificado no SES)
   *
   * Caso as credenciais não sejam encontradas, o serviço é desabilitado
   * e um warning é registrado no log.
   */
  private initializeSMTP() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT', '587'));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromEmail = this.configService.get<string>(
      'SMTP_FROM_EMAIL',
      'naoresponda@iselftoken.info',
    );

    if (!host || !user || !pass) {
      this.logger.warn(
        `[SMTP] Transporte desabilitado | hostConfigured=${Boolean(host)} | port=${port} | userConfigured=${Boolean(user)} | passwordConfigured=${Boolean(pass)}`,
      );
      return;
    }

    const secure =
      this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { minVersion: 'TLSv1.2' },
    });

    this.logger.log(
      `[SMTP] Transporte inicializado | port=${port} | secure=${secure} | fromConfigured=${Boolean(this.fromEmail)}`,
    );
  }

  /**
   * Maps hardcoded template data to database template variable format.
   * Each mapper converts the data shape expected by the hardcoded template
   * to the variable names used in the database template.
   */
  private mapDataForDbTemplate(
    slug: string,
    data: any,
  ): Record<string, any> | null {
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    const mappers: Record<string, (d: any) => Record<string, any>> = {
      welcome: (d) => ({
        userName: d.nome,
        loginUrl: `${frontendUrl}/login`,
      }),
      'verification-code': (d) => ({
        userName: d.nome,
        code: d.codigo,
        expiresInMinutes: d.expiresIn ?? 5,
      }),
      'forgot-password': (d) => ({
        userName: d.nome,
        resetUrl: d.resetUrl,
        expiresInMinutes: d.expiresInMinutes ?? 15,
      }),
      'validation-email': (d) => ({
        userName: d.nome || d.email,
        validationUrl: `${frontendUrl}/auth/validate-email?token=${encodeURIComponent(d.token)}&type=${encodeURIComponent(d.type)}`,
        expiresInHours: 24,
      }),
      'new-login-alert': (d) => ({
        userName: d.userName ?? d.nome,
        timestamp: d.timestamp,
        ip: d.ip,
        ipContext: d.ipContext,
        deviceLabel: d.deviceLabel,
        locationLabel: d.locationLabel,
        reason: d.reason,
        confirmUrl: d.confirmUrl,
        dismissUrl: d.dismissUrl,
      }),
      'rejection-notification': (d) => ({
        userName: d.founderName,
        reason: d.reason,
        contextUrl: d.redirectUrl,
      }),
      'kyc-resubmission-requested': (d) => ({
        userName: d.userName,
        documentName: d.documentName,
        reason: d.reason,
        redirectUrl: d.redirectUrl,
      }),
      'startup-etapa1-concluida': (d) => ({
        startupName: d.startupName,
      }),
      'startup-etapa2-concluida': (d) => ({
        startupName: d.startupName,
      }),
      'startup-etapa3-concluida': (d) => ({
        startupName: d.startupName,
      }),
      'startup-pagamento-confirmado': (d) => ({
        startupName: d.startupName,
        purposeLabel: d.purposeLabel,
      }),
      'startup-aprovada': (d) => ({
        founderName: d.founderName,
        startupName: d.startupName,
        fastDeploy: d.fastDeploy,
        scheduledPublishAt: d.scheduledPublishAt,
      }),
      'startup-rejeitada': (d) => ({
        founderName: d.founderName,
        startupName: d.startupName,
        reason: d.reason,
      }),
      'startup-documento-rejeitado': (d) => ({
        founderName: d.founderName,
        startupName: d.startupName,
        documentName: d.documentName,
        reason: d.reason,
      }),
      'user-approved': (d) => ({
        userName: d.userName ?? d.nome,
      }),
      'user-suspended': (d) => ({
        userName: d.userName ?? d.nome,
        reason: d.reason,
      }),
      'compra-tokens': (d) => ({
        userName: d.userName,
        startupName: d.startupName,
        quantity: d.quantity,
        totalAmount: d.totalAmount,
        campaignTitle: d.campaignTitle,
      }),
      'token-purchase': (d) => ({
        userName: d.userName,
        startupName: d.startupName,
        quantity: d.quantity,
        totalAmount: d.totalAmount,
        campaignTitle: d.campaignTitle,
      }),
      'fase-aprovada': (d) => ({
        founderName: d.founderName,
        startupName: d.startupName,
        phaseLabel: d.phaseLabel,
        nextStep: d.nextStep,
      }),
      'phase-approved': (d) => ({
        founderName: d.founderName,
        startupName: d.startupName,
        phaseLabel: d.phaseLabel,
        nextStep: d.nextStep,
      }),
      'plan-added': (d) => ({
        userName: d.userName,
        planName: d.planName,
        previousPlanName: d.previousPlanName,
        totalActiveProfiles: d.totalActiveProfiles,
      }),
      'plan-purchased': (d) => ({
        userName: d.userName,
        planName: d.planName,
      }),
      'kyc-approved': (d) => ({
        userName: d.userName ?? d.nome,
      }),
    };

    const mapper = mappers[slug];
    return mapper ? mapper(data) : null;
  }

  /**
   * Resolves template HTML — tries database first, falls back to hardcoded.
   * Returns { html, subject } where subject may be overridden by db template.
   */
  private async resolveTemplate(
    templateName: string,
    data: any,
  ): Promise<{ html: string; subject?: string }> {
    const slug = this.normalizeSlug(templateName);

    this.logSmtpEvent('debug', 'Resolução de template iniciada', {
      operation: 'resolve_template',
      template: slug,
      status: 'started',
    });

    if (this.emailTemplates) {
      try {
        const dbData = this.mapDataForDbTemplate(slug, data);
        if (dbData) {
          const rendered = await this.emailTemplates.renderBySlug(slug, dbData);
          if (rendered) {
            this.logSmtpEvent('debug', 'Resolução de template concluída', {
              operation: 'resolve_template',
              template: slug,
              status: 'database',
            });
            return { html: rendered.html, subject: rendered.subject };
          }
        }
      } catch {
        this.logSmtpEvent('warn', 'Resolução de template concluída', {
          operation: 'resolve_template',
          template: slug,
          status: 'fallback',
          reason: 'database_error',
        });
      }
    }

    this.logSmtpEvent('debug', 'Resolução de template concluída', {
      operation: 'resolve_template',
      template: slug,
      status: 'hardcoded',
    });
    const frontendUrl =
      this.getValidatedFrontendUrl() ?? 'http://localhost:5173';
    return {
      html: this.getHardcodedTemplateHtml(templateName, data, frontendUrl),
    };
  }

  /** Normalizes template name aliases to canonical slug. */
  private normalizeSlug(templateName: string): string {
    const aliasMap: Record<string, string> = {
      'boas-vindas': 'welcome',
      'recuperacao-senha': 'forgot-password',
      'codigo-verificacao': 'verification-code',
    };
    return aliasMap[templateName] ?? templateName;
  }

  /**
   * Returns hardcoded template HTML (original behavior).
   */
  private getHardcodedTemplateHtml(
    templateName: string,
    data: any,
    frontendUrl: string,
  ): string {
    switch (templateName) {
      case 'welcome':
      case 'boas-vindas':
        return welcomeTemplate(data as WelcomeTemplateData);

      case 'forgot-password':
      case 'recuperacao-senha':
        return forgotPasswordTemplate(data as ForgotPasswordTemplateData);

      case 'verification-code':
      case 'codigo-verificacao':
        return verificationCodeTemplate(data as VerificationCodeTemplateData);

      case 'new-login-alert':
        return newLoginAlertTemplate(data as NewLoginAlertTemplateData);

      case 'kyc-resubmission-requested':
        return kycResubmissionRequestedTemplate(
          data as KycResubmissionRequestedData,
        );

      case 'startup-etapa1-concluida':
        return startupEtapa1ConcluidaTemplate(
          data as StartupEtapaTemplateData,
          frontendUrl,
        );

      case 'startup-etapa2-concluida':
        return startupEtapa2ConcluidaTemplate(
          data as StartupEtapaTemplateData,
          frontendUrl,
        );

      case 'startup-etapa3-concluida':
        return startupEtapa3ConcluidaTemplate(
          data as StartupEtapaTemplateData,
          frontendUrl,
        );

      case 'startup-pagamento-confirmado':
        return startupPagamentoConfirmadoTemplate(
          data as StartupPagamentoTemplateData,
          frontendUrl,
        );

      case 'startup-aprovada':
        return startupAprovadaTemplate(
          data as StartupAprovadaTemplateData,
          frontendUrl,
        );

      case 'startup-rejeitada':
        return startupRejeitadaTemplate(
          data as StartupRejeitadaTemplateData,
          frontendUrl,
        );

      case 'startup-documento-rejeitado':
        return startupDocumentoRejeitadoTemplate(
          data as StartupDocumentoRejeitadoTemplateData,
          frontendUrl,
        );

      case 'user-approved':
        return userApprovedTemplate(
          data as UserApprovedTemplateData,
          frontendUrl,
        );

      case 'user-suspended':
        return userSuspendedTemplate(
          data as UserSuspendedTemplateData,
          frontendUrl,
        );

      case 'compra-tokens':
      case 'token-purchase':
        return tokenPurchaseTemplate(
          data as TokenPurchaseTemplateData,
          frontendUrl,
        );

      case 'fase-aprovada':
      case 'phase-approved':
        return phaseApprovedTemplate(
          data as PhaseApprovedTemplateData,
          frontendUrl,
        );

      case 'plan-added':
        return planAddedTemplate(data as PlanAddedTemplateData, frontendUrl);

      case 'plan-purchased':
        return planPurchasedTemplate(
          data as PlanPurchasedTemplateData,
          frontendUrl,
        );

      case 'kyc-approved':
        return kycApprovedTemplate(
          data as KycApprovedTemplateData,
          frontendUrl,
        );

      default:
        throw new Error(`Template '${templateName}' não encontrado`);
    }
  }

  /**
   * Envia um email utilizando o Amazon SES
   *
   * Fluxo de execução:
   * 1. Verifica se o cliente SES está inicializado
   * 2. Processa o conteúdo do email baseado no tipo (template/html/simple)
   * 3. Monta o comando SendEmailCommand com os parâmetros
   * 4. Envia via AWS SES e retorna o resultado
   *
   * @param options Objeto com as opções de envio:
   * - to: Email do destinatário
   * - subject: Assunto do email
   * - type: Tipo de envio ('template' | 'simple' | 'html')
   * - text: Conteúdo (nome do template ou HTML/texto)
   * - data: Dados para preenchimento do template (opcional)
   *
   * @returns Promise<{ success: boolean, message: string, messageId?: string }>
   * - success: true se enviado com sucesso
   * - message: Mensagem de sucesso ou erro
   * - messageId: ID do email no SES (apenas em sucesso)
   */
  async sendEmail(options: SendEmailOptions): Promise<{
    success: boolean;
    message: string;
    messageId?: string;
  }> {
    const startedAt = Date.now();
    let emailType: EmailType | 'unknown' = 'unknown';
    let template = 'none';

    try {
      const { to, subject, type, text, data } = options;
      emailType = type;
      template = type === 'template' ? this.normalizeSlug(text) : 'none';

      this.logSmtpEvent('debug', 'Preparação de envio iniciada', {
        operation: 'send_email',
        type: emailType,
        template,
        status: 'started',
      });

      let html: string;
      let textContent: string = text;
      let resolvedSubject: string | undefined;

      switch (type) {
        case 'template': {
          const resolved = await this.resolveTemplate(text, data);
          html = resolved.html;
          if (resolved.subject) resolvedSubject = resolved.subject;
          textContent = `Visualize este email em um cliente que suporte HTML.`;
          break;
        }

        case 'html':
          html = text;
          textContent = 'Visualize este email em um cliente que suporte HTML.';
          break;

        case 'simple':
          html = `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
          textContent = text;
          break;

        default:
          throw new Error(`Tipo de email '${type}' inválido`);
      }

      const toAddresses = Array.isArray(to) ? to : [to];
      const normalizedToAddresses = toAddresses.map((address) =>
        address.trim().toLowerCase(),
      );

      const ccAddresses = this.ccList.filter(
        (address) => !normalizedToAddresses.includes(address),
      );
      const nonDeliverableRecipients = new Set(
        (
          this.configService.get<string>(
            'SMTP_NON_DELIVERABLE_RECIPIENTS',
            '',
          ) || ''
        )
          .split(',')
          .map((address) => address.trim().toLowerCase())
          .filter(Boolean),
      );
      const deliverablePrimaryAddresses = normalizedToAddresses.filter(
        (address) => !nonDeliverableRecipients.has(address),
      );
      const envelopeToAddresses = [
        ...deliverablePrimaryAddresses,
        ...(ccAddresses ?? []),
      ];
      const excludedRequested =
        normalizedToAddresses.length - deliverablePrimaryAddresses.length;
      const commonFields = {
        operation: 'send_email',
        type: emailType,
        template,
        requested: normalizedToAddresses.length,
        envelopeRecipients: envelopeToAddresses.length,
        cc: ccAddresses?.length ?? 0,
        excluded: excludedRequested,
      };

      if (!envelopeToAddresses.length) {
        this.logSmtpEvent('error', 'Envio abortado', {
          ...commonFields,
          status: 'failed',
          reason: 'no_deliverable_recipients',
          durationMs: Date.now() - startedAt,
        });
        return {
          success: false,
          message: 'Não foi possível enviar o email no momento',
        };
      }

      this.logSmtpEvent('log', 'Tentativa de envio', {
        ...commonFields,
        status: 'attempt',
      });

      if (this.transporter) {
        try {
          const result = await this.transporter.sendMail({
            from: this.fromEmail,
            // Mantém o destinatário seed visível no cabeçalho, sem entregá-lo.
            to: normalizedToAddresses,
            ...(ccAddresses?.length ? { cc: ccAddresses } : {}),
            envelope: {
              from: this.fromEmail,
              to: envelopeToAddresses,
            },
            subject: resolvedSubject ?? subject,
            text: textContent,
            html,
          });

          const acceptedCount = Array.isArray(result.accepted)
            ? result.accepted.length
            : 0;
          const rejectedCount = Array.isArray(result.rejected)
            ? result.rejected.length
            : 0;
          const pendingCount = Array.isArray(result.pending)
            ? result.pending.length
            : 0;

          this.logSmtpEvent('log', 'Envio concluído', {
            ...commonFields,
            status: 'success',
            submission: 'accepted',
            delivery: 'unknown',
            smtpResponseCode: this.extractSmtpResponseCode(result.response),
            acceptedCount,
            rejectedCount,
            pendingCount,
            durationMs: Date.now() - startedAt,
            messageId: this.sanitizeMessageId(result.messageId),
          });

          return {
            success: true,
            message: 'Email enviado com sucesso',
            messageId: result.messageId,
          };
        } catch (smtpError) {
          this.logSmtpEvent('error', 'Falha no envio', {
            ...commonFields,
            status: 'failed',
            durationMs: Date.now() - startedAt,
            error: this.describeTransportError(smtpError),
          });
          return {
            success: false,
            message: 'Não foi possível enviar o email no momento',
          };
        }
      }

      this.logSmtpEvent('error', 'Envio abortado', {
        ...commonFields,
        status: 'failed',
        reason: 'transport_not_initialized',
        durationMs: Date.now() - startedAt,
      });
      return {
        success: false,
        message: 'Não foi possível enviar o email no momento',
      };
    } catch (error) {
      this.logSmtpEvent('error', 'Erro ao preparar email', {
        operation: 'send_email',
        type: emailType,
        template,
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: this.describeTransportError(error),
      });
      return {
        success: false,
        message: 'Não foi possível preparar o email no momento',
      };
    }
  }

  private logSmtpEvent(
    level: 'debug' | 'log' | 'warn' | 'error',
    event: string,
    fields: Record<string, string | number | boolean>,
  ): void {
    const details = Object.entries(fields)
      .map(([key, value]) => `${key}=${this.sanitizeLogValue(value)}`)
      .join(' | ');
    const message = `[SMTP] ${event}${details ? ` | ${details}` : ''}`;

    if (level === 'error') {
      this.logger.error(message);
    } else if (level === 'warn') {
      this.logger.warn(message);
    } else if (level === 'debug') {
      this.logger.debug(message);
    } else {
      this.logger.log(message);
    }
  }

  private sanitizeLogValue(value: unknown): string {
    return (
      String(value)
        .replace(/[\r\n|]/g, ' ')
        .replace(/[^\x20-\x7E]/g, '')
        .slice(0, 128) || 'empty'
    );
  }

  private sanitizeMessageId(messageId: unknown): string {
    if (typeof messageId !== 'string' || !messageId.trim()) {
      return 'present=false';
    }

    const boundedMessageId = messageId.trim().slice(0, 256);
    const hash = crypto
      .createHash('sha256')
      .update(boundedMessageId)
      .digest('hex')
      .slice(0, 16);
    return `present=true length=${boundedMessageId.length} hash=${hash}`;
  }

  private extractSmtpResponseCode(response: unknown): string {
    if (typeof response !== 'string') return 'UNKNOWN';
    const match = response.match(/(?:^|\s)([245]\d{2})(?:\s|-|$)/);
    return match?.[1] ?? 'UNKNOWN';
  }

  private describeTransportError(error: unknown): string {
    if (!error || typeof error !== 'object') return 'message=unknown_error';
    const details = error as Record<string, unknown>;
    const rawMessage =
      typeof details.message === 'string' ? details.message : 'unknown_error';
    const code = typeof details.code === 'string' ? details.code : '';
    const responseCode =
      typeof details.responseCode === 'number' ? details.responseCode : '';
    const command = typeof details.command === 'string' ? details.command : '';
    const message = this.maskPii(rawMessage);
    const parts: string[] = [`message=${this.sanitizeLogValue(message)}`];
    if (code) parts.push(`code=${this.sanitizeLogValue(code)}`);
    if (responseCode) parts.push(`responseCode=${responseCode}`);
    if (command) parts.push(`command=${this.sanitizeLogValue(command)}`);
    return parts.join(' | ');
  }

  /**
   * Mascara PII em mensagens de erro antes de logar (LGPD-safe).
   * Substitui emails por `<email>`, CPFs/CNPJs por `<doc>`, e remove
   * referências a credenciais/autenticação que o nodemailer inclui em mensagens
   * de erro SMTP.
   */
  private maskPii(message: string): string {
    return message
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<email>')
      .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '<doc>')
      .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '<doc>')
      .replace(/\b(?:com\s+)?credencial\s+privada\b/gi, 'credencial <redacted>')
      .replace(/\bpassword\s*[:=]\s*\S+/gi, 'password=<redacted>')
      .replace(/\bauth\s+(?:fail|error|failed)\b/gi, 'auth <redacted>');
  }

  /**
   * Envia email de boas-vindas para novos usuários
   *
   * Utiliza o template 'welcome' com dados do usuário recém-cadastrado.
   * Disparado automaticamente após o registro bem-sucedido.
   *
   * @param to Email do destinatário
   * @param data Dados do usuário para personalização do template
   * @returns Promise com o resultado do envio
   */
  async sendWelcomeEmail(to: string, data: WelcomeTemplateData) {
    return this.sendEmail({
      to,
      subject: 'Bem-vindo à iSelfToken! 🎉',
      type: 'template',
      text: 'welcome',
      data,
    });
  }

  /**
   * T036 (B14) - Notificacao de reprovacao compliance.
   * Envia email ao founder com motivo + link de redirecionamento.
   */
  async sendRejectionNotification(
    to: string,
    data: import('./templates/rejection-notification.template').RejectionNotificationData,
  ) {
    return this.sendEmail({
      to,
      subject: 'Atualização sobre sua startup - Compliance',
      type: 'template',
      text: 'rejection-notification',
      data,
    });
  }

  /** Envia ao usuário a solicitação de reenvio de um documento KYC. */
  async sendKycResubmissionEmail(
    to: string,
    data: Omit<KycResubmissionRequestedData, 'redirectUrl'>,
  ) {
    const frontendUrl = this.getValidatedFrontendUrl();
    if (!frontendUrl) {
      return {
        success: false,
        message:
          'Origem pública do frontend não configurada para este ambiente',
      };
    }

    return this.sendEmail({
      to,
      subject: 'Ação necessária: reenvie seu documento KYC | iSelfToken',
      type: 'template',
      text: 'kyc-resubmission-requested',
      data: {
        ...data,
        redirectUrl: `${frontendUrl}/profile/kyc`,
      },
    });
  }

  /**
   * Envia email de recuperação de senha
   *
   * Utiliza o template 'forgot-password' com link para redefinição.
   * Disparado quando o usuário solicita recuperação de senha.
   *
   * @param to Email do destinatário
   * @param data Contendo o link de recuperação e dados do usuário
   * @returns Promise com o resultado do envio
   */
  async sendForgotPasswordEmail(to: string, data: ForgotPasswordTemplateData) {
    return this.sendEmail({
      to,
      subject: 'Recuperação de Senha - iSelfToken',
      type: 'template',
      text: 'forgot-password',
      data,
    });
  }

  /**
   * Envia email com código de verificação
   *
   * Utiliza o template 'verification-code' com código de 6 dígitos.
   * Utilizado para verificação de identidade em ações sensíveis.
   *
   * @param to Email do destinatário
   * @param nome Nome do destinatário
   * @param codigo Código de verificação
   * @returns Promise com o resultado do envio
   */
  async sendVerificationCodeEmail(
    to: string,
    nome: string,
    codigo: string,
    acao?: string,
    redirectPath?: string,
    expiresIn?: number,
  ) {
    const data: VerificationCodeTemplateData = {
      nome,
      codigo,
      acao: acao || 'validar seu acesso',
      redirectPath: this.normalizeRedirectPath(redirectPath),
      expiresIn: expiresIn || 5,
    };

    return this.sendEmail({
      to,
      subject: 'Código de Verificação - iSelfToken',
      type: 'template',
      text: 'verification-code',
      data,
    });
  }

  /** Envia um aviso best-effort para acessos após longo período de inatividade. */
  async sendAccessWarningEmail(params: {
    to: string;
    nome: string;
    ip: string | null;
    ipClass: string;
    timestamp: Date;
    metadata?: {
      hostname: string | null;
      ip: string | null;
      cidade: string | null;
      estado: string | null;
      pais: string | null;
      local: string | null;
      provedor: string | null;
      timezone: string | null;
      capturedAt: Date | null;
    };
  }): Promise<{ success: boolean; message: string; messageId?: string }> {
    const timestamp =
      params.timestamp.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'medium',
      }) + ' (BRT)';
    const metadata = params.metadata;
    const capturedAt = metadata?.capturedAt
      ? metadata.capturedAt.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          dateStyle: 'short',
          timeStyle: 'medium',
        }) + ' (BRT)'
      : 'Não informado';
    const ipContext: Record<string, string> = {
      PUBLIC: 'IP público identificado',
      LOOPBACK: 'acesso local/teste',
      PRIVATE: 'rede privada',
      RESERVED: 'endereço reservado',
      INVALID: 'endereço inválido',
      MISSING: 'não identificado',
    };

    return this.sendEmail({
      to: params.to,
      subject: 'Aviso de acesso à sua conta | iSelfToken',
      type: 'simple',
      text: [
        `Olá ${params.nome},`,
        '',
        'Identificamos um novo acesso à sua conta iSelfToken após mais de 24 horas sem acesso registrado.',
        '',
        `Data/Hora: ${timestamp}`,
        `IP: ${params.ip ?? 'Não identificado'}`,
        `Tipo de IP: ${ipContext[params.ipClass] ?? 'contexto não identificado'}`,
        `Hostname: ${metadata?.hostname ?? 'Não informado'}`,
        `IP consultado no navegador: ${metadata?.ip ?? 'Não informado'}`,
        `Cidade: ${metadata?.cidade ?? 'Não informada'}`,
        `Estado: ${metadata?.estado ?? 'Não informado'}`,
        `País: ${metadata?.pais ?? 'Não informado'}`,
        `Localização: ${metadata?.local ?? 'Não informada'}`,
        `Provedor: ${metadata?.provedor ?? 'Não informado'}`,
        `Timezone: ${metadata?.timezone ?? 'Não informado'}`,
        `Horário informado pelo navegador: ${capturedAt}`,
        '',
        'Se você não reconhece este acesso, altere sua senha e entre em contato com o suporte imediatamente.',
        '',
        'Atenciosamente,',
        'Equipe iSelfToken',
      ].join('\n'),
    });
  }

  /** Envia o alerta de novo login usando o template versionado e links tokenizados. */
  async sendNewLoginAlertEmail(params: {
    to: string;
    nome: string;
    ip: string | null;
    ipClass: string;
    deviceLabel: string;
    location: {
      source: string;
      precision: string;
      country: string | null;
      city: string | null;
      region?: string | null;
      timezone?: string | null;
      org?: string | null;
    };
    timestamp: Date;
    reason: string;
    actionToken: string;
  }): Promise<{ success: boolean; message: string; messageId?: string }> {
    const frontendUrl = this.getValidatedFrontendUrl();
    if (!frontendUrl) {
      return {
        success: false,
        message:
          'Origem pública do frontend não configurada para este ambiente',
      };
    }
    const timestamp =
      params.timestamp.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'medium',
      }) + ' (BRT)';
    const reasonLabel: Record<string, string> = {
      new_device: 'Novo dispositivo detectado',
      geo_anomaly: 'Localização diferente do habitual',
      new_device_and_geo_anomaly: 'Novo dispositivo e localização diferente',
    };
    const locationLabel =
      params.location.source === 'IP_APPROXIMATION'
        ? [params.location.city, params.location.country]
            .filter(Boolean)
            .join(', ') + ' (estimativa por IP)'
        : 'Localização indisponível';
    const ipContext: Record<string, string> = {
      PUBLIC: 'IP público identificado',
      LOOPBACK: 'acesso local/teste',
      PRIVATE: 'rede privada',
      RESERVED: 'endereço reservado',
      INVALID: 'endereço inválido',
      MISSING: 'não identificado',
    };
    const token = encodeURIComponent(params.actionToken);
    const data: NewLoginAlertTemplateData = {
      userName: params.nome,
      timestamp,
      ip: params.ip ?? 'Não identificado',
      ipContext: ipContext[params.ipClass] ?? 'contexto não identificado',
      deviceLabel: params.deviceLabel,
      locationLabel,
      timezone: params.location.timezone ?? undefined,
      org: params.location.org ?? undefined,
      reason: reasonLabel[params.reason] ?? 'Novo acesso detectado',
      confirmUrl: `${frontendUrl}/auth/confirm-login#token=${token}`,
      dismissUrl: `${frontendUrl}/auth/dismiss-session#token=${token}`,
    };
    const rendered = await this.resolveTemplate('new-login-alert', data);
    return this.sendEmail({
      to: params.to,
      subject:
        rendered.subject ?? 'Novo login detectado na sua conta | iSelfToken',
      type: 'html',
      text: rendered.html,
      data: { template: 'new-login-alert', version: 'v1' },
    });
  }

  private getValidatedFrontendUrl(): string | null {
    const configured = this.configService.get<string>('FRONTEND_URL');
    if (!configured)
      return process.env.NODE_ENV === 'development' ||
        process.env.NODE_ENV === 'test'
        ? 'http://localhost:5173'
        : null;
    try {
      const url = new URL(configured);
      const hostname = url.hostname.toLowerCase();
      const local =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('172.16.');
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        (process.env.NODE_ENV === 'production' && local)
      )
        return null;
      return url.origin;
    } catch {
      return null;
    }
  }

  private normalizeRedirectPath(redirectPath?: string): string | undefined {
    if (!redirectPath) return undefined;
    if (!redirectPath.startsWith('/')) return redirectPath;

    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    return `${frontendUrl.replace(/\/$/, '')}${redirectPath}`;
  }

  /**
   * Escape HTML básico contra XSS em valores interpolados em templates inline.
   */
  private escapeHtml(value: string): string {
    return escapeHtml(value);
  }

  async sendValidationEmail(
    to: string,
    token: string,
    type: 'REGISTRATION' | 'UPDATE',
    nome?: string,
  ) {
    const data: ValidationEmailTemplateData = {
      email: to,
      token,
      type,
      nome,
    };

    const subject =
      type === 'REGISTRATION'
        ? 'Confirme seu Email - iSelfToken'
        : 'Atualize seu Email - iSelfToken';

    return this.sendEmail({
      to,
      subject,
      type: 'template',
      text: 'validation-email',
      data,
    });
  }

  /**
   * T037 - Repasses notification: envia email via template por slug.
   * @param to Email do destinatário
   * @param slug Slug do template (ex: 'parcela-solicitada', 'parcela-aprovada')
   * @param data Dados para interpolação no template
   */
  async sendTemplateBySlug(
    to: string,
    slug: string,
    data: Record<string, any>,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Map slug to template name used by getTemplateHtml
      const templateName = this.slugToTemplateName(slug);
      return this.sendEmail({
        to,
        subject: this.getSubjectFromSlug(slug),
        type: 'template',
        text: templateName,
        data,
      });
    } catch (error) {
      this.logSmtpEvent('error', 'Envio de template abortado', {
        operation: 'send_template_by_slug',
        template: slug,
        status: 'failed',
        reason: 'template_processing_error',
        error: this.describeTransportError(error),
      });
      return {
        success: false,
        message: 'Não foi possível enviar o email no momento',
      };
    }
  }

  /** Mapeia slugs de notificação para nomes de template internos. */
  private slugToTemplateName(slug: string): string {
    const map: Record<string, string> = {
      'parcela-solicitada': 'installment-requested',
      'parcela-aprovada': 'installment-approved',
      'parcela-depositada': 'installment-deposited',
      'parcela-rejeitada': 'installment-rejected',
      'repasse-configurado': 'repasse-configured',
      'repasse-concluido': 'repasse-concluded',
    };
    return map[slug] ?? slug;
  }

  /** Assunto do email baseado no slug. */
  private getSubjectFromSlug(slug: string): string {
    const subjects: Record<string, string> = {
      'parcela-solicitada': 'Nova solicitação de parcela - iSelfToken',
      'parcela-aprovada': 'Parcela aprovada - iSelfToken',
      'parcela-depositada': 'Parcela depositada - iSelfToken',
      'parcela-rejeitada': 'Parcela rejeitada - iSelfToken',
      'repasse-configurado': 'Repasse configurado - iSelfToken',
      'repasse-concluido': 'Repasse concluído - iSelfToken',
    };
    return subjects[slug] ?? 'Notificação - iSelfToken';
  }
}
