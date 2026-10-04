/**
 * Template hardcoded: conta suspensa (admin desativa usuario).
 *
 * Disparado quando AdminService.toggleUserStatus(id, false) e executado.
 * Tema dark + magenta (Sprint de Notificacoes — central).
 */

import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface UserSuspendedTemplateData {
  userName: string;
  reason?: string;
}

export const userSuspendedTemplate = (
  data: UserSuspendedTemplateData,
  frontendUrl: string,
): string => {
  const userName = escapeHtml(data.userName);
  const reason = data.reason?.trim()
    ? escapeHtml(data.reason)
    : 'Entre em contato com o suporte para mais detalhes.';
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Conta suspensa</h2>
    <p style="margin-bottom: 16px;">Olá, ${userName},</p>
    <p style="margin-bottom: 16px;">
      Informamos que sua conta na <strong style="color: #d500f9;">iSelfToken</strong>
      foi suspensa pelo time administrativo.
    </p>
    <p style="margin-bottom: 16px;">
      <strong>Motivo:</strong> ${reason}
    </p>
    <p style="margin-bottom: 16px;">
      Caso acredite que houve um engano, entre em contato com o nosso suporte
      para regularizar a situacao.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/suporte"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Falar com o suporte
      </a>
    </p>
  `;
  return baseTemplate(content);
};
