import { forgotPasswordTemplate } from './forgot-password.template';
import { kycResubmissionRequestedTemplate } from './kyc-resubmission-requested.template';
import { newLoginAlertTemplate } from './new-login-alert.template';
import { rejectionNotificationTemplate } from './rejection-notification.template';
import {
  startupAprovadaTemplate,
  startupDocumentoRejeitadoTemplate,
  startupEtapa1ConcluidaTemplate,
  startupEtapa2ConcluidaTemplate,
  startupEtapa3ConcluidaTemplate,
  startupPagamentoConfirmadoTemplate,
  startupRejeitadaTemplate,
} from './startup-notifications.template';
import { validationEmailTemplate } from './validation-email.template';
import { verificationCodeTemplate } from './verification-code.template';
import { welcomeTemplate } from './welcome.template';

describe('email templates security', () => {
  it('escapes user-controlled welcome data', () => {
    const html = welcomeTemplate({
      nome: '<img src=x onerror=alert(1)>',
      email: 'user@example.com"><script>alert(1)</script>',
    });

    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&quot;&gt;&lt;script&gt;');
  });

  it('escapes verification data and quotes the redirect href', () => {
    const html = verificationCodeTemplate({
      nome: '<b>Nome</b>',
      codigo: '<script>alert(1)</script>',
      acao: '<em>confirmar</em>',
      redirectPath: 'https://app.example/login?next=a&source=email',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain(
      'href="https://app.example/login?next=a&amp;source=email"',
    );
  });

  it('rejects unsafe verification redirects', () => {
    expect(() =>
      verificationCodeTemplate({
        nome: 'Nome',
        codigo: '123456',
        acao: 'confirmar o acesso',
        redirectPath: 'javascript:alert(1)',
      }),
    ).toThrow('redirectPath deve usar HTTPS');
  });

  it('escapes forgot-password data and renders reset link', () => {
    const html = forgotPasswordTemplate({
      nome: '<b>Nome</b>',
      resetUrl: 'https://app.example/reset-password?token=abc123',
      expiresInMinutes: 15,
    });

    expect(html).toContain('&lt;b&gt;Nome&lt;/b&gt;');
    expect(html).toContain('https://app.example/reset-password?token=abc123');
    // Não deve conter bloco de código
    expect(html).not.toContain('Código de Recuperação');
  });

  it('rejects unsafe reset URL in forgot-password template', () => {
    expect(() =>
      forgotPasswordTemplate({
        nome: 'Nome',
        resetUrl: 'javascript:alert(1)',
      }),
    ).toThrow();
  });

  it('validates the validation URL and encodes the token', () => {
    const html = validationEmailTemplate({
      nome: 'Nome',
      email: 'user@example.com',
      token: 'token&with spaces',
      type: 'REGISTRATION',
      frontendUrl: 'https://app.example',
    });

    expect(html).toContain('token=token%26with+spaces');
    expect(html).not.toContain('javascript:');
  });

  it('escapes rejection details and validates the action URL', () => {
    const html = rejectionNotificationTemplate({
      founderName: '<b>Founder</b>',
      startupName: '<script>startup</script>',
      reason: '<img src=x>',
      redirectUrl: 'https://app.example/startups/review?tab=1&mode=edit',
    });

    expect(html).not.toContain('<script>startup</script>');
    expect(html).toContain('&lt;script&gt;startup&lt;/script&gt;');
    expect(html).toContain(
      'href="https://app.example/startups/review?tab=1&amp;mode=edit"',
    );
  });

  // ─── new-login-alert ─────────────────────────────────────────────────────
  // Sprint S34 — seed incluiu este template no banco para edição via painel
  // admin. Equivalente ao hardcoded newLoginAlertTemplate. Garante que:
  //   1. Conteúdo controlado pelo usuário é escapado
  //   2. URLs `confirmUrl`/`dismissUrl` são validadas (HTTPS only)
  //   3. IPs não são expostos em texto puro no DOM (LGPD)

  it('new-login-alert: escapa campos controlados e renderiza detalhes do acesso', () => {
    const html = newLoginAlertTemplate({
      userName: '<b>João</b>',
      timestamp: '2026-09-29T13:00:00Z',
      ip: '203.0.113.42',
      ipContext: 'datacenter',
      deviceLabel: 'Chrome 124 / Windows 11',
      locationLabel: 'São Paulo, BR',
      timezone: 'America/Sao_Paulo',
      org: 'AS28573',
      reason: '<script>alert(1)</script>',
      confirmUrl: 'https://app.iselftoken.com/auth/confirm?token=abc',
      dismissUrl: 'https://app.iselftoken.com/auth/dismiss?token=abc',
    });

    // Conteúdo malicioso escapado
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    // Nome escapado
    expect(html).toContain('&lt;b&gt;João&lt;/b&gt;');
    // IP visível (não escapado por design — é dado que o usuário precisa ver
    // para identificar o acesso). O template renderiza-o dentro de `<td>`.
    expect(html).toContain('203.0.113.42');
    // URLs seguras renderizadas corretamente
    expect(html).toContain(
      'href="https://app.iselftoken.com/auth/confirm?token=abc"',
    );
    expect(html).toContain(
      'href="https://app.iselftoken.com/auth/dismiss?token=abc"',
    );
    // Tema dark/magenta aplicado
    expect(html).toContain('#d500f9');
    expect(html).toContain('#000000');
  });

  it('new-login-alert: rejeita URLs inseguras (HTTPS-only)', () => {
    // O template usa `escapeSafeUrl` para confirmUrl/dismissUrl (Sprint S34 —
    // bug de XSS via `javascript:` URL). `escapeSafeUrl` chama
    // `validateSafeUrl` que exige protocolo seguro.
    expect(() =>
      newLoginAlertTemplate({
        userName: 'Nome',
        timestamp: '2026-09-29T13:00:00Z',
        ip: '1.2.3.4',
        ipContext: 'datacenter',
        deviceLabel: 'Chrome',
        locationLabel: 'BR',
        reason: 'novo login',
        confirmUrl: 'javascript:alert(1)',
        dismissUrl: 'https://app.iselftoken.com/auth/dismiss',
      }),
    ).toThrow(/deve usar HTTPS/);

    expect(() =>
      newLoginAlertTemplate({
        userName: 'Nome',
        timestamp: '2026-09-29T13:00:00Z',
        ip: '1.2.3.4',
        ipContext: 'datacenter',
        deviceLabel: 'Chrome',
        locationLabel: 'BR',
        reason: 'novo login',
        confirmUrl: 'https://app.iselftoken.com/auth/confirm',
        dismissUrl: 'ftp://files.example.com/dismiss',
      }),
    ).toThrow(/deve usar HTTPS/);

    // HTTP não-loopback também rejeitado
    expect(() =>
      newLoginAlertTemplate({
        userName: 'Nome',
        timestamp: '2026-09-29T13:00:00Z',
        ip: '1.2.3.4',
        ipContext: 'datacenter',
        deviceLabel: 'Chrome',
        locationLabel: 'BR',
        reason: 'novo login',
        confirmUrl: 'https://app.iselftoken.com/auth/confirm',
        dismissUrl: 'http://insecure.example.com/dismiss',
      }),
    ).toThrow(/HTTP só é permitido em ambiente local/);
  });

  it('new-login-alert: escapa parâmetros maliciosos nas demais variáveis', () => {
    const html = newLoginAlertTemplate({
      userName: 'Nome',
      timestamp: '2026-09-29T13:00:00Z',
      ip: '1.2.3.4',
      ipContext: 'datacenter',
      deviceLabel: '<script>alert(1)</script>',
      locationLabel: 'BR',
      reason: 'novo login',
      confirmUrl: 'https://app.iselftoken.com/auth/confirm?token=abc',
      dismissUrl: 'https://app.iselftoken.com/auth/dismiss?token=abc',
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  // ─── kyc-resubmission-requested ──────────────────────────────────────────

  it('kyc-resubmission-requested: escapa campos e valida redirectUrl', () => {
    const html = kycResubmissionRequestedTemplate({
      userName: '<img src=x onerror=alert(1)>',
      documentName: '<b>RG</b>',
      reason: '<script>let p=document.location</script>',
      redirectUrl: 'https://app.iselftoken.com/kyc/reupload?doc=rg',
    });

    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script>let p=document.location</script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;b&gt;RG&lt;/b&gt;');
    expect(html).toContain(
      'href="https://app.iselftoken.com/kyc/reupload?doc=rg"',
    );
    // Tema dark/magenta
    expect(html).toContain('#d500f9');
  });

  it('kyc-resubmission-requested: rejeita redirectUrl insegura', () => {
    expect(() =>
      kycResubmissionRequestedTemplate({
        userName: 'Nome',
        documentName: 'CPF',
        reason: 'imagem ilegível',
        redirectUrl: 'javascript:alert(1)',
      }),
    ).toThrow();
  });

  // ─── startup-notifications (aprovada / rejeitada / documento) ────────────
  // Bug fix: founderName ausente renderizava "undefined" (escapeHtml(undefined)
  // → "undefined"). Agora cai no fallback "fundador(a)". Além disso, o bloco
  // "Motivo" (texto livre do admin) deve conter CSS anti-overflow.

  const FRONTEND = 'https://app.iselftoken.com';

  it('startup-aprovada: founderName ausente usa fallback "fundador(a)" (sem "undefined")', () => {
    const htmlUndefined = startupAprovadaTemplate(
      { founderName: undefined as unknown as string, startupName: 'Acme' },
      FRONTEND,
    );
    const htmlVazio = startupAprovadaTemplate(
      { founderName: '   ', startupName: 'Acme' },
      FRONTEND,
    );

    for (const html of [htmlUndefined, htmlVazio]) {
      expect(html).not.toContain('undefined');
      expect(html).toContain('fundador(a)');
    }
  });

  it('startup-aprovada: usa o nome real do founder quando presente', () => {
    const html = startupAprovadaTemplate(
      { founderName: 'Maria', startupName: 'Acme' },
      FRONTEND,
    );
    expect(html).toContain('Maria');
    expect(html).not.toContain('fundador(a)');
  });

  it('startup-aprovada: FAST_DEPLOY (Publicação Rápida) → já está no ar', () => {
    const html = startupAprovadaTemplate(
      { founderName: 'Maria', startupName: 'Acme', fastDeploy: true },
      FRONTEND,
    );
    expect(html).toContain('Publicação Rápida');
    expect(html).toContain('já está visível');
    expect(html).not.toContain('24 horas');
  });

  it('startup-aprovada: sem FAST_DEPLOY → publicação em até 24h com data prevista', () => {
    const html = startupAprovadaTemplate(
      {
        founderName: 'Maria',
        startupName: 'Acme',
        fastDeploy: false,
        scheduledPublishAt: '2026-10-03T18:00:00.000Z',
      },
      FRONTEND,
    );
    expect(html).toContain('24 horas');
    expect(html).toContain('previsto para');
    // Data formatada em pt-BR (America/Sao_Paulo): 03/10/2026
    expect(html).toContain('03/10/2026');
  });

  it('startup-aprovada: sem data prevista → 24h sem "previsto para"', () => {
    const html = startupAprovadaTemplate(
      { founderName: 'Maria', startupName: 'Acme', fastDeploy: false },
      FRONTEND,
    );
    expect(html).toContain('24 horas');
    expect(html).not.toContain('previsto para');
  });

  it('startup-rejeitada: fallback de nome + anti-overflow no bloco Motivo', () => {
    const reasonLongo = 'A'.repeat(400); // texto longo sem espaços
    const html = startupRejeitadaTemplate(
      {
        founderName: undefined as unknown as string,
        startupName: 'Acme',
        reason: reasonLongo,
      },
      FRONTEND,
    );

    expect(html).not.toContain('undefined');
    expect(html).toContain('fundador(a)');
    // CSS anti-overflow aplicado ao bloco do Motivo
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('word-break: break-word');
    expect(html).toContain(reasonLongo);
  });

  it('startup-rejeitada: escapa reason malicioso (XSS)', () => {
    const html = startupRejeitadaTemplate(
      {
        founderName: 'Maria',
        startupName: 'Acme',
        reason: '<script>alert(1)</script>',
      },
      FRONTEND,
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('startup-documento-rejeitado: fallback de nome + anti-overflow no bloco Motivo', () => {
    const reasonLongo = 'B'.repeat(400);
    const html = startupDocumentoRejeitadoTemplate(
      {
        founderName: '',
        startupName: 'Acme',
        documentName: 'contrato-social.pdf',
        reason: reasonLongo,
      },
      FRONTEND,
    );

    expect(html).not.toContain('undefined');
    expect(html).toContain('fundador(a)');
    expect(html).toContain('overflow-wrap: anywhere');
    expect(html).toContain('word-break: break-word');
    expect(html).toContain('contrato-social.pdf');
  });

  // ─── BUG-FT-004 (B3 + B4): Fase X + purposeLabel ──────────────────────
  // (a) Os templates das 3 fases devem usar o termo canônico "Fase" (não
  //     "Etapa"). (b) O template de pagamento confirmado deve renderizar
  //     `purposeLabel` corretamente (sem `escapeHtml(undefined)`).

  describe('BUG-FT-004 — terminologia Fase + purposeLabel', () => {
    it('startupEtapa1ConcluidaTemplate usa "Fase 1" e "Fase 2" (não "Etapa")', () => {
      const html = startupEtapa1ConcluidaTemplate(
        { startupName: 'Acme' },
        FRONTEND,
      );
      expect(html).toContain('Fase 1 concluída');
      expect(html).not.toContain('Etapa 1');
      expect(html).toContain('liberar a Fase 2');
      expect(html).not.toContain('liberar a Etapa 2');
    });

    it('startupEtapa2ConcluidaTemplate usa "Fase 2" e "Fase 3" (não "Etapa")', () => {
      const html = startupEtapa2ConcluidaTemplate(
        { startupName: 'Acme' },
        FRONTEND,
      );
      expect(html).toContain('Fase 2 concluída');
      expect(html).not.toContain('Etapa 2');
      expect(html).toContain('a Fase 3 será liberada');
      expect(html).not.toContain('a Etapa 3 será liberada');
    });

    it('startupEtapa3ConcluidaTemplate usa "Fase 3" (não "Etapa")', () => {
      const html = startupEtapa3ConcluidaTemplate(
        { startupName: 'Acme' },
        FRONTEND,
      );
      expect(html).toContain('Fase 3 concluída');
      expect(html).not.toContain('Etapa 3');
    });

    it('startupPagamentoConfirmadoTemplate usa purposeLabel (sem "undefined")', () => {
      // BUG-FT-004 (B3): se o listener passar `purpose` em vez de `purposeLabel`,
      // `escapeHtml(undefined)` retorna a string literal `'undefined'` que vaza
      // no corpo do e-mail. O template agora exige `purposeLabel`.
      const html = startupPagamentoConfirmadoTemplate(
        {
          startupName: 'Acme',
          purposeLabel: 'O pagamento da Taxa de Compliance',
        },
        FRONTEND,
      );
      expect(html).toContain('O pagamento da Taxa de Compliance');
      expect(html).not.toContain('undefined');
      // Garante que nenhum dos placeholders ficou sem replace.
      expect(html).not.toMatch(/O pagamento de\s*\./);
    });

    it('startupPagamentoConfirmadoTemplate: purposeLabel é escapado (anti-XSS)', () => {
      const html = startupPagamentoConfirmadoTemplate(
        {
          startupName: 'Acme',
          purposeLabel: '<script>alert(1)</script>',
        },
        FRONTEND,
      );
      expect(html).not.toContain('<script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });
});
