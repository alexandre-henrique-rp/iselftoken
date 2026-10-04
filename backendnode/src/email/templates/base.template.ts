/**
 * Template base HTML para todos os emails com tema dark
 * Garante consistência visual, responsividade e compatibilidade com modo escuro
 * Usa color-scheme para prevenir inversão de cores em clientes de email
 */
export const baseTemplate = (content: string): string => {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>iSelfToken</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #000000 !important;
            color: #e4e7eb !important;
            line-height: 1.6;
            margin: 0;
            padding: 0;
        }

        .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #0a0a0a !important;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
            border: 1px solid #2d3748;
        }

        .email-header {
            background: linear-gradient(135deg, #d500f9 0%, #b400c9 60%, #8e24aa 100%) !important;
            padding: 40px 20px;
            text-align: center;
            border-bottom: 2px solid #9c00b8;
        }

        .email-header h1 {
            font-size: 32px;
            font-weight: 700;
            margin: 0;
            color: #ffffff !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            text-transform: none;
            letter-spacing: 0.5px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .email-header .tagline {
            font-size: 14px;
            color: #e4e7eb !important;
            margin-top: 8px;
            opacity: 0.95;
        }

        .email-body {
            padding: 40px 30px;
            background-color: #0a0a0a !important;
            color: #e4e7eb !important;
        }

        .email-body h2 {
            color: #f7fafc !important;
            margin-bottom: 20px;
            font-size: 24px;
        }

        .email-body p {
            color: #e4e7eb !important;
            margin-bottom: 16px;
        }

        .email-body strong {
            color: #f7fafc !important;
            font-weight: 600;
        }

        .email-body ul {
            color: #e4e7eb !important;
        }

        .email-body li {
            color: #e4e7eb !important;
            margin-bottom: 8px;
        }

        .email-footer {
            background-color: #000000 !important;
            padding: 24px 30px;
            text-align: center;
            font-size: 12px;
            color: #9ca3af !important;
            border-top: 1px solid #2d3748;
        }

        .email-footer p {
            color: #9ca3af !important;
            margin-bottom: 8px;
        }

        .email-footer a {
            color: #818cf8 !important;
            text-decoration: none;
        }

        .button {
            display: inline-block;
            padding: 14px 32px;
            background: linear-gradient(135deg, #d500f9 0%, #b400c9 60%, #8e24aa 100%) !important;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 20px 0;
            border: none;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .code-box {
            background-color: #000000 !important;
            border: 2px dashed #667eea;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin: 20px 0;
        }

        .code-box p {
            color: #9ca3af !important;
            font-size: 14px;
        }

        .code-box .code {
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 10px;
            color: #818cf8 !important;
            font-family: 'Courier New', monospace;
            text-shadow: 0 0 10px rgba(129, 140, 248, 0.3);
        }

        .info-box {
            background-color: #1e293b !important;
            border-left: 4px solid #3b82f6;
            padding: 18px;
            margin: 20px 0;
            border-radius: 6px;
        }

        .info-box p {
            color: #e4e7eb !important;
            margin: 0;
        }

        .info-box strong {
            color: #60a5fa !important;
        }

        .warning-box {
            background-color: #1e293b !important;
            border-left: 4px solid #f59e0b;
            padding: 18px;
            margin: 20px 0;
            border-radius: 6px;
        }

        .warning-box p {
            color: #e4e7eb !important;
            margin: 0;
        }

        .warning-box strong {
            color: #fbbf24 !important;
        }

        .divider {
            height: 1px;
            background-color: #2d3748;
            margin: 24px 0;
        }

        @media only screen and (max-width: 600px) {
            .email-body {
                padding: 30px 20px;
            }
            .email-header h1 {
                font-size: 26px;
            }
            .email-header {
                padding: 30px 20px;
            }
            .code-box .code {
                font-size: 28px;
                letter-spacing: 6px;
            }
        }

        /* Força as cores em modo dark dos clientes de email */
        @media (prefers-color-scheme: dark) {
            body {
                background-color: #000000 !important;
                color: #e4e7eb !important;
            }
            .email-container {
                background-color: #0a0a0a !important;
            }
            .email-body {
                background-color: #0a0a0a !important;
                color: #e4e7eb !important;
            }
            .email-footer {
                background-color: #000000 !important;
                color: #9ca3af !important;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1 style="color: #ffffff; font-size: 32px;">iSelfToken</h1>
            <div class="tagline">Plataforma de Investimento em Startups</div>
        </div>
        <div class="email-body">
            ${content}
        </div>
        <div class="email-footer">
            <p style="font-weight: 600; margin-bottom: 12px;">iSelfToken</p>
            <p>© ${new Date().getFullYear()} iSelfToken. Todos os direitos reservados.</p>
            <div class="divider" style="margin: 16px auto; width: 60px;"></div>
            <p style="margin-top: 12px; font-size: 11px; opacity: 0.8;">
                Este é um email automático, por favor não responda.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
};
