import nodemailer from 'nodemailer';
/**
 * Envia e-mail de A2F com HTML e texto simples
 * Lê configuração SMTP das variáveis:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_NAME (opcional)
 */
export default async function SendEmailModule(params: {
  to: string;
  cc?: string[];
  template?: {
    html: string;
    text: string;
  };
}): Promise<{ provider: string; messageId?: string }> {
  const { to, cc } = params;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = user;
  const appName = process.env.APP_NAME ?? 'iSelfToken';

  if (!host || !port || !user || !pass || !from) {
    console.error(
      '[A2F] Variáveis SMTP ausentes. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM',
    );
    throw new Error('Configuração SMTP ausente');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // TLS implícito comum
    auth: { user, pass },
  });

  const subject = `${appName} - Seu código de verificação`;
  const html = params.template?.html;
  const text = params.template?.text;

  const allRecipients = [to, ...(cc ?? [])];

  const info = await transporter.sendMail({
    from, // cabeçalho From
    to,
    cc,
    subject,
    html,
    text,
    envelope: {
      from: user,
      to: allRecipients,
    },
  });

  return { provider: 'smtp', messageId: info?.messageId };
}

