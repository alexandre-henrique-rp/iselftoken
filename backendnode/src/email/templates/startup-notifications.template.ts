/**
 * Templates de notificações para founders em todas as fases do fluxo de cadastro,
 * pagamento, aprovação e rejeição da startup. Tema dark + magenta (Sprint S34).
 *
 * Cada template recebe `data` tipado via interface para evitar typos em runtime.
 * O `frontendUrl` é resolvido por `EmailService.getValidatedFrontendUrl()` e
 * passado explicitamente para que cada template não precise conhecer o ConfigService.
 *
 * BUG-FT-004 (B4): o termo canônico visível ao usuário é **"Fase"** (1/2/3) —
 * alinhado com CASE.md [Aprovação por Fases] e o frontend (`phase-actions.tsx`).
 * Os nomes técnicos de funções/interfaces/slugs (`startupEtapa1ConcluidaTemplate`,
 * `startup-etapa1-concluida`) permanecem para evitar quebra de seeds/banco.
 */

import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface StartupEtapaTemplateData {
  startupName: string;
}

export interface StartupPagamentoTemplateData {
  startupName: string;
  purposeLabel: string;
}

export interface StartupAprovadaTemplateData {
  founderName: string;
  startupName: string;
  /**
   * Publicação imediata (true) quando o founder contratou "Publicação Rápida"
   * (FAST_DEPLOY). Quando false/omisso, a publicação é agendada (+24h) e usamos
   * `scheduledPublishAt` para mostrar a data prevista.
   */
  fastDeploy?: boolean;
  /** ISO string do horário previsto de publicação (quando não é imediata). */
  scheduledPublishAt?: string | null;
}

export interface StartupRejeitadaTemplateData {
  founderName: string;
  startupName: string;
  reason: string;
}

export interface StartupDocumentoRejeitadoTemplateData {
  founderName: string;
  startupName: string;
  documentName: string;
  reason: string;
}

