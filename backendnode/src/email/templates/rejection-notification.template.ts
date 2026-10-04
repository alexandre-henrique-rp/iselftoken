import { escapeHtml, escapeSafeUrl } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface RejectionNotificationData {
  founderName: string;
  startupName: string;
  reason: string;
  redirectUrl: string;
}

export const rejectionNotificationTemplate = (
  data: RejectionNotificationData,
): string => {
  const founderName = escapeHtml(data.founderName);
  const startupName = escapeHtml(data.startupName);
  const reason = escapeHtml(data.reason);
  const redirectUrl = escapeSafeUrl(data.redirectUrl, 'redirectUrl');
  const content = `
    <h2 style="color: #1f2937; margin-bottom: 20px;">Atualização sobre sua startup</h2>

    <p style="margin-bottom: 16px;">Olá <strong>${founderName}</strong>,</p>

    <p style="margin-bottom: 16px;">
        Sua startup <strong>${startupName}</strong> foi reprovada na análise de compliance.
    </p>

    <p style="margin-bottom: 8px;"><strong>Motivo:</strong></p>
    <blockquote style="border-left: 4px solid #e5e7eb; padding: 12px 16px; margin: 0 0 16px 0; color: #374151; background: #f9fafb; overflow-wrap: anywhere; word-break: break-word; white-space: normal;">
        ${reason}
    </blockquote>

    <p style="margin-bottom: 16px;">
        Para corrigir e reenviar a análise, acesse:
    </p>

    <p style="margin-bottom: 16px;">
        <a href="${redirectUrl}" style="display: inline-block; padding: 10px 16px; background: #4f46e5; color: white; border-radius: 6px; text-decoration: none;">
            Corrigir e reenviar
        </a>
    </p>

    <p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">
        Em caso de dúvidas, responda este email ou entre em contato com nosso suporte.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0;">
        Atenciosamente,<br>
        <strong>Equipe iSelfToken - Compliance</strong>
    </p>
  `;

  return baseTemplate(content);
};
