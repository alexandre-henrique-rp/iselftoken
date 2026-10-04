/**
 * Template hardcoded: KYC aprovado (decisao do compliance).
 *
 * Disparado quando kyc.user.decided (decision=APPROVED) e consumido por
 * UserNotificationService.onKycApproved.
 * Tema dark + magenta (Sprint de Notificacoes — central).
 */

import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface KycApprovedTemplateData {
  userName: string;
}

export const kycApprovedTemplate = (
  data: KycApprovedTemplateData,
  frontendUrl: string,
): string => {
  const userName = escapeHtml(data.userName);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">KYC aprovado ✓</h2>
    <p style="margin-bottom: 16px;">Olá, ${userName}!</p>
    <p style="margin-bottom: 16px;">
      Seu processo de KYC (Know Your Customer) foi
      <strong style="color: #d500f9;">aprovado</strong> pelo nosso time de
      compliance.
    </p>
    <p style="margin-bottom: 16px;">
      Agora você já pode investir em startups, comprar tokens e acessar
      todos os recursos da plataforma.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/home"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Explorar oportunidades
      </a>
    </p>
  `;
  return baseTemplate(content);
};