export const startupEtapa1ConcluidaTemplate = (
  data: StartupEtapaTemplateData,
  frontendUrl: string,
): string => {
  const startupName = escapeHtml(data.startupName);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Fase 1 concluída ✓</h2>
    <p style="margin-bottom: 16px;">Olá, founder!</p>
    <p style="margin-bottom: 16px;">
      A startup <strong style="color: #d500f9;">${startupName}</strong> foi criada
      e sua reserva de tokens está pendente de pagamento. Complete o pagamento
      para liberar a Fase 2 do cadastro.
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

export const startupEtapa2ConcluidaTemplate = (
  data: StartupEtapaTemplateData,
  frontendUrl: string,
): string => {
  const startupName = escapeHtml(data.startupName);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Fase 2 concluída ✓</h2>
    <p style="margin-bottom: 16px;">Olá, founder!</p>
    <p style="margin-bottom: 24px;">
      O preenchimento de <strong style="color: #d500f9;">${startupName}</strong>
      foi concluído e enviado para a pré-análise do Compliance. A revisão será
      realizada em até 3 dias úteis. Após a aprovação, a Fase 3 será liberada.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/founder/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Ver status
      </a>
    </p>
  `;
  return baseTemplate(content);
};

export const startupEtapa3ConcluidaTemplate = (
  data: StartupEtapaTemplateData,
  frontendUrl: string,
): string => {
  const startupName = escapeHtml(data.startupName);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Fase 3 concluída ✓</h2>
    <p style="margin-bottom: 16px;">Olá, founder!</p>
    <p style="margin-bottom: 24px;">
      Os detalhes de captação de <strong style="color: #d500f9;">${startupName}</strong>
      foram preenchidos. O Compliance validará os dados para liberar a captação.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/founder/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Ver captação
      </a>
    </p>
  `;
  return baseTemplate(content);
};

export const startupPagamentoConfirmadoTemplate = (
  data: StartupPagamentoTemplateData,
  frontendUrl: string,
): string => {
  const startupName = escapeHtml(data.startupName);
  const purposeLabel = escapeHtml(data.purposeLabel);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Pagamento confirmado 💰</h2>
    <p style="margin-bottom: 16px;">Olá, founder!</p>
    <p style="margin-bottom: 24px;">
      O pagamento de <strong>${purposeLabel}</strong> da startup
      <strong style="color: #d500f9;">${startupName}</strong> foi confirmado com sucesso.
      Você já pode seguir para o próximo passo.
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/founder/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Continuar
      </a>
    </p>
  `;
  return baseTemplate(content);
};

export const startupAprovadaTemplate = (
  data: StartupAprovadaTemplateData,
  frontendUrl: string,
): string => {
  const founderName = escapeHtml(data.founderName?.trim() || 'fundador(a)');
  const startupName = escapeHtml(data.startupName);
  // Texto de publicação condicional (CASE.md [Publicação]):
  //  - FAST_DEPLOY (Publicação Rápida): já está no ar.
  //  - Padrão: publicada em até 24h, com a data/hora prevista quando disponível.
  let publicacaoHtml: string;
  if (data.fastDeploy) {
    publicacaoHtml = `
      A startup <strong style="color: #d500f9;">${startupName}</strong> foi aprovada
      pela curadoria e, com a <strong>Publicação Rápida</strong>, já está visível
      no marketplace.`;
  } else {
    let previsaoTexto = '';
    if (data.scheduledPublishAt) {
      const dt = new Date(data.scheduledPublishAt);
      if (!Number.isNaN(dt.getTime())) {
        const previsao = escapeHtml(
          dt.toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'America/Sao_Paulo',
          }),
        );
        previsaoTexto = ` (previsto para ${previsao})`;
      }
    }
    publicacaoHtml = `
      A startup <strong style="color: #d500f9;">${startupName}</strong> foi aprovada
      pela curadoria. Por padrão, a publicação no marketplace ocorre em até
      <strong>24 horas</strong>${previsaoTexto}. Assim que publicada, sua página
      pública ficará disponível para os investidores.`;
  }
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Sua startup foi aprovada 🎉</h2>
    <p style="margin-bottom: 16px;">Parabéns, <strong>${founderName}</strong>!</p>
    <p style="margin-bottom: 24px;">${publicacaoHtml}
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/founder/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Abrir captação
      </a>
    </p>
  `;
  return baseTemplate(content);
};

export const startupRejeitadaTemplate = (
  data: StartupRejeitadaTemplateData,
  frontendUrl: string,
): string => {
  const founderName = escapeHtml(data.founderName?.trim() || 'fundador(a)');
  const startupName = escapeHtml(data.startupName);
  const reason = escapeHtml(data.reason);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Sua startup precisa de ajustes</h2>
    <p style="margin-bottom: 16px;">Olá, <strong>${founderName}</strong>.</p>
    <p style="margin-bottom: 16px;">
      A análise da startup <strong style="color: #d500f9;">${startupName}</strong>
      apontou itens que precisam de correção.
    </p>
    <p style="margin-bottom: 24px; padding: 16px; background-color: #1a1a1a; border-left: 4px solid #fbbf24; border-radius: 4px; overflow-wrap: anywhere; word-break: break-word; white-space: normal;">
      <strong style="color: #fbbf24;">Motivo:</strong> ${reason}
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/founder/startups"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Corrigir cadastro
      </a>
    </p>
  `;
  return baseTemplate(content);
};

export const startupDocumentoRejeitadoTemplate = (
  data: StartupDocumentoRejeitadoTemplateData,
  frontendUrl: string,
): string => {
  const founderName = escapeHtml(data.founderName?.trim() || 'fundador(a)');
  const startupName = escapeHtml(data.startupName);
  const documentName = escapeHtml(data.documentName);
  const reason = escapeHtml(data.reason);
  const content = `
    <h2 style="color: #ffffff; margin-bottom: 20px;">Documento rejeitado</h2>
    <p style="margin-bottom: 16px;">Olá, <strong>${founderName}</strong>.</p>
    <p style="margin-bottom: 16px;">
      O documento <strong>${documentName}</strong> da startup
      <strong style="color: #d500f9;">${startupName}</strong> foi rejeitado.
    </p>
    <p style="margin-bottom: 24px; padding: 16px; background-color: #1a1a1a; border-left: 4px solid #fbbf24; border-radius: 4px; overflow-wrap: anywhere; word-break: break-word; white-space: normal;">
      <strong style="color: #fbbf24;">Motivo:</strong> ${reason}
    </p>
    <p style="margin-bottom: 24px;">
      <a href="${frontendUrl}/founder/dashboard"
         style="display: inline-block; padding: 12px 24px; background-color: #d500f9;
                color: #ffffff; text-decoration: none; border-radius: 8px;
                font-weight: 700; font-size: 14px;">
        Reenviar documento
      </a>
    </p>
  `;
  return baseTemplate(content);
};
