/**
 * Template hardcoded: perfil adicional ativado (compra de plano quando o
 * usuario ja tem outra assinatura ativa).
 *
 * Disparado por UserNotificationService.onPlanPaymentConfirmed quando
 * a subscription e adicional (coexiste com outra(s) ACTIVE).
 * Tema dark + magenta (Sprint de Notificacoes — central).
 */

import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface PlanAddedTemplateData {
  userName: string;
  planName: string;
  previousPlanName: string;
  totalActiveProfiles: number;
}

export const planAddedTemplate = (
  data: PlanAddedTemplateData,
  frontendUrl: string,
): string => {
  const userName = escapeHtml(data.userName);
  const planName = escapeHtml(data.planName);
  const previousPlanName = escapeHtml(data.previousPlanName);
  const totalActiveProfiles = Math.max(2, Math.floor(data.totalActiveProfiles));
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Novo perfil adicionado ✓</h2>
    <p style="margin-bottom: 16px;">Olá, ${userName}!</p>
    <p style="margin-bottom: 16px;">
      Você acabou de adquirir o perfil
      <strong style="color: #d500f9;">${planName}</strong>.
    </p>
    <p style="margin-bottom: 16px;">
      Como você já possui o perfil <strong>${previousPlanName}</strong>
      ativo, queremos reforçar: <strong>seu perfil anterior continua
      normalmente</strong>. Agora você tem <strong>${totalActiveProfiles}
      perfis</strong> ativos na sua conta.
    </p>
    <p style="margin-bottom: 16px;">
      Cada perfil libera funcionalidades adicionais na plataforma, e você
      pode alternar entre eles quando quiser pelo seu dashboard.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/profile"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Ver meus perfis
      </a>
    </p>
  `;
  return baseTemplate(content);
};
