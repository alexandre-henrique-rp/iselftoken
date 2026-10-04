import {
  escapeHtml,
  escapeSafeUrl,
  validateSafeUrl,
} from '../email-template-security';
import { baseTemplate } from './base.template';

export interface ValidationEmailTemplateData {
  nome?: string;
  email: string;
  token: string;
  type: 'REGISTRATION' | 'UPDATE';
  frontendUrl?: string;
}

export const validationEmailTemplate = (
  data: ValidationEmailTemplateData,
): string => {
  const frontendUrl = validateSafeUrl(
    data.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173',
    'frontendUrl',
  );
  const baseUrl = new URL(frontendUrl);
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, '')}/validate-email`;
  baseUrl.search = new URLSearchParams({ token: data.token }).toString();
  const validationLink = escapeSafeUrl(baseUrl.toString(), 'validationLink');
  const nome = data.nome ? escapeHtml(data.nome) : '';
  const email = escapeHtml(data.email);
  const actionText =
    data.type === 'REGISTRATION'
      ? 'confirmar seu email e criar sua conta'
      : 'atualizar seu email na plataforma';

  const content = `
    <h2 style="color: #1f2937; margin-bottom: 20px;">Validação de Email 📧</h2>

    <p style="margin-bottom: 16px;">Olá${nome ? ` <strong>${nome}</strong>` : ''},</p>

    <p style="margin-bottom: 16px;">
      Você solicitou ${actionText}. Clique no botão abaixo para validar seu email:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${validationLink}" class="button">
        Validar Email
      </a>
    </div>

    <div class="info-box">
      <p style="margin: 0;">
        <strong>ℹ️ Informações:</strong><br>
        Email: <strong>${email}</strong><br>
        Tipo: <strong>${data.type === 'REGISTRATION' ? 'Registro' : 'Atualização'}</strong><br>
        Este link expira em <strong>1 hora</strong>.
      </p>
    </div>

    <div class="warning-box">
      <p style="margin: 0;">
        <strong>⚠️ Segurança:</strong><br>
        Se você não solicitou esta validação, por favor ignore este email.
        Não compartilhe este link com ninguém.
      </p>
    </div>

    <p style="margin-top: 24px; margin-bottom: 16px; font-size: 14px; color: #6b7280;">
      Se o botão não funcionar, copie e cole o seguinte link no seu navegador:<br>
      <a href="${validationLink}" style="color: #667eea;">${validationLink}</a>
    </p>

    <p style="margin-top: 32px; margin-bottom: 0;">
      Atenciosamente,<br>
      <strong>Equipe iSelfToken</strong>
    </p>
  `;

  return baseTemplate(content);
};
