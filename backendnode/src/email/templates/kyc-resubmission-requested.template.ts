import { escapeHtml, escapeSafeUrl } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface KycResubmissionRequestedData {
  userName: string;
  documentName: string;
  reason: string;
  redirectUrl: string;
}

export const kycResubmissionRequestedTemplate = (
  data: KycResubmissionRequestedData,
): string => {
  const userName = escapeHtml(data.userName);
  const documentName = escapeHtml(data.documentName);
  const reason = escapeHtml(data.reason);
  const redirectUrl = escapeSafeUrl(data.redirectUrl, 'redirectUrl');
  const content = `
    <h2 style="color: #f7fafc; margin-bottom: 20px;">Novo envio necessário para seu KYC</h2>

    <p style="margin-bottom: 16px;">Olá <strong>${userName}</strong>,</p>

    <p style="margin-bottom: 16px;">
      A equipe de análise solicitou um novo envio para o documento <strong>${documentName}</strong>.
    </p>

    <p style="margin-bottom: 8px;"><strong>Orientação da análise:</strong></p>
    <blockquote style="border-left: 4px solid #d500f9; padding: 12px 16px; margin: 0 0 16px 0; color: #e4e7eb; background: #161616;">
      ${reason}
    </blockquote>

    <p style="margin-bottom: 16px;">
      Acesse seu perfil e envie uma nova imagem ou vídeo com boa qualidade e todos os dados visíveis.
    </p>

    <p style="margin-bottom: 16px;">
      <a href="${redirectUrl}" style="display: inline-block; padding: 10px 16px; background: #d500f9; color: #ffffff; border-radius: 6px; text-decoration: none; font-weight: 700;">
        Reenviar documento
      </a>
    </p>

    <p style="margin-bottom: 16px; font-size: 14px; color: #9ca3af;">
      Se você já realizou o reenvio, aguarde a nova análise. Em caso de dúvidas, entre em contato com o suporte.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0;">
      Atenciosamente,<br>
      <strong>Equipe iSelfToken - Compliance</strong>
    </p>
  `;

  return baseTemplate(content);
};
