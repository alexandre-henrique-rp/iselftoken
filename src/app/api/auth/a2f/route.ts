import { NextResponse } from 'next/server';
import { GetSessionServer } from '@/context/auth';
import SendEmailModule from '@/modules/email';
import buildA2fHtmlTemplate from '@/model/email/html/auth-a2f';
import buildA2fTextTemplate from '@/model/email/text/auth-a2f';
import generateA2fCode from '@/modules/codigo/a2f';

/*
 * POST /api/auth/a2f
 * Lê a sessão no servidor e envia (simulado) um código A2F para o e-mail do usuário.
 * Body opcional: { email?: string }
 */
export async function GET() {
  try {
    const session = await GetSessionServer();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sessionEmail = session?.user?.email;
    const email = sessionEmail;

    // Query params (para testes): cc e bcc
    const cc = [
      'Marcos <marcoslacerda@iselftoken.net>',
      'Niashi <niashi_dev@iselftoken.net>',
      'Eydi <eydi_dev@iselftoken.net>',
      'Ronaldo <ronaldo@iselftoken.net>, Alexandre Henrique <alexandre_dev@iselftoken.net>',
    ];

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'E-mail não encontrado na sessão' },
        { status: 400 },
      );
    }

    // Gera código A2F de 6 dígitos
    const code = generateA2fCode();
    console.log("🚀 ~ GET ~ code:", code)
    const appName = process.env.APP_NAME ?? 'iSelfToken';
    
    // Armazena código com timestamp de expiração (5 minutos) e contador de tentativas
    const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const a2fData = {
      code,
      expiration: expirationTime,
      attempts: 0,
      maxAttempts: 3
    };
    // Simulação de armazenamento (em produção, usar banco de dados ou cache)
    console.log("🚀 ~ GET ~ a2fData:", a2fData);
    
    // Envia e-mail com template HTML
    const result = await SendEmailModule({
      to: email,
      template: {
        html: buildA2fHtmlTemplate({ code, appName }),
        text: buildA2fTextTemplate({ code, appName }),
      },
      cc,
    });

    return NextResponse.json(
      {
        ok: true,
        message: 'Código A2F enviado',
        // Não retornamos o código por segurança
        provider: result.provider,
        messageId: result.messageId,
        codigo: code,
      },
      { status: 200 },
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: 'Erro ao solicitar A2F' },
      { status: 500 },
    );
  }
}
