# Email Service - iSelfToken

Serviço de envio de emails transacionais via AWS SES com templates profissionais.

## 📧 Configuração

### 1. Variáveis de Ambiente

Configure as seguintes variáveis no arquivo `.env`:

```env
AWS_REGION="sa-east-1"
AWS_ACCESS_KEY_ID="sua-access-key"
AWS_SECRET_ACCESS_KEY="sua-secret-key"
AWS_SES_FROM_EMAIL="naoresponda@iselftoken.info"
# CSV; a ordem dos endereços é preservada no envio das cópias
EMAIL_CC_LIST="operacao@example.com,compliance@example.com"
```

#### Cópias operacionais (`EMAIL_CC_LIST`)

Até nova orientação operacional, `EMAIL_CC_LIST` deve permanecer configurado para os e-mails transacionais, incluindo o código 2FA. O valor é uma lista CSV: o destinatário principal é enviado primeiro e as cópias são enviadas depois, na ordem declarada na variável.

O `EmailService` normaliza e deduplica os endereços e não repete o destinatário principal. Como a variável é carregada no bootstrap, qualquer alteração exige reinício do processo backend. O frontend não deve definir nem alterar essa configuração.

O aceite SMTP não confirma entrega na caixa de entrada; para confirmar a entrega, é necessário consultar os eventos posteriores do relay/SES.

### 2. Provedores SMTP Suportados

#### Gmail

- Host: `smtp.gmail.com`
- Porta: `587` (TLS) ou `465` (SSL)
- **Importante**: Ative a verificação em 2 etapas e gere uma senha de app em [Google App Passwords](https://myaccount.google.com/apppasswords)

#### SendGrid

- Host: `smtp.sendgrid.net`
- Porta: `587`
- User: `apikey`
- Pass: Sua API Key do SendGrid

#### Mailgun

- Host: `smtp.mailgun.org`
- Porta: `587`

#### AWS SES

- Host: `email-smtp.us-east-1.amazonaws.com` (ou sua região)
- Porta: `587`

## 🚀 Uso

### Método Principal: `sendEmail()`

```typescript
import { EmailService } from './email/email.service';

constructor(private readonly emailService: EmailService) {}

// Usando template
await this.emailService.sendEmail({
  to: 'usuario@exemplo.com',
  subject: 'Bem-vindo!',
  type: 'template',
  text: 'welcome', // nome do template
  data: {
    nome: 'João Silva',
    email: 'usuario@exemplo.com',
  },
});

// HTML customizado
await this.emailService.sendEmail({
  to: 'usuario@exemplo.com',
  subject: 'Notificação',
  type: 'html',
  text: '<h1>Olá!</h1><p>Este é um email HTML.</p>',
});

// Texto simples
await this.emailService.sendEmail({
  to: 'usuario@exemplo.com',
  subject: 'Mensagem Simples',
  type: 'simple',
  text: 'Este é um email em texto simples.\nCom múltiplas linhas.',
});
```

### Métodos Auxiliares

#### 1. Email de Boas-vindas

```typescript
await this.emailService.sendWelcomeEmail('usuario@exemplo.com', {
  nome: 'João Silva',
  email: 'usuario@exemplo.com',
});
```

#### 2. Recuperação de Senha

```typescript
await this.emailService.sendForgotPasswordEmail('usuario@exemplo.com', {
  nome: 'João Silva',
  codigo: 'ABC123',
  expiresIn: 15, // minutos (opcional, padrão: 15)
});
```

#### 3. Código de Verificação

```typescript
await this.emailService.sendVerificationCodeEmail('usuario@exemplo.com', {
  nome: 'João Silva',
  codigo: '123456',
  acao: 'verificar seu email',
  expiresIn: 10, // minutos (opcional, padrão: 10)
});
```

## 📝 Templates Disponíveis

### 1. Welcome (Boas-vindas)

- **Nome**: `welcome` ou `boas-vindas`
- **Dados**:

  ```typescript
  {
    nome: string;
    email: string;
  }
  ```

### 2. Forgot Password (Recuperação de Senha)

- **Nome**: `forgot-password` ou `recuperacao-senha`
- **Dados**:

  ```typescript
  {
    nome: string;
    codigo: string;
    expiresIn?: number; // em minutos, padrão 15
  }
  ```

### 3. Verification Code (Código de Verificação)

- **Nome**: `verification-code` ou `codigo-verificacao`
- **Dados**:

  ```typescript
  {
    nome: string;
    codigo: string;
    acao: string; // ex: "verificar seu email"
    expiresIn?: number; // em minutos, padrão 10
  }
  ```

## 🎨 Criando Novos Templates

1. Crie um novo arquivo em `src/email/templates/`:

```typescript
// meu-template.template.ts
import { baseTemplate } from './base.template';

export interface MeuTemplateData {
  nome: string;
  mensagem: string;
}

export const meuTemplate = (data: MeuTemplateData): string => {
  const content = `
    <h2>Olá ${data.nome}!</h2>
    <p>${data.mensagem}</p>
  `;

  return baseTemplate(content);
};
```

1. Exporte no `templates/index.ts`:

```typescript
export * from './meu-template.template';
```

1. Adicione ao método `getTemplateHtml()` em `email.service.ts`:

```typescript
case 'meu-template':
  return meuTemplate(data as MeuTemplateData);
```

## 📊 Resposta do Serviço

```typescript
{
  success: boolean;
  message: string;
  messageId?: string; // ID da mensagem (quando enviado com sucesso)
}
```

## 🔐 Segurança

- O email de envio é sempre: **<naoresponda@iselftoken.info>**
- Nunca exponha credenciais SMTP no código
- Use variáveis de ambiente para todas as configurações sensíveis
- Em produção, recomendamos usar serviços dedicados como SendGrid ou AWS SES

## 🎨 Customização Visual

Os templates usam um design base consistente com:

- Gradiente roxo moderno (#667eea → #764ba2)
- Design responsivo
- Suporte para códigos de verificação destacados
- Boxes de informação e avisos
- Footer com informações da empresa

Para customizar, edite `templates/base.template.ts`.

## 📱 Exemplo Completo em um Controller

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from '../email/email.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly emailService: EmailService) {}

  @Post('register')
  async register(@Body() data: { email: string; nome: string }) {
    // ... criar usuário ...

    // Enviar email de boas-vindas
    await this.emailService.sendWelcomeEmail(data.email, {
      nome: data.nome,
      email: data.email,
    });

    return { message: 'Usuário criado com sucesso!' };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() data: { email: string }) {
    // ... gerar código ...
    const codigo = '123456';

    // Enviar email com código
    await this.emailService.sendForgotPasswordEmail(data.email, {
      nome: 'Usuário',
      codigo,
      expiresIn: 15,
    });

    return { message: 'Email enviado!' };
  }
}
```

## 🐛 Troubleshooting

### Email não está sendo enviado

1. Verifique se as variáveis de ambiente estão configuradas corretamente
2. Confira os logs do servidor para mensagens de erro
3. Teste a conexão SMTP usando uma ferramenta externa

### Erro de autenticação (Gmail)

1. Certifique-se de ter ativado a verificação em 2 etapas
2. Gere uma nova senha de app específica
3. Use a senha de app, não sua senha normal do Gmail

### Emails indo para spam

1. Configure SPF, DKIM e DMARC no seu domínio
2. Use um provedor SMTP profissional (SendGrid, AWS SES)
3. Evite usar "noreply" em ambientes de produção reais
