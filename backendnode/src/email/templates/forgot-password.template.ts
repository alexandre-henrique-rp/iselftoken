import { escapeHtml, escapeSafeUrl } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface ForgotPasswordTemplateData {
  nome: string;
  /** URL completa e tokenizada de redefinição de senha (uso único). */
  resetUrl: string;
  /** Validade do link em minutos (padrão 15). */
  expiresInMinutes?: number;
}

export const forgotPasswordTemplate = (
  data: ForgotPasswordTemplateData,
): string => {
  const expiresInMinutes = data.expiresInMinutes || 15;
  const expiresInText = escapeHtml(expiresInMinutes);
  const nome = escapeHtml(data.nome);
  const resetUrl = escapeSafeUrl(data.resetUrl, 'resetUrl');

  const content = `
    <h2 style="color: #1f2937; margin-bottom: 20px;">Recuperação de Senha 🔐</h2>

    <p style="margin-bottom: 16px;">Olá <strong>${nome}</strong>,</p>

    <p style="margin-bottom: 16px;">
        Recebemos uma solicitação para redefinir a senha da sua conta na <strong>iSelfToken</strong>.
    </p>

    <p style="margin-bottom: 16px;">
        Clique no botão abaixo para criar uma nova senha:
    </p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" class="button">
            Redefinir Senha
        </a>
    </div>

    <p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">
        Se o botão não funcionar, copie e cole este link no seu navegador:<br>
        <span style="word-break: break-all; color: #4b5563;">${resetUrl}</span>
    </p>

    <div class="warning-box">
        <p style="margin: 0;">
            <strong>⚠️ Importante:</strong><br>
            Este link é válido por apenas <strong>${expiresInText} minutos</strong> e pode ser usado uma única vez.
        </p>
    </div>

    <div class="info-box">
        <p style="margin: 0;">
            <strong>Não solicitou esta alteração?</strong><br>
            Se você não solicitou a recuperação de senha, ignore este email.
            Sua senha permanecerá inalterada e segura.
        </p>
    </div>

    <p style="margin-top: 24px; margin-bottom: 16px; font-size: 14px; color: #6b7280;">
        Por segurança, nunca compartilhe este link com ninguém, nem mesmo com nossa equipe de suporte.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0;">
        Atenciosamente,<br>
        <strong>Equipe iSelfToken</strong>
    </p>
  `;

  return baseTemplate(content);
};
