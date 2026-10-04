import { escapeHtml } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface WelcomeTemplateData {
  nome: string;
  email: string;
}

export const welcomeTemplate = (data: WelcomeTemplateData): string => {
  const nome = escapeHtml(data.nome);
  const email = escapeHtml(data.email);
  const content = `
    <h2 style="color: #1f2937; margin-bottom: 20px;">Bem-vindo à iSelfToken! 🎉</h2>

    <p style="margin-bottom: 16px;">Olá <strong>${nome}</strong>,</p>

    <p style="margin-bottom: 16px;">
        É com grande satisfação que te damos as boas-vindas à <strong>iSelfToken</strong>,
        sua plataforma de investimento em startups inovadoras!
    </p>

    <p style="margin-bottom: 16px;">
        Sua conta foi criada com sucesso utilizando o email: <strong>${email}</strong> e a senha registrada para acessar sua conta.
    </p>

    <div class="info-box">
        <p style="margin: 0;">
            <strong>Próximos passos:</strong>
        </p>
        <ul style="margin: 12px 0 0 20px; padding: 0;">
            <li>Complete a confirmação de email</li>
            <li>Complete seu perfil para ter acesso completo</li>
            <li>Explore as startups disponíveis para investimento</li>
            <li>Configure suas preferências de investimento</li>
            <li>Verifique sua identidade (KYC) para começar a investir</li>
        </ul>
    </div>


    <p style="margin-bottom: 16px; font-size: 14px; color: #6b7280; margin-top: 20px;">
        Se você não criou esta conta, por favor ignore este email ou entre em contato
        com nosso suporte imediatamente.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0;">
        Atenciosamente,<br>
        <strong>Equipe iSelfToken</strong>
    </p>
  `;

  return baseTemplate(content);
};
