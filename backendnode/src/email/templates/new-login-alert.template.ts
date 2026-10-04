import { escapeHtml, escapeSafeUrl } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface NewLoginAlertTemplateData {
  userName: string;
  timestamp: string;
  ip: string;
  ipContext: string;
  deviceLabel: string;
  locationLabel: string;
  timezone?: string;
  org?: string;
  reason: string;
  confirmUrl: string;
  dismissUrl: string;
}

export function newLoginAlertTemplate(data: NewLoginAlertTemplateData): string {
  const safe = {
    userName: escapeHtml(data.userName),
    timestamp: escapeHtml(data.timestamp),
    ip: escapeHtml(data.ip),
    ipContext: escapeHtml(data.ipContext),
    deviceLabel: escapeHtml(data.deviceLabel),
    locationLabel: escapeHtml(data.locationLabel),
    timezone: data.timezone ? escapeHtml(data.timezone) : null,
    org: data.org ? escapeHtml(data.org) : null,
    reason: escapeHtml(data.reason),
    // URLs devem ser validadas (HTTPS-only) — caller (new-login-alert.service)
    // é responsável por construir URLs válidas via validateSafeUrl.
    confirmUrl: escapeSafeUrl(data.confirmUrl, 'confirmUrl'),
    dismissUrl: escapeSafeUrl(data.dismissUrl, 'dismissUrl'),
  };

  const locationParts = [
    safe.locationLabel,
    safe.timezone ? `🕐 ${safe.timezone}` : null,
    safe.org ? `🏢 ${safe.org}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const content = `
    <h2 style="color: #ffffff !important; margin-bottom: 20px;">Novo login detectado 🚨</h2>

    <p style="color: #f5f5f5 !important; margin-bottom: 16px;">Olá <strong style="color: #ffffff !important;">${safe.userName}</strong>,</p>

    <p style="color: #f5f5f5 !important; margin-bottom: 16px;">
        Identificamos um novo acesso à sua conta <strong style="color: #ffffff !important;">iSelfToken</strong>.
    </p>

    <div class="warning-box" style="background-color: #18181b !important; border-left: 4px solid #fbbf24 !important;">
        <p style="color: #f5f5f5 !important; margin: 0;">
            <strong style="color: #fbbf24 !important;">⚠️ Motivo:</strong><br>
            ${safe.reason}
        </p>
    </div>

    <div class="info-box" style="background-color: #18181b !important; border-left: 4px solid #d500f9 !important;">
        <p style="color: #f5f5f5 !important; margin: 0 0 12px 0;">
            <strong style="color: #f0abfc !important;">📋 Detalhes do acesso:</strong>
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0;">
            <tr>
                <td style="padding: 6px 0; color: #c4c4c8 !important; font-size: 13px; width: 100px; vertical-align: top;">Data/Hora</td>
                <td style="padding: 6px 0; color: #f5f5f5 !important; font-size: 14px;">${safe.timestamp}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #c4c4c8 !important; font-size: 13px; vertical-align: top;">IP</td>
                <td style="padding: 6px 0; color: #f5f5f5 !important; font-size: 14px; font-family: 'Courier New', monospace;">${safe.ip}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #c4c4c8 !important; font-size: 13px; vertical-align: top;">Tipo</td>
                <td style="padding: 6px 0; color: #f5f5f5 !important; font-size: 14px;">${safe.ipContext}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #c4c4c8 !important; font-size: 13px; vertical-align: top;">Dispositivo</td>
                <td style="padding: 6px 0; color: #f5f5f5 !important; font-size: 14px;">${safe.deviceLabel}</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; color: #c4c4c8 !important; font-size: 13px; vertical-align: top;">Localização</td>
                <td style="padding: 6px 0; color: #f5f5f5 !important; font-size: 14px;">${locationParts || 'Indisponível'}</td>
            </tr>
        </table>
    </div>

    <p style="font-weight: 600; color: #f5f5f5 !important; margin: 24px 0 12px;">
        Você reconhece este acesso?
    </p>

    <div style="text-align: center; margin: 28px 0 20px;">
        <a href="${safe.confirmUrl}" style="display: inline-block; padding: 14px 32px; background: #d500f9 !important; color: #000000 !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; margin: 6px 4px; box-shadow: 0 4px 12px rgba(213, 0, 249, 0.3);">
            ✓ Sim, fui eu
        </a>
        <a href="${safe.dismissUrl}" style="display: inline-block; padding: 14px 32px; background: #b91c1c !important; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; margin: 6px 4px; box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);">
            ✗ Não fui eu
        </a>
    </div>

    <div class="warning-box" style="background-color: #18181b !important; border-left: 4px solid #fbbf24 !important;">
        <p style="color: #f5f5f5 !important; margin: 0;">
            <strong style="color: #fbbf24 !important;">🔒 Segurança:</strong><br>
            Se você não reconhece este acesso, clique em <strong style="color: #ffffff !important;">"Não fui eu"</strong> para desconectar todas as sessões e exigir a troca da senha imediatamente.
        </p>
    </div>

    <p style="margin-top: 24px; margin-bottom: 16px; font-size: 14px; color: #c4c4c8 !important;">
        As ações acima são protegidas e não criam uma nova sessão.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0; color: #f5f5f5 !important;">
        Atenciosamente,<br>
        <strong style="color: #ffffff !important;">Equipe iSelfToken</strong>
    </p>
  `;

  return baseTemplate(content);
}
