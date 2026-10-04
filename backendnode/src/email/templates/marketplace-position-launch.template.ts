import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

/**
 * S5-T04 — Email de lancamento do card "Posicao no marketplace" para founders.
 *
 * Notifica fundadores ativos sobre o novo card em /founder/dashboard com score
 * 0..100 + breakdown de 9 chaves + tooltip "Como melhorar?".
 *
 * Variáveis: { founderName, dashboardUrl, learnMoreUrl }
 */

export interface MarketplacePositionLaunchTemplateData {
  founderName: string;
  dashboardUrl: string;
  learnMoreUrl: string;
}

export const marketplacePositionLaunchTemplate = (
  data: MarketplacePositionLaunchTemplateData,
): string => {
  const founderName = escapeHtml(data.founderName);
  const dashboardUrl = escapeHtml(data.dashboardUrl);
  const learnMoreUrl = escapeHtml(data.learnMoreUrl);

  const content = `
    <h2 style="color: #1f2937; margin-bottom: 20px;">Sua posicao no marketplace, agora visivel 🎯</h2>

    <p style="margin-bottom: 16px;">Olá <strong>${founderName}</strong>,</p>

    <p style="margin-bottom: 16px;">
      Adicionamos um novo card no seu <strong>/founder/dashboard</strong> mostrando
      sua posicao no marketplace: score de <strong>0 a 100</strong> com breakdown
      de 9 criterios (KYC, documentos, selos, captacao, prazo, categoria,
      parcerias, atividade).
    </p>

    <div class="info-box">
      <p style="margin: 0 0 8px 0;"><strong>O que mudou para voce:</strong></p>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Voce ve o score atual e o timestamp do ultimo calculo</li>
        <li>Ha um botao "Como melhorar?" que mostra onde ganhar pontos</li>
        <li>Badges visuais: "Em destaque por: <motivo>" (pin de ADMIN) ou "Score alto" (>= 85)</li>
        <li>Pinos manuais do ADMIN entram no /marketplace/featured em ate 5 minutos</li>
      </ul>
    </div>

    <p style="margin-bottom: 16px;">Acesse seu dashboard para ver a posicao atual:</p>
    <p style="margin: 20px 0;">
      <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver meu score</a>
    </p>

    <p style="margin-bottom: 16px;">Quer entender como o score e calculado?</p>
    <p style="margin: 20px 0;">
      <a href="${learnMoreUrl}" style="display: inline-block; padding: 12px 24px; border: 1px solid #667eea; color: #667eea; text-decoration: none; border-radius: 8px; font-weight: 600;">Ler documentacao do algoritmo</a>
    </p>

    <p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">
      O score e recalculado diariamente as 03:00 BRT e tambem em eventos
      (upload de documento, aprovacao KYC, conquista de selo, mudanca de status
      de captacao). Pinos manuais do ADMIN entram em ate 5 minutos.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0;">
      Atenciosamente,<br>
      <strong>Equipe iSelfToken</strong>
    </p>
  `;

  return baseTemplate(content);
};
