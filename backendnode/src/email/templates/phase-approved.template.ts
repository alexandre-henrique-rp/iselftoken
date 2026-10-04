/**
 * Template hardcoded: fase (1/2/3) aprovada.
 *
 * Disparado quando startup.phase_approved e consumido por
 * StartupNotificationService.onPhaseApproved.
 * Tema dark + magenta (Sprint de Notificacoes — central).
 */

import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface PhaseApprovedTemplateData {
  founderName: string;
  startupName: string;
  phaseLabel: string;
  nextStep: string;
}

export const phaseApprovedTemplate = (
  data: PhaseApprovedTemplateData,
  frontendUrl: string,
): string => {
  const founderName = escapeHtml(data.founderName);
  const startupName = escapeHtml(data.startupName);
  const phaseLabel = escapeHtml(data.phaseLabel);
  const nextStep = escapeHtml(data.nextStep);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">${phaseLabel} aprovada ✓</h2>
    <p style="margin-bottom: 16px;">Olá, ${founderName}!</p>
    <p style="margin-bottom: 16px;">
      A startup <strong style="color: #d500f9;">${startupName}</strong> teve
      sua <strong>${phaseLabel}</strong> aprovada pelo nosso time de
      compliance.
    </p>
    <p style="margin-bottom: 16px;">
      <strong>Próximo passo:</strong> ${nextStep}
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/founder/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Ir para o dashboard
      </a>
    </p>
  `;
  return baseTemplate(content);
};
