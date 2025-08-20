/**
 * Template HTML do e-mail de A2F
 */
export default function buildA2fHtmlTemplate({ code, appName }: { code: string; appName: string }) {
  return `
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background: #0b0f14; color: #e6edf3; margin: 0; padding: 24px;">
      <div style="max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px;">
        <h1 style="font-size: 18px; margin: 0 0 8px;">Seu código de verificação</h1>
        <p style="color: #9ca3af; margin: 0 0 16px;">Use o código abaixo para concluir o acesso em dois fatores no ${appName}.</p>
        <span style="font-size: 28px; letter-spacing: 6px; font-weight: 700; background: #0b1220; border: 1px solid #1f2937; padding: 12px 16px; border-radius: 8px; text-align: center; display: block; color: #93c5fd;">${code}</span>
        <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">Este código expira em poucos minutos. Se você não solicitou, ignore este e-mail.</p>
      </div>
    </body>
  `
}