import { PrismaClient } from '@prisma/client';

/**
 * Bloco CSS inline replicado do `baseTemplate()` (src/email/templates/base.template.ts).
 * Aplicado a todos os templates deste seed para garantir tema dark + magenta
 * `#d500f9` + Inter alinhados com o design system v1.2 do iSelfToken.
 *
 * Templates legados já existentes recebem uma nova versão publicada somente
 * quando ainda estão na versão inicial do seed; versões editadas manualmente
 * permanecem preservadas.
 */
const DARK_EMAIL_STYLE = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0.5px;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .email-header .tagline {
      font-size: 14px;
      color: #e4e7eb !important;
      margin-top: 8px;
      opacity: 0.95;
    }
    .email-body { padding: 40px 30px; background-color: #0a0a0a !important; color: #e4e7eb !important; }
    .email-body h2 { color: #f7fafc !important; margin-bottom: 20px; font-size: 24px; }
    .email-body p { color: #e4e7eb !important; margin-bottom: 16px; }
    .email-body strong { color: #f7fafc !important; font-weight: 600; }
    .email-body ul { color: #e4e7eb !important; }
    .email-body li { color: #e4e7eb !important; margin-bottom: 8px; }
    .email-footer {
      background-color: #000000 !important;
      padding: 24px 30px;
      text-align: center;
      font-size: 12px;
      color: #9ca3af !important;
      border-top: 1px solid #2d3748;
    }
    .email-footer p { color: #9ca3af !important; margin-bottom: 8px; }
    .email-footer a { color: #f0abfc !important; text-decoration: none; }
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
      box-shadow: 0 4px 12px rgba(213, 0, 249, 0.4);
    }
    .button-danger {
      display: inline-block;
      padding: 14px 32px;
      background: #b91c1c !important;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 700;
      margin: 6px 4px;
      box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);
    }
    .button-secondary {
      display: inline-block;
      padding: 12px 24px;
      border: 1px solid #d500f9 !important;
      color: #f0abfc !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      background: transparent !important;
    }
    .code-box {
      background-color: #000000 !important;
      border: 2px dashed #d500f9;
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 20px 0;
    }
    .code-box .code {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 10px;
      color: #f0abfc !important;
      font-family: 'Courier New', monospace;
      text-shadow: 0 0 10px rgba(240, 171, 252, 0.3);
    }
    .info-box {
      background-color: #161616 !important;
      border-left: 4px solid #d500f9;
      padding: 18px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .info-box p { color: #e4e7eb !important; margin: 0; }
    .info-box strong { color: #f0abfc !important; }
    .warning-box {
      background-color: #161616 !important;
      border-left: 4px solid #f59e0b;
      padding: 18px;
      margin: 20px 0;
      border-radius: 6px;
    }
    .warning-box p { color: #e4e7eb !important; margin: 0; }
    .warning-box strong { color: #fbbf24 !important; }
    .detail-table {
      width: 100%;
      margin: 12px 0 0;
      border-collapse: collapse;
    }
    .detail-table td {
      padding: 8px 0;
      color: #e4e7eb !important;
      font-size: 14px;
      vertical-align: top;
    }
    .detail-table td.label {
      color: #c4c4c8 !important;
      font-size: 13px;
      width: 120px;
    }
    .detail-table td.value {
      color: #f5f5f5 !important;
      font-family: 'Courier New', monospace;
    }
    .lgpd-note {
      font-size: 11px;
      color: #9ca3af !important;
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #2d3748;
    }
    @media only screen and (max-width: 600px) {
      .email-body { padding: 30px 20px; }
      .email-header { padding: 30px 20px; }
      .email-header h1 { font-size: 26px; }
      .code-box .code { font-size: 28px; letter-spacing: 6px; }
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #000000 !important; color: #e4e7eb !important; }
      .email-container { background-color: #0a0a0a !important; }
      .email-body { background-color: #0a0a0a !important; color: #e4e7eb !important; }
      .email-footer { background-color: #000000 !important; color: #9ca3af !important; }
    }
`;

/**
 * Helper para envolver o conteúdo em um documento HTML completo com o tema dark/magenta.
 * Cada template armazena no banco o documento HTML inteiro (com `<head>`, `<style>` e
 * `<body>`), permitindo edição via painel admin sem perder o visual.
 */
const darkEmailTemplate = (
  title: string,
  bodyContent: string,
): string => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title} — iSelfToken</title>
  <style>${DARK_EMAIL_STYLE}</style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <h1>iSelfToken</h1>
      <div class="tagline">Plataforma de Investimento em Startups</div>
    </div>
    <div class="email-body">
      ${bodyContent}
    </div>
    <div class="email-footer">
      <p style="font-weight: 600; margin-bottom: 12px;">iSelfToken</p>
      <p>© ${new Date().getFullYear()} iSelfToken. Todos os direitos reservados.</p>
      <p class="lgpd-note">Este é um email automático. Em caso de dúvidas, consulte nossa <a href="{{frontendUrl}}/politica-privacidade">Política de Privacidade</a> ou entre em contato com o suporte.</p>
    </div>
  </div>
</body>
</html>`;

const LEGACY_EMAIL_COLOR_REPLACEMENTS: Array<[string, string]> = [
  ['#667eea', '#d500f9'],
  ['#764ba2', '#8e24aa'],
  ['#818cf8', '#f0abff'],
  ['#3b82f6', '#d500f9'],
  ['#1f2937', '#f7fafc'],
  ['#374151', '#e4e7eb'],
  ['#4b5563', '#c4c4c8'],
  ['#6b7280', '#9ca3af'],
  ['#f9fafb', '#161616'],
  ['#e5e7eb', '#2d3748'],
];

/**
 * Atualiza templates legados para o layout oficial sem alterar variáveis.
 * Templates que já são documentos dark completos permanecem estruturados,
 * mas ainda recebem a substituição das cores antigas.
 */
function brandEmailTemplateHtml(subject: string, htmlTemplate: string): string {
  const html = htmlTemplate.trimStart().startsWith('<!DOCTYPE html>')
    ? htmlTemplate
    : darkEmailTemplate(subject, htmlTemplate);

  return LEGACY_EMAIL_COLOR_REPLACEMENTS.reduce(
    (branded, [legacy, current]) => branded.replaceAll(legacy, current),
    html,
  );
}

/** Seed data for email templates. Cria e migra apenas versões legadas do seed. */
export async function seedEmailTemplates(prisma: PrismaClient) {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.warn('[seedEmailTemplates] Admin user not found, skipping');
    return;
  }

  const templates = [
    // ── 1. Welcome ──────────────────────────────────────────────────────────
    {
      slug: 'welcome',
      name: 'Boas-vindas',
      description: 'Email de boas-vindas para novos usuários',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          loginUrl: { type: 'string' },
        },
        required: ['userName', 'loginUrl'],
        additionalProperties: false,
      } as any,
      subject: 'Bem-vindo à iSelfToken! 🎉',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Bem-vindo à iSelfToken! 🎉</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>
<p style="margin-bottom: 16px;">É com grande satisfação que te damos as boas-vindas à <strong>iSelfToken</strong>, sua plataforma de investimento em startups inovadoras!</p>
<div class="info-box">
  <p style="margin: 0;"><strong>Próximos passos:</strong></p>
  <ul style="margin: 12px 0 0 20px; padding: 0;">
    <li>Complete a confirmação de email</li>
    <li>Complete seu perfil para ter acesso completo</li>
    <li>Explore as startups disponíveis para investimento</li>
    <li>Configure suas preferências de investimento</li>
    <li>Verifique sua identidade (KYC) para começar a investir</li>
  </ul>
</div>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280; margin-top: 20px;">Se você não criou esta conta, por favor ignore este email ou entre em contato com nosso suporte imediatamente.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Bem-vindo à iSelfToken!\n\nOlá {{userName}},\n\nÉ com grande satisfação que te damos as boas-vindas à iSelfToken, sua plataforma de investimento em startups inovadoras!\n\nPróximos passos:\n- Complete a confirmação de email\n- Complete seu perfil\n- Explore as startups disponíveis\n- Verifique sua identidade (KYC)\n\nAtenciosamente,\nEquipe iSelfToken`,
    },
    // ── 2. Verification Code ────────────────────────────────────────────────
    {
      slug: 'verification-code',
      name: 'Código 2FA',
      description: 'Email com código de verificação para 2FA',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          code: { type: 'string' },
          expiresInMinutes: { type: 'number' },
        },
        required: ['userName', 'code', 'expiresInMinutes'],
        additionalProperties: false,
      } as any,
      subject: 'Código de Verificação - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Código de Verificação</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>
<p style="margin-bottom: 16px;">Utilize o código abaixo para validar seu acesso:</p>
<div class="code-box">
  <p style="color: #9ca3af; font-size: 14px; margin-bottom: 8px;">Seu código de verificação:</p>
  <p class="code">{{code}}</p>
</div>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Este código expira em <strong>{{expiresInMinutes}} minutos</strong>. Se você não solicitou este código, ignore este email.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Código de Verificação\n\nOlá {{userName}},\n\nUtilize o código abaixo para validar seu acesso:\n\n{{code}}\n\nEste código expira em {{expiresInMinutes}} minutos.\nSe você não solicitou este código, ignore este email.\n\nAtenciosamente,\nEquipe iSelfToken`,
    },
    // ── 3. Validation Email ──────────────────────────────────────────────────
    {
      slug: 'validation-email',
      name: 'Confirmação de cadastro',
      description: 'Email de validação de cadastro (confirmação de email)',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          validationUrl: { type: 'string' },
          expiresInHours: { type: 'number' },
        },
        required: ['userName', 'validationUrl', 'expiresInHours'],
        additionalProperties: false,
      } as any,
      subject: 'Confirme seu Email - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Confirme seu Email</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>
<p style="margin-bottom: 16px;">Por favor, confirme seu email clicando no botão abaixo:</p>
<p style="margin: 20px 0;">
  <a href="{{validationUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Confirmar Email</a>
</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Este link expira em <strong>{{expiresInHours}} horas</strong>.</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Se você não solicitou este email, ignore esta mensagem.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Confirme seu Email\n\nOlá {{userName}},\n\nPor favor, confirme seu email acessando:\n{{validationUrl}}\n\nEste link expira em {{expiresInHours}} horas.\nSe você não solicitou este email, ignore esta mensagem.\n\nAtenciosamente,\nEquipe iSelfToken`,
    },
    // ── 4. Forgot Password ───────────────────────────────────────────────────
    {
      slug: 'forgot-password',
      name: 'Recuperação de senha',
      description: 'Email para recuperação de senha',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          resetUrl: { type: 'string' },
          expiresInMinutes: { type: 'number' },
        },
        required: ['userName', 'resetUrl', 'expiresInMinutes'],
        additionalProperties: false,
      } as any,
      subject: 'Recuperação de Senha - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Recuperação de Senha</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>
<p style="margin-bottom: 16px;">Você solicitou a recuperação de senha da sua conta iSelfToken. Clique no botão abaixo para criar uma nova senha:</p>
<p style="margin: 20px 0;">
  <a href="{{resetUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Redefinir Senha</a>
</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Este link expira em <strong>{{expiresInMinutes}} minutos</strong> e pode ser usado uma única vez.</p>
<div class="warning-box">
  <p style="margin: 0;"><strong>Atenção:</strong> Se você não solicitou a recuperação de senha, por favor ignore este email. Sua senha atual permanece inalterada.</p>
</div>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Recuperação de Senha\n\nOlá {{userName}},\n\nVocê solicitou a recuperação de senha. Acesse:\n{{resetUrl}}\n\nEste link expira em {{expiresInMinutes}} minutos.\nSe você não solicitou, ignore este email.\n\nAtenciosamente,\nEquipe iSelfToken`,
    },
    // ── 5. Rejection Notification ───────────────────────────────────────────
    {
      slug: 'rejection-notification',
      name: 'Notificação de rejeição',
      description:
        'Email de notificação de rejeição de startup pelo compliance',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          reason: { type: 'string' },
          contextUrl: { type: 'string' },
        },
        required: ['userName', 'reason', 'contextUrl'],
        additionalProperties: false,
      } as any,
      subject: 'Atualização sobre sua startup - Compliance',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Atualização sobre sua startup</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>
<p style="margin-bottom: 16px;">Sua startup foi reprovada na análise de compliance.</p>
<p style="margin-bottom: 8px;"><strong>Motivo:</strong></p>
<blockquote style="border-left: 4px solid #e5e7eb; padding: 12px 16px; margin: 0 0 16px 0; color: #374151; background: #f9fafb;">{{reason}}</blockquote>
<p style="margin-bottom: 16px;">Para corrigir e reenviar a análise, acesse:</p>
<p style="margin: 20px 0;">
  <a href="{{contextUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Corrigir e reenviar</a>
</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Em caso de dúvidas, responda este email ou entre em contato com nosso suporte.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken - Compliance</strong></p>`,
      textTemplate: `Atualização sobre sua startup\n\nOlá {{userName}},\n\nSua startup foi reprovada na análise de compliance.\n\nMotivo:\n{{reason}}\n\nPara corrigir e reenviar, acesse:\n{{contextUrl}}\n\nEm caso de dúvidas, responda este email.\n\nAtenciosamente,\nEquipe iSelfToken - Compliance`,
    },
    // ── 6. Repasse Configurado ─────────────────────────────────────────────
    {
      slug: 'repasse-configurado',
      name: 'Repasse configurado pelo Financeiro',
      description:
        'Notifica o fundador quando o financeiro configura o plano de repasse',
      variablesSchema: {
        type: 'object',
        properties: {
          founderName: { type: 'string' },
          startupName: { type: 'string' },
          valorParcela: { type: 'string' },
          intervaloDias: { type: 'number' },
          numeroParcelas: { type: 'number' },
          dashboardUrl: { type: 'string' },
        },
        required: [
          'founderName',
          'startupName',
          'valorParcela',
          'intervaloDias',
          'numeroParcelas',
          'dashboardUrl',
        ],
        additionalProperties: false,
      } as any,
      subject: 'Repasse configurado para {{startupName}} - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Repasse Configurado</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{founderName}}</strong>,</p>
<p style="margin-bottom: 16px;">Boas notícias! O departamento financeiro configurou o plano de repasse para a startup <strong>{{startupName}}</strong>.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Resumo da configuração:</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li>Valor por parcela: <strong>{{valorParcela}}</strong></li>
    <li>Intervalo entre parcelas: <strong>{{intervaloDias}} dias</strong></li>
    <li>Número de parcelas: <strong>{{numeroParcelas}}</strong></li>
  </ul>
</div>
<p style="margin-bottom: 16px;">Acesse o dashboard para acompanhar o progresso dos repasses:</p>
<p style="margin: 20px 0;">
  <a href="{{dashboardUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Acessar Dashboard</a>
</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Em caso de dúvidas, entre em contato com nosso departamento financeiro.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken - Financeiro</strong></p>`,
      textTemplate: `Repasse Configurado\n\nOlá {{founderName}},\n\nBoas notícias! O departamento financeiro configurou o plano de repasse para a startup {{startupName}}.\n\nResumo:\n- Valor por parcela: {{valorParcela}}\n- Intervalo: {{intervaloDias}} dias\n- Número de parcelas: {{numeroParcelas}}\n\nAcesse o dashboard:\n{{dashboardUrl}}\n\nAtenciosamente,\nEquipe iSelfToken - Financeiro`,
    },
    // ── 7. Parcela Solicitada ───────────────────────────────────────────────
    {
      slug: 'parcela-solicitada',
      name: 'Parcela solicitada pelo Fundador',
      description:
        'Notifica o financeiro quando o fundador solicita uma parcela de repasse',
      variablesSchema: {
        type: 'object',
        properties: {
          financeiroName: { type: 'string' },
          founderName: { type: 'string' },
          startupName: { type: 'string' },
          installmentNumber: { type: 'number' },
          totalInstallments: { type: 'number' },
          valor: { type: 'string' },
          allocationPercents: { type: 'string' },
          reviewUrl: { type: 'string' },
        },
        required: [
          'financeiroName',
          'founderName',
          'startupName',
          'installmentNumber',
          'totalInstallments',
          'valor',
          'allocationPercents',
          'reviewUrl',
        ],
        additionalProperties: false,
      } as any,
      subject:
        'Nova solicitação de parcela - {{startupName}} (#{{installmentNumber}}/{{totalInstallments}})',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Nova Solicitação de Parcela</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{financeiroName}}</strong>,</p>
<p style="margin-bottom: 16px;">O fundador <strong>{{founderName}}</strong> da startup <strong>{{startupName}}</strong> acabou de solicitar uma nova parcela de repasse.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Detalhes da solicitação:</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li>Parcela: <strong>{{installmentNumber}}/{{totalInstallments}}</strong></li>
    <li>Valor solicitado: <strong>{{valor}}</strong></li>
    <li>Alocação: <strong>{{allocationPercents}}</strong></li>
  </ul>
</div>
<p style="margin-bottom: 16px;">Por favor, revise e aprove ou rejeite a solicitação:</p>
<p style="margin: 20px 0;">
  <a href="{{reviewUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Revisar Solicitação</a>
</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Lembre-se: a aprovação deve ocorrer dentro do SLA de 5 dias úteis.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Nova Solicitação de Parcela\n\nOlá {{financeiroName}},\n\nO fundador {{founderName}} da startup {{startupName}} acabou de solicitar uma nova parcela.\n\nDetalhes:\n- Parcela: {{installmentNumber}}/{{totalInstallments}}\n- Valor: {{valor}}\n- Alocação: {{allocationPercents}}\n\nRevise a solicitação:\n{{reviewUrl}}\n\nLembre-se: a aprovação deve ocorrer dentro do SLA de 5 dias úteis.\n\nAtenciosamente,\nEquipe iSelfToken`,
    },
    // ── 8. Parcela Aprovada ─────────────────────────────────────────────────
    {
      slug: 'parcela-aprovada',
      name: 'Parcela aprovada pelo Financeiro',
      description:
        'Notifica o fundador quando uma parcela é aprovada pelo financeiro',
      variablesSchema: {
        type: 'object',
        properties: {
          founderName: { type: 'string' },
          installmentNumber: { type: 'number' },
          totalInstallments: { type: 'number' },
          valor: { type: 'string' },
          scheduledDate: { type: 'string' },
          dashboardUrl: { type: 'string' },
        },
        required: [
          'founderName',
          'installmentNumber',
          'totalInstallments',
          'valor',
          'scheduledDate',
          'dashboardUrl',
        ],
        additionalProperties: false,
      } as any,
      subject: 'Parcela #{{installmentNumber}} aprovada! - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Parcela Aprovada! 🎉</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{founderName}}</strong>,</p>
<p style="margin-bottom: 16px;">Ótimas notícias! A parcela <strong>{{installmentNumber}} de {{totalInstallments}}</strong> do seu repasse foi aprovada pelo departamento financeiro.</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Resumo:</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li>Parcela: <strong>{{installmentNumber}}/{{totalInstallments}}</strong></li>
    <li>Valor: <strong>{{valor}}</strong></li>
    <li>Data prevista: <strong>{{scheduledDate}}</strong></li>
  </ul>
</div>
<p style="margin-bottom: 16px;">O valor será depositado na conta bancária cadastrada na data prevista.</p>
<p style="margin-bottom: 16px;">Acompanhe o status pelo dashboard:</p>
<p style="margin: 20px 0;">
  <a href="{{dashboardUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Acessar Dashboard</a>
</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken - Financeiro</strong></p>`,
      textTemplate: `Parcela Aprovada!\n\nOlá {{founderName}},\n\nA parcela {{installmentNumber}} de {{totalInstallments}} do seu repasse foi aprovada.\n\nResumo:\n- Parcela: {{installmentNumber}}/{{totalInstallments}}\n- Valor: {{valor}}\n- Data prevista: {{scheduledDate}}\n\nO valor será depositado na conta bancária cadastrada na data prevista.\n\nAcompanhe pelo dashboard:\n{{dashboardUrl}}\n\nAtenciosamente,\nEquipe iSelfToken - Financeiro`,
    },
    // ── 9. Parcela Rejeitada ────────────────────────────────────────────────
    {
      slug: 'parcela-rejeitada',
      name: 'Parcela rejeitada',
      description:
        'Notifica o fundador quando uma parcela é rejeitada pelo financeiro',
      variablesSchema: {
        type: 'object',
        properties: {
          founderName: { type: 'string' },
          installmentNumber: { type: 'number' },
          rejectionReason: { type: 'string' },
          resubmitUrl: { type: 'string' },
        },
        required: [
          'founderName',
          'installmentNumber',
          'rejectionReason',
          'resubmitUrl',
        ],
        additionalProperties: false,
      } as any,
      subject: 'Parcela #{{installmentNumber}} rejeitada - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Parcela Rejeitada</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{founderName}}</strong>,</p>
<p style="margin-bottom: 16px;">Infelizmente, a parcela <strong>{{installmentNumber}}</strong> do seu repasse foi rejeitada pelo departamento financeiro.</p>
<p style="margin-bottom: 8px;"><strong>Motivo da rejeição:</strong></p>
<blockquote style="border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 0 0 16px 0; color: #374151; background: #fffbeb;">{{rejectionReason}}</blockquote>
<p style="margin-bottom: 16px;">Você pode corrigir os dados e reenviar a solicitação:</p>
<p style="margin: 20px 0;">
  <a href="{{resubmitUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Corrigir e reenviar</a>
</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Após o reenvio, o financeiro terá 5 dias úteis para analisar novamente.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken - Financeiro</strong></p>`,
      textTemplate: `Parcela Rejeitada\n\nOlá {{founderName}},\n\nA parcela {{installmentNumber}} do seu repasse foi rejeitada.\n\nMotivo:\n{{rejectionReason}}\n\nVocê pode corrigir e reenviar:\n{{resubmitUrl}}\n\nApós o reenvio, o financeiro terá 5 dias úteis para analisar novamente.\n\nAtenciosamente,\nEquipe iSelfToken - Financeiro`,
    },
    // ── 10. Parcela Depositada ─────────────────────────────────────────────
    {
      slug: 'parcela-depositada',
      name: 'Parcela depositada (PIX)',
      description:
        'Notifica o fundador quando uma parcela é depositada via PIX',
      variablesSchema: {
        type: 'object',
        properties: {
          founderName: { type: 'string' },
          installmentNumber: { type: 'number' },
          valor: { type: 'string' },
          paidAt: { type: 'string' },
          txidC6: { type: 'string' },
          comprovanteUrl: { type: 'string' },
        },
        required: [
          'founderName',
          'installmentNumber',
          'valor',
          'paidAt',
          'txidC6',
          'comprovanteUrl',
        ],
        additionalProperties: false,
      } as any,
      subject:
        'Parcela #{{installmentNumber}} depositada! R$ {{valor}} - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Parcela Depositada! 💰</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{founderName}}</strong>,</p>
<p style="margin-bottom: 16px;">O valor da parcela <strong>{{installmentNumber}}</strong> do seu repasse foi depositado com sucesso!</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Confirmação do depósito:</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li>Parcela: <strong>{{installmentNumber}}</strong></li>
    <li>Valor creditado: <strong>{{valor}}</strong></li>
    <li>Data do crédito: <strong>{{paidAt}}</strong></li>
    <li>ID da transação (C6 Bank): <strong>{{txidC6}}</strong></li>
  </ul>
</div>
<p style="margin-bottom: 16px;">Baixe o comprovante:</p>
<p style="margin: 20px 0;">
  <a href="{{comprovanteUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Baixar Comprovante</a>
</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">O comprovante também está disponível no seu dashboard de repasses.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken - Financeiro</strong></p>`,
      textTemplate: `Parcela Depositada!\n\nOlá {{founderName}},\n\nO valor da parcela {{installmentNumber}} do seu repasse foi depositado!\n\nConfirmação:\n- Parcela: {{installmentNumber}}\n- Valor: {{valor}}\n- Data: {{paidAt}}\n- ID C6 Bank: {{txidC6}}\n\nBaixe o comprovante:\n{{comprovanteUrl}}\n\nAtenciosamente,\nEquipe iSelfToken - Financeiro`,
    },
    // ── 11. Repasse Concluído ────────────────────────────────────────────────
    {
      slug: 'repasse-concluido',
      name: 'Repasse totalmente concluído',
      description:
        'Notifica quando todas as parcelas de um repasse foram depositadas',
      variablesSchema: {
        type: 'object',
        properties: {
          recipientName: { type: 'string' },
          startupName: { type: 'string' },
          valorTotalPago: { type: 'string' },
          numeroParcelas: { type: 'number' },
        },
        required: [
          'recipientName',
          'startupName',
          'valorTotalPago',
          'numeroParcelas',
        ],
        additionalProperties: false,
      } as any,
      subject:
        'Repasse concluído! R$ {{valorTotalPago}} depositados - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Repasse Concluído! 🎉</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{recipientName}}</strong>,</p>
<p style="margin-bottom: 16px;">Parabéns! Todas as <strong>{{numeroParcelas}} parcelas</strong> do repasse referente à startup <strong>{{startupName}}</strong> foram depositadas com sucesso!</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>Resumo final do repasse:</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li>Startup: <strong>{{startupName}}</strong></li>
    <li>Total depositado: <strong>{{valorTotalPago}}</strong></li>
    <li>Parcelas pagas: <strong>{{numeroParcelas}}</strong></li>
  </ul>
</div>
<p style="margin-bottom: 16px;">Obrigado por confiar na iSelfToken! Continuamos à disposição para apoiá-lo na próxima rodada.</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">Emitimos o relatório completo de repasses no seu dashboard para sua contabilidade.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Repasse Concluído!\n\nOlá {{recipientName}},\n\nParabéns! Todas as {{numeroParcelas}} parcelas do repasse referente à startup {{startupName}} foram depositadas!\n\nResumo:\n- Startup: {{startupName}}\n- Total depositado: {{valorTotalPago}}\n- Parcelas pagas: {{numeroParcelas}}\n\nObrigado por confiar na iSelfToken!\n\nAtenciosamente,\nEquipe iSelfToken`,
    },
    // ── 12. Marketplace Position Launch (S5-T04) ───────────────────────────
    {
      slug: 'marketplace-position-launch',
      name: 'Lançamento do card Posição no Marketplace',
      description:
        'Notifica fundadores ativos sobre o novo card /founder/dashboard com score 0..100 e breakdown de 9 chaves.',
      variablesSchema: {
        type: 'object',
        properties: {
          founderName: { type: 'string' },
          dashboardUrl: { type: 'string' },
          learnMoreUrl: { type: 'string' },
        },
        required: ['founderName', 'dashboardUrl', 'learnMoreUrl'],
        additionalProperties: false,
      } as any,
      subject: 'Sua posição no marketplace, agora visível 🎯 - iSelfToken',
      htmlTemplate: `<h2 style="color: #1f2937; margin-bottom: 20px;">Sua posicao no marketplace, agora visivel 🎯</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{founderName}}</strong>,</p>
<p style="margin-bottom: 16px;">Adicionamos um novo card no seu <strong>/founder/dashboard</strong> mostrando sua posicao no marketplace: score de <strong>0 a 100</strong> com breakdown de 9 criterios (KYC, documentos, selos, captacao, prazo, categoria, parcerias, atividade).</p>
<div class="info-box">
  <p style="margin: 0 0 8px 0;"><strong>O que mudou para voce:</strong></p>
  <ul style="margin: 0; padding-left: 20px;">
    <li>Voce ve o score atual e o timestamp do ultimo calculo</li>
    <li>Ha um botao "Como melhorar?" que mostra onde ganhar pontos</li>
    <li>Badges visuais: "Em destaque por: motivo" (pin de ADMIN) ou "Score alto" (>= 85)</li>
    <li>Pinos manuais do ADMIN entram no /marketplace/featured em ate 5 minutos</li>
  </ul>
</div>
<p style="margin-bottom: 16px;">Acesse seu dashboard para ver a posicao atual:</p>
<p style="margin: 20px 0;">
  <a href="{{dashboardUrl}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Ver meu score</a>
</p>
<p style="margin-bottom: 16px;">Quer entender como o score e calculado?</p>
<p style="margin: 20px 0;">
  <a href="{{learnMoreUrl}}" style="display: inline-block; padding: 12px 24px; border: 1px solid #667eea; color: #667eea; text-decoration: none; border-radius: 8px; font-weight: 600;">Ler documentacao do algoritmo</a>
</p>
<p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">O score e recalculado diariamente as 03:00 BRT e tambem em eventos (upload de documento, aprovacao KYC, conquista de selo, mudanca de status de captacao). Pinos manuais do ADMIN entram em ate 5 minutos.</p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Sua posicao no marketplace, agora visivel\n\nOla {{founderName}},\n\nAdicionamos um novo card no seu /founder/dashboard mostrando sua posicao no marketplace: score de 0 a 100 com breakdown de 9 criterios (KYC, documentos, selos, captacao, prazo, categoria, parcerias, atividade).\n\nO que mudou:\n- Voce ve o score atual e o timestamp do ultimo calculo\n- Ha um botao "Como melhorar?" que mostra onde ganhar pontos\n- Badges visuais: "Em destaque por: motivo" (pin de ADMIN) ou "Score alto" (>= 85)\n- Pinos manuais do ADMIN entram no /marketplace/featured em ate 5 minutos\n\nAcesse seu dashboard:\n{{dashboardUrl}}\n\nQuer entender o algoritmo? Veja:\n{{learnMoreUrl}}\n\nAtenciosamente,\nEquipe iSelfToken`,
    },
    // ── 13. New Login Alert (Fase A.6) ────────────────────────────────────────
    // Tema dark + magenta alinhado ao design system v1.2 do iSelfToken.
    // Equivalente ao template hardcoded `src/email/templates/new-login-alert.template.ts`
    // — agora editável pelo painel admin em /admin/email-templates/new-login-alert.
    {
      slug: 'new-login-alert',
      name: 'Alerta de novo acesso',
      description:
        'Notifica o usuário quando um novo login é detectado em conta protegida (Fase A.6 — link "Não fui eu").',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          timestamp: { type: 'string' },
          ip: { type: 'string' },
          ipContext: { type: 'string' },
          deviceLabel: { type: 'string' },
          locationLabel: { type: 'string' },
          timezone: { type: 'string' },
          org: { type: 'string' },
          reason: { type: 'string' },
          confirmUrl: { type: 'string' },
          dismissUrl: { type: 'string' },
        },
        required: [
          'userName',
          'timestamp',
          'ip',
          'ipContext',
          'deviceLabel',
          'locationLabel',
          'reason',
          'confirmUrl',
          'dismissUrl',
        ],
        additionalProperties: false,
      } as any,
      subject: 'Novo acesso detectado na sua conta iSelfToken 🔐',
      htmlTemplate: darkEmailTemplate(
        'Novo acesso detectado',
        `
    <h2 style="color: #f7fafc !important; margin-bottom: 20px;">Novo acesso detectado 🚨</h2>
    <p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>
    <p style="margin-bottom: 16px;">
      Identificamos um novo acesso à sua conta <strong>iSelfToken</strong>.
      Se foi você, confirme abaixo. Caso contrário, clique em <strong>Não fui eu</strong> para bloquear.
    </p>

    <div class="warning-box">
      <p style="margin: 0;"><strong>⚠️ Motivo da notificação:</strong><br>{{reason}}</p>
    </div>

    <div class="info-box">
      <p style="margin: 0 0 12px 0;"><strong>📋 Detalhes do acesso:</strong></p>
      <table class="detail-table" role="presentation">
        <tr>
          <td class="label">Data/Hora</td>
          <td class="value">{{timestamp}}</td>
        </tr>
        <tr>
          <td class="label">IP</td>
          <td class="value">{{ip}}</td>
        </tr>
        <tr>
          <td class="label">Tipo</td>
          <td class="value">{{ipContext}}</td>
        </tr>
        <tr>
          <td class="label">Dispositivo</td>
          <td class="value">{{deviceLabel}}</td>
        </tr>
        <tr>
          <td class="label">Localização</td>
          <td class="value">{{locationLabel}}</td>
        </tr>
      </table>
    </div>

    <p style="font-weight: 600; color: #f7fafc !important; margin: 24px 0 12px;">
      Você reconhece este acesso?
    </p>

    <div style="text-align: center; margin: 28px 0 20px;">
      <a href="{{confirmUrl}}" class="button" style="background: #d500f9 !important; color: #000000 !important; font-weight: 700;">
        ✓ Sim, fui eu
      </a>
      <a href="{{dismissUrl}}" class="button-danger">
        ✗ Não fui eu
      </a>
    </div>

    <div class="warning-box">
      <p style="margin: 0;">
        <strong>🔒 Segurança:</strong><br>
        Se você não reconhece este acesso, clique em <strong>"Não fui eu"</strong> para
        desconectar todas as sessões e exigir a troca da senha imediatamente.
      </p>
    </div>

    <p style="margin-top: 24px; margin-bottom: 16px; font-size: 14px; color: #9ca3af !important;">
      As ações acima são protegidas e não criam uma nova sessão.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0; color: #f7fafc !important;">
      Atenciosamente,<br>
      <strong>Equipe iSelfToken</strong>
    </p>
        `.trim(),
      ),
      textTemplate: `Novo acesso detectado na sua conta iSelfToken

Olá {{userName}},

Identificamos um novo acesso à sua conta iSelfToken.
Se foi você, confirme abaixo. Caso contrário, clique em "Não fui eu" para bloquear.

Motivo: {{reason}}

Detalhes do acesso:
- Data/Hora: {{timestamp}}
- IP: {{ip}}
- Tipo: {{ipContext}}
- Dispositivo: {{deviceLabel}}
- Localização: {{locationLabel}}

Você reconhece este acesso?
- Confirmar (Sim, fui eu): {{confirmUrl}}
- Bloquear (Não fui eu): {{dismissUrl}}

Se você não reconhece este acesso, clique em "Não fui eu" para desconectar todas as sessões e exigir a troca da senha imediatamente.

As ações acima são protegidas e não criam uma nova sessão.

Atenciosamente,
Equipe iSelfToken`,
    },
    // ── 14. KYC Resubmission Requested (Compliance) ────────────────────────────
    // Tema dark + magenta. Equivalente ao template hardcoded
    // `src/email/templates/kyc-resubmission-requested.template.ts`.
    {
      slug: 'kyc-resubmission-requested',
      name: 'Novo envio necessário para KYC',
      description:
        'Notifica o usuário quando o Compliance solicita reenvio de um documento específico do KYC.',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          documentName: { type: 'string' },
          reason: { type: 'string' },
          redirectUrl: { type: 'string' },
        },
        required: ['userName', 'documentName', 'reason', 'redirectUrl'],
        additionalProperties: false,
      } as any,
      subject: 'Novo envio necessário para seu KYC — iSelfToken',
      htmlTemplate: darkEmailTemplate(
        'Novo envio necessário para seu KYC',
        `
    <h2 style="color: #f7fafc !important; margin-bottom: 20px;">Novo envio necessário para seu KYC 📄</h2>
    <p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>
    <p style="margin-bottom: 16px;">
      A equipe de análise solicitou um novo envio para o documento
      <strong>{{documentName}}</strong> do seu KYC.
    </p>

    <p style="margin-bottom: 8px;"><strong>Orientação da análise:</strong></p>
    <blockquote style="border-left: 4px solid #d500f9; padding: 12px 16px; margin: 0 0 16px 0; color: #e4e7eb; background: #161616;">
      {{reason}}
    </blockquote>

    <p style="margin-bottom: 16px;">
      Acesse seu perfil e envie uma nova imagem ou vídeo com boa qualidade
      e todos os dados visíveis para acelerar a nova análise.
    </p>

    <p style="margin: 24px 0;">
      <a href="{{redirectUrl}}" class="button">
        Reenviar documento
      </a>
    </p>

    <div class="info-box">
      <p style="margin: 0;">
        <strong>📌 Dicas para um reenvio bem-sucedido:</strong>
        <ul style="margin: 12px 0 0 20px; padding: 0;">
          <li>Boa iluminação, sem reflexos ou sombras</li>
          <li>Documento dentro da validade</li>
          <li>Todos os cantos visíveis e sem cortes</li>
          <li>Texto legível e sem borrões</li>
        </ul>
      </p>
    </div>

    <p style="margin-top: 24px; margin-bottom: 16px; font-size: 14px; color: #9ca3af !important;">
      Se você já realizou o reenvio, aguarde a nova análise. Em caso de dúvidas,
      entre em contato com o suporte.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0; color: #f7fafc !important;">
      Atenciosamente,<br>
      <strong>Equipe iSelfToken — Compliance</strong>
    </p>
        `.trim(),
      ),
      textTemplate: `Novo envio necessário para seu KYC

Olá {{userName}},

A equipe de análise solicitou um novo envio para o documento {{documentName}} do seu KYC.

Orientação da análise:
{{reason}}

Acesse seu perfil e envie uma nova imagem ou vídeo com boa qualidade e todos os dados visíveis para acelerar a nova análise:

{{redirectUrl}}

Dicas para um reenvio bem-sucedido:
- Boa iluminação, sem reflexos ou sombras
- Documento dentro da validade
- Todos os cantos visíveis e sem cortes
- Texto legível e sem borrões

Se você já realizou o reenvio, aguarde a nova análise. Em caso de dúvidas, entre em contato com o suporte.

Atenciosamente,
Equipe iSelfToken — Compliance`,
    },

    // ── 15. Compra de tokens (Sprint de Notificações — central 2026-10-04) ─
    {
      slug: 'compra-tokens',
      name: 'Compra de tokens confirmada',
      description:
        'Email enviado quando o investidor confirma compra de tokens',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          startupName: { type: 'string' },
          quantity: { type: 'number' },
          totalAmount: { type: 'string' },
          campaignTitle: { type: 'string', nullable: true },
        },
        required: ['userName', 'startupName', 'quantity', 'totalAmount'],
        additionalProperties: false,
      } as any,
      subject: 'Compra de tokens confirmada | iSelfToken',
      htmlTemplate: `<h2 style="margin-bottom: 20px;">Compra de tokens confirmada ✓</h2>
<p style="margin-bottom: 16px;">Olá <strong>{{userName}}</strong>,</p>
<p style="margin-bottom: 16px;">Sua compra de <strong>{{quantity}} tokens</strong> da startup <strong>{{startupName}}</strong>{{#if campaignTitle}} ({{campaignTitle}}){{/if}} foi confirmada com sucesso.</p>
<p style="margin-bottom: 16px;"><strong>Valor total:</strong> {{totalAmount}}</p>
<p style="margin-bottom: 16px;">Os tokens já estão disponíveis na sua carteira. Você pode acompanhar seus investimentos pelo seu dashboard.</p>
<p style="margin: 24px 0;"><a href="{{walletUrl}}" class="button">Ver minha carteira</a></p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Compra de tokens confirmada

Olá {{userName}},

Sua compra de {{quantity}} tokens da startup {{startupName}}{{#if campaignTitle}} ({{campaignTitle}}){{/if}} foi confirmada com sucesso.

Valor total: {{totalAmount}}

Os tokens já estão disponíveis na sua carteira. Acesse sua wallet para acompanhar: {{walletUrl}}

Atenciosamente,
Equipe iSelfToken`,
    },

    // ── 16. Fase aprovada (Sprint de Notificações — central 2026-10-04) ──
    {
      slug: 'fase-aprovada',
      name: 'Fase da startup aprovada',
      description:
        'Email enviado quando uma fase (1/2/3) da startup é aprovada pelo compliance',
      variablesSchema: {
        type: 'object',
        properties: {
          founderName: { type: 'string' },
          startupName: { type: 'string' },
          phaseLabel: { type: 'string' },
          nextStep: { type: 'string' },
        },
        required: ['founderName', 'startupName', 'phaseLabel', 'nextStep'],
        additionalProperties: false,
      } as any,
      subject: '{{phaseLabel}} aprovada | iSelfToken',
      htmlTemplate: `<h2 style="margin-bottom: 20px;">{{phaseLabel}} aprovada ✓</h2>
<p style="margin-bottom: 16px;">Olá, <strong>{{founderName}}</strong>!</p>
<p style="margin-bottom: 16px;">A startup <strong>{{startupName}}</strong> teve sua <strong>{{phaseLabel}}</strong> aprovada pelo nosso time de compliance.</p>
<p style="margin-bottom: 16px;"><strong>Próximo passo:</strong> {{nextStep}}</p>
<p style="margin: 24px 0;"><a href="{{dashboardUrl}}" class="button">Ir para o dashboard</a></p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `{{phaseLabel}} aprovada

Olá, {{founderName}}!

A startup {{startupName}} teve sua {{phaseLabel}} aprovada pelo nosso time de compliance.

Próximo passo: {{nextStep}}

Acesse seu dashboard: {{dashboardUrl}}

Atenciosamente,
Equipe iSelfToken`,
    },

    // ── 17. KYC aprovado (Sprint de Notificações — central 2026-10-04) ──
    {
      slug: 'kyc-approved',
      name: 'KYC aprovado',
      description: 'Email enviado quando o compliance aprova o KYC do usuário',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
        },
        required: ['userName'],
        additionalProperties: false,
      } as any,
      subject: 'KYC aprovado | iSelfToken',
      htmlTemplate: `<h2 style="margin-bottom: 20px;">KYC aprovado ✓</h2>
<p style="margin-bottom: 16px;">Olá, <strong>{{userName}}</strong>!</p>
<p style="margin-bottom: 16px;">Seu processo de KYC (Know Your Customer) foi <strong>aprovado</strong> pelo nosso time de compliance.</p>
<p style="margin-bottom: 16px;">Agora você já pode investir em startups, comprar tokens e acessar todos os recursos da plataforma.</p>
<p style="margin: 24px 0;"><a href="{{homeUrl}}" class="button">Explorar oportunidades</a></p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `KYC aprovado

Olá, {{userName}}!

Seu processo de KYC foi aprovado pelo nosso time de compliance.

Agora você já pode investir em startups, comprar tokens e acessar todos os recursos da plataforma.

Explore: {{homeUrl}}

Atenciosamente,
Equipe iSelfToken`,
    },

    // ── 18. Plano purchased (1ª assinatura) (Sprint de Notificações — central 2026-10-04) ─
    {
      slug: 'plan-purchased',
      name: 'Novo perfil ativado',
      description:
        'Email enviado quando o usuário compra um plano pela primeira vez (1ª assinatura ACTIVE)',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          planName: { type: 'string' },
        },
        required: ['userName', 'planName'],
        additionalProperties: false,
      } as any,
      subject: 'Bem-vindo ao perfil {{planName}} | iSelfToken',
      htmlTemplate: `<h2 style="margin-bottom: 20px;">Bem-vindo ao perfil {{planName}} ✓</h2>
<p style="margin-bottom: 16px;">Olá, <strong>{{userName}}</strong>!</p>
<p style="margin-bottom: 16px;">Sua assinatura do perfil <strong>{{planName}}</strong> foi confirmada com sucesso.</p>
<p style="margin-bottom: 16px;">Agora você tem acesso a todos os recursos do plano na plataforma. Explore o dashboard para começar.</p>
<p style="margin: 24px 0;"><a href="{{homeUrl}}" class="button">Acessar a plataforma</a></p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Bem-vindo ao perfil {{planName}}

Olá, {{userName}}!

Sua assinatura do perfil {{planName}} foi confirmada com sucesso.

Agora você tem acesso a todos os recursos do plano na plataforma.

Acesse: {{homeUrl}}

Atenciosamente,
Equipe iSelfToken`,
    },

    // ── 19. Plano added (assinatura adicional coexistindo) ─────────────
    {
      slug: 'plan-added',
      name: 'Perfil adicional ativado',
      description:
        'Email enviado quando o usuário adiciona um plano a um perfil existente (coexistência de assinaturas)',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          planName: { type: 'string' },
          previousPlanName: { type: 'string' },
          totalActiveProfiles: { type: 'number' },
        },
        required: [
          'userName',
          'planName',
          'previousPlanName',
          'totalActiveProfiles',
        ],
        additionalProperties: false,
      } as any,
      subject: 'Novo perfil adicionado | iSelfToken',
      htmlTemplate: `<h2 style="margin-bottom: 20px;">Novo perfil adicionado ✓</h2>
<p style="margin-bottom: 16px;">Olá, <strong>{{userName}}</strong>!</p>
<p style="margin-bottom: 16px;">Você acabou de adquirir o perfil <strong>{{planName}}</strong>.</p>
<p style="margin-bottom: 16px;">Como você já possui o perfil <strong>{{previousPlanName}}</strong> ativo, queremos reforçar: <strong>seu perfil anterior continua normalmente</strong>. Agora você tem <strong>{{totalActiveProfiles}} perfis</strong> ativos na sua conta.</p>
<p style="margin-bottom: 16px;">Cada perfil libera funcionalidades adicionais na plataforma, e você pode alternar entre eles quando quiser pelo seu dashboard.</p>
<p style="margin: 24px 0;"><a href="{{profileUrl}}" class="button">Ver meus perfis</a></p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Novo perfil adicionado

Olá, {{userName}}!

Você acabou de adquirir o perfil {{planName}}.

Como você já possui o perfil {{previousPlanName}} ativo, seu perfil anterior continua normalmente. Agora você tem {{totalActiveProfiles}} perfis ativos na sua conta.

Cada perfil libera funcionalidades adicionais na plataforma, e você pode alternar entre eles quando quiser.

Ver meus perfis: {{profileUrl}}

Atenciosamente,
Equipe iSelfToken`,
    },

    // ── 20. User approved (admin ativou usuário) ──────────────────────
    {
      slug: 'user-approved',
      name: 'Conta aprovada pelo admin',
      description: 'Email enviado quando o admin ativa uma conta de usuário',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
        },
        required: ['userName'],
        additionalProperties: false,
      } as any,
      subject: 'Conta aprovada | iSelfToken',
      htmlTemplate: `<h2 style="margin-bottom: 20px;">Conta aprovada ✓</h2>
<p style="margin-bottom: 16px;">Olá, <strong>{{userName}}</strong>!</p>
<p style="margin-bottom: 16px;">Sua conta na <strong>iSelfToken</strong> foi aprovada pelo nosso time administrativo.</p>
<p style="margin-bottom: 16px;">Você já pode acessar todos os recursos da plataforma.</p>
<p style="margin: 24px 0;"><a href="{{homeUrl}}" class="button">Acessar a plataforma</a></p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Conta aprovada

Olá, {{userName}}!

Sua conta na iSelfToken foi aprovada pelo nosso time administrativo.

Você já pode acessar todos os recursos da plataforma.

Acesse: {{homeUrl}}

Atenciosamente,
Equipe iSelfToken`,
    },

    // ── 21. User suspended (admin desativou usuário) ──────────────────
    {
      slug: 'user-suspended',
      name: 'Conta suspensa pelo admin',
      description:
        'Email enviado quando o admin desativa/suspende uma conta de usuário',
      variablesSchema: {
        type: 'object',
        properties: {
          userName: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['userName', 'reason'],
        additionalProperties: false,
      } as any,
      subject: 'Conta suspensa | iSelfToken',
      htmlTemplate: `<h2 style="margin-bottom: 20px;">Conta suspensa</h2>
<p style="margin-bottom: 16px;">Olá, <strong>{{userName}}</strong>,</p>
<p style="margin-bottom: 16px;">Informamos que sua conta na <strong>iSelfToken</strong> foi suspensa pelo time administrativo.</p>
<p style="margin-bottom: 16px;"><strong>Motivo:</strong> {{reason}}</p>
<p style="margin-bottom: 16px;">Caso acredite que houve um engano, entre em contato com o nosso suporte para regularizar a situação.</p>
<p style="margin: 24px 0;"><a href="{{suporteUrl}}" class="button button-danger">Falar com o suporte</a></p>
<p style="margin-top: 32px; margin-bottom: 0;">Atenciosamente,<br><strong>Equipe iSelfToken</strong></p>`,
      textTemplate: `Conta suspensa

Olá, {{userName}},

Informamos que sua conta na iSelfToken foi suspensa pelo time administrativo.

Motivo: {{reason}}

Caso acredite que houve um engano, entre em contato com o nosso suporte.

Suporte: {{suporteUrl}}

Atenciosamente,
Equipe iSelfToken`,
    },
  ];

  for (const tpl of templates) {
    const brandedHtml = brandEmailTemplateHtml(tpl.subject, tpl.htmlTemplate);
    const existing = await prisma.emailTemplate.findUnique({
      where: { slug: tpl.slug },
      include: {
        currentVersion: true,
        versions: { orderBy: { version: 'desc' }, take: 1 },
      },
    });

    if (existing) {
      const current = existing.currentVersion;
      const lastVersion = existing.versions[0];
      const isLegacySeedVersion =
        current?.status === 'PUBLISHED' &&
        current.version === 1 &&
        current.changeNote === 'Versão inicial - seed' &&
        !current.htmlTemplate.trimStart().startsWith('<!DOCTYPE html>');

      if (isLegacySeedVersion) {
        const nextVersion = (lastVersion?.version ?? current.version) + 1;
        await prisma.$transaction(async (tx) => {
          await tx.emailTemplateVersion.updateMany({
            where: { templateId: existing.id, status: 'PUBLISHED' },
            data: { status: 'ARCHIVED' },
          });
          const version = await tx.emailTemplateVersion.create({
            data: {
              templateId: existing.id,
              version: nextVersion,
              subject: tpl.subject,
              htmlTemplate: brandedHtml,
              textTemplate: tpl.textTemplate,
              variablesSchema: tpl.variablesSchema,
              status: 'PUBLISHED',
              changeNote: 'Migração visual para o padrão dark/magenta da marca',
              createdByUserId: admin.id,
              publishedAt: new Date(),
              publishedByUserId: admin.id,
            },
          });
          await tx.emailTemplate.update({
            where: { id: existing.id },
            data: { currentVersionId: version.id },
          });
        });
        console.log(
          `✅ EmailTemplate '${tpl.slug}' migrado para a versão v${nextVersion} com identidade visual`,
        );
      } else {
        console.log(`⏭️  EmailTemplate '${tpl.slug}' preservado`);
      }
      continue;
    }

    const template = await prisma.emailTemplate.create({
      data: {
        slug: tpl.slug,
        name: tpl.name,
        description: tpl.description,
        isActive: true,
        createdByUserId: admin.id,
      },
    });

    const version = await prisma.emailTemplateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        subject: tpl.subject,
        htmlTemplate: brandedHtml,
        textTemplate: tpl.textTemplate,
        variablesSchema: tpl.variablesSchema,
        status: 'PUBLISHED',
        changeNote: 'Versão inicial - seed',
        createdByUserId: admin.id,
        publishedAt: new Date(),
        publishedByUserId: admin.id,
      },
    });

    await prisma.emailTemplate.update({
      where: { id: template.id },
      data: { currentVersionId: version.id },
    });

    console.log(`✅ EmailTemplate '${tpl.slug}' criado com versão 1 PUBLISHED`);
  }
}
