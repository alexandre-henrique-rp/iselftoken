/**
 * Template HTML do e-mail de A2F
 */
export default function buildA2fHtmlTemplate({ code, appName }: { code: string; appName: string }) {
  return `
  <!doctype html>
  <html lang="pt-br">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${appName} - Código de Verificação</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; background: #0b0f14; color: #e6edf3; margin: 0; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 24px; }
        .title { font-size: 18px; margin: 0 0 8px; }
        .subtitle { color: #9ca3af; margin: 0 0 16px; }
        .code { font-size: 28px; letter-spacing: 6px; font-weight: 700; background: #0b1220; border: 1px solid #1f2937; padding: 12px 16px; border-radius: 8px; text-align: center; display: block; color: #93c5fd; }
        .footer { margin-top: 16px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 class="title">Seu código de verificação</h1>
        <p class="subtitle">Use o código abaixo para concluir o acesso em dois fatores no ${appName}.</p>
        <span class="code">${code}</span>
        <p class="footer">Este código expira em poucos minutos. Se você não solicitou, ignore este e-mail.</p>
      </div>
    </body>
  </html>
  `
}