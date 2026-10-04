import { escapeHtml, escapeSafeUrl } from '../email-template-security';
import { baseTemplate } from './base.template';

export interface VerificationCodeTemplateData {
  nome: string;
  codigo: string;
  acao: string; // Ex: "verificar seu email", "confirmar transação", etc.
  redirectPath?: string; // url para redirecionar
  expiresIn?: number; // em minutos, padrão 5
}

export const verificationCodeTemplate = (
  data: VerificationCodeTemplateData,
): string => {
  const expiresIn = data.expiresIn || 5;
  const expiresInText = escapeHtml(expiresIn);
  const nome = escapeHtml(data.nome);
  const acao = escapeHtml(data.acao);
  const codigo = escapeHtml(data.codigo);
  const redirectUrl = data.redirectPath
    ? escapeSafeUrl(data.redirectPath, 'redirectPath')
    : null;

  const content = `
    <h2 style="color: #1f2937; margin-bottom: 20px;">Código de Verificação ✅</h2>

    <p style="margin-bottom: 16px;">Olá <strong>${nome}</strong>,</p>

    <p style="margin-bottom: 16px;">
        Para ${acao}, utilize o código de verificação abaixo:
    </p>

    <div class="code-box">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-align: center;">Seu Código:</p>
        <div class="code" style="font-size: 48px; letter-spacing: 12px; text-align: center;">${codigo}</div>
    </div>

    <div class="info-box">
        <p style="margin: 0;">
            <strong>ℹ️ Validade do Código:</strong><br>
            Este código expira em <strong>${expiresInText} minutos</strong>.
        </p>
    </div>

    ${
      redirectUrl
        ? `<div style="text-align: center; margin: 30px 0;">
        <a href="${redirectUrl}" class="button">
            Acessar Minha Conta
        </a>
    </div>`
        : ''
    }

    <p style="margin-bottom: 16px;">
        Insira este código na plataforma para continuar.
    </p>

    <div class="warning-box">
        <p style="margin: 0;">
            <strong>⚠️ Segurança:</strong><br>
            Nunca compartilhe este código com ninguém. Nossa equipe nunca solicitará
            este código por telefone, email ou qualquer outro meio de comunicação.
        </p>
    </div>

    <p style="margin-top: 24px; margin-bottom: 16px; font-size: 14px; color: #6b7280;">
        Se você não solicitou este código, por favor ignore este email ou entre em contato
        com nosso suporte caso suspeite de atividade não autorizada.
    </p>

    <p style="margin-top: 32px; margin-bottom: 0;">
        Atenciosamente,<br>
        <strong>Equipe iSelfToken</strong>
    </p>
  `;

  return baseTemplate(content);
};
