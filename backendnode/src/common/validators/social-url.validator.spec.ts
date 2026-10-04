import {
  isOfficialSocialUrl,
  validateSocialUrls,
} from './social-url.validator';

describe('social-url.validator', () => {
  it('aceita URLs HTTPS oficiais da rede', () => {
    expect(
      isOfficialSocialUrl('https://instagram.com/startup', 'instagram'),
    ).toBe(true);
    expect(isOfficialSocialUrl('https://x.com/startup', 'twitter')).toBe(true);
    expect(
      isOfficialSocialUrl('https://linkedin.com/company/startup', 'linkedin'),
    ).toBe(true);
  });

  it('rejeita protocolo, domínio ou rede incorretos', () => {
    expect(isOfficialSocialUrl('@startup', 'instagram')).toBe(false);
    expect(
      isOfficialSocialUrl('http://instagram.com/startup', 'instagram'),
    ).toBe(false);
    expect(
      isOfficialSocialUrl('https://evil-instagram.com/startup', 'instagram'),
    ).toBe(false);
    expect(
      isOfficialSocialUrl('https://instagram.com/startup', 'linkedin'),
    ).toBe(false);
  });

  it('retorna erro por campo inválido', () => {
    expect(
      validateSocialUrls({
        twitter: '@startup',
        linkedin: 'https://linkedin.com/company/startup',
      }),
    ).toEqual([expect.stringContaining('X / Twitter')]);
  });
});
