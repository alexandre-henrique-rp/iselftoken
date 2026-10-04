/**
 * Template hardcoded: conta aprovada (admin ativa usuario).
 *
 * Disparado quando AdminService.toggleUserStatus(id, true) e executado.
 * Tema dark + magenta (Sprint de Notificacoes — central).
 */

import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface UserApprovedTemplateData {
  userName: string;
}

export const userApprovedTemplate = (
  data: UserApprovedTemplateData,
  frontendUrl: string,
): string => {
  const userName = escapeHtml(data.userName);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Conta aprovada ✓</h2>
    <p style="margin-bottom: 16px;">Olá, ${userName}!</p>
    <p style="margin-bottom: 16px;">
      Sua conta na <strong style="color: #d500f9;">iSelfToken</strong> foi
      aprovada pelo nosso time administrativo. Você já pode acessar todos
      os recursos da plataforma.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/home"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Acessar a plataforma
      </a>
    </p>
  `;
  return baseTemplate(content);
};
