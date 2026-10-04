import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../src/email/email.service';

const recipient = process.env.EMAIL_TEST_TO?.trim();
const confirmation = process.env.EMAIL_TEST_CONFIRM;

if (!recipient) {
  throw new Error('Defina EMAIL_TEST_TO com um destinatário controlado.');
}
const testRecipient: string = recipient;

if (confirmation !== 'YES') {
  throw new Error(
    'Defina EMAIL_TEST_CONFIRM=YES para confirmar o envio de um email real.',
  );
}

async function main() {
  const emailService = new EmailService(new ConfigService());
  const result = await emailService.sendEmail({
    to: testRecipient,
    subject: process.env.EMAIL_TEST_SUBJECT || 'Teste SMTP — iSelfToken',
    type: 'simple',
    text:
      'Este é um email de teste enviado pelo EmailService usando o SMTP configurado.',
  });

  console.log(
    JSON.stringify({
      success: result.success,
      message: result.message,
      messageId: result.messageId ? 'present' : undefined,
    }),
  );

  if (!result.success) {
    process.exitCode = 1;
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Falha ao executar teste SMTP.',
  );
  process.exitCode = 1;
});
