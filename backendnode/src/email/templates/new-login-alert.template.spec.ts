import { newLoginAlertTemplate } from './new-login-alert.template';

describe('newLoginAlertTemplate', () => {
  it('renderiza branding, ações e dados minimizados', () => {
    const html = newLoginAlertTemplate({
      userName: '<Nome>',
      timestamp: '10/09/2026 18:00 (BRT)',
      ip: '8.8.8.8',
      ipContext: 'IP público identificado',
      deviceLabel: 'Chrome no Windows',
      locationLabel: 'São Paulo (estimativa por IP)',
      reason: 'Novo dispositivo detectado',
      confirmUrl: 'https://app.iselftoken.com/auth/confirm-login#token=abc',
      dismissUrl: 'https://app.iselftoken.com/auth/dismiss-session#token=abc',
    });
    expect(html).toContain('#d500f9');
    expect(html).toContain('Sim, fui eu');
    expect(html).toContain('Não fui eu');
    expect(html).toContain('Novo login detectado');
    expect(html).not.toContain('Mozilla/');
    expect(html).not.toMatch(/\bISP\b/i);
    expect(html).toContain('&lt;Nome&gt;');
  });
});
