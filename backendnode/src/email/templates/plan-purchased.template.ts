/**
 * Template hardcoded: novo perfil ativado (1a assinatura de plano).
 *
 * Disparado por UserNotificationService.onPlanPaymentConfirmed quando
 * a subscription e a 1a assinatura ACTIVE do usuario.
 * Tema dark + magenta (Sprint de Notificacoes — central).
 */

import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface PlanPurchasedTemplateData {
  userName: string;
  planName: string;
}

export const planPurchasedTemplate = (
  data: PlanPurchasedTemplateData,
  frontendUrl: string,
): string => {
  const userName = escapeHtml(data.userName);
  const planName = escapeHtml(data.planName);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Bem-vindo ao perfil ${planName} ✓</h2>
    <p style="margin-bottom: 16px;">Olá, ${userName}!</p>
    <p style="margin-bottom: 16px;">
      Sua assinatura do perfil
      <strong style="color: #d500f9;">${planName}</strong> foi confirmada com
      sucesso.
    </p>
    <p style="margin-bottom: 16px;">
      Agora você tem acesso a todos os recursos do plano na plataforma.
      Explore o dashboard para comecar.
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
