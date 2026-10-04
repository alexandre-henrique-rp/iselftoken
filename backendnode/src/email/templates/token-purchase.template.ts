/**
 * Template hardcoded: compra de tokens confirmada.
 *
 * Disparado quando payment.confirmed (purpose=INVESTMENT) e consumido por
 * UserNotificationService.onTokenPurchaseConfirmed.
 * Tema dark + magenta (Sprint de Notificacoes — central).
 */

import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface TokenPurchaseTemplateData {
  userName: string;
  startupName: string;
  quantity: number;
  totalAmount: string;
  campaignTitle?: string;
}

export const tokenPurchaseTemplate = (
  data: TokenPurchaseTemplateData,
  frontendUrl: string,
): string => {
  const userName = escapeHtml(data.userName);
  const startupName = escapeHtml(data.startupName);
  const quantity = Math.max(0, Math.floor(data.quantity));
  const totalAmount = escapeHtml(data.totalAmount);
  const campaign = data.campaignTitle?.trim()
    ? ` (${escapeHtml(data.campaignTitle)})`
    : '';
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Compra de tokens confirmada ✓</h2>
    <p style="margin-bottom: 16px;">Olá, ${userName}!</p>
    <p style="margin-bottom: 16px;">
      Sua compra de <strong style="color: #d500f9;">${quantity} tokens</strong>
      da startup <strong style="color: #d500f9;">${startupName}</strong>${campaign}
      foi confirmada com sucesso.
    </p>
    <p style="margin-bottom: 16px;">
      <strong>Valor total:</strong> ${totalAmount}
    </p>
    <p style="margin-bottom: 16px;">
      Os tokens ja estao disponiveis na sua carteira. Você pode acompanhar
      seus investimentos pelo seu dashboard.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/wallet"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Ver minha carteira
      </a>
    </p>
  `;
  return baseTemplate(content);
};
