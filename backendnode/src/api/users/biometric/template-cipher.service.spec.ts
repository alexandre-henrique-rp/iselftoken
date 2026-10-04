import { ConfigService } from '@nestjs/config';
import { TemplateCipherService } from './template-cipher.service';

function makeService(key?: string): TemplateCipherService {
  const config = {
    get: (name: string) =>
      name === 'BIOMETRIC_TEMPLATE_KEY' ? key : undefined,
  } as unknown as ConfigService;
  return new TemplateCipherService(config);
}

describe('TemplateCipherService', () => {
  const vector = [0.1, -0.25, 0.9, 0.0, -1.0, 0.333333];

  it('faz round-trip encrypt→decrypt preservando o vetor (float32)', () => {
    const svc = makeService(
      'a'.repeat(64), // 64 hex chars = 32 bytes
    );
    const enc = svc.encryptVector(vector);
    expect(enc.templateEnc).toBeTruthy();
    expect(enc.iv).toBeTruthy();
    expect(enc.authTag).toBeTruthy();

    const dec = svc.decryptVector(enc);
    expect(dec).toHaveLength(vector.length);
    dec.forEach((v, i) => expect(v).toBeCloseTo(vector[i], 5));
  });

  it('gera IVs diferentes a cada cifra (não-determinístico)', () => {
    const svc = makeService('a'.repeat(64));
    const a = svc.encryptVector(vector);
    const b = svc.encryptVector(vector);
    expect(a.iv).not.toBe(b.iv);
    expect(a.templateEnc).not.toBe(b.templateEnc);
  });

  it('falha ao decifrar com authTag adulterado (integridade GCM)', () => {
    const svc = makeService('a'.repeat(64));
    const enc = svc.encryptVector(vector);
    const tampered = {
      ...enc,
      authTag: Buffer.from('00'.repeat(16), 'hex').toString('base64'),
    };
    expect(() => svc.decryptVector(tampered)).toThrow();
  });

  it('chaves diferentes não decifram o mesmo payload', () => {
    const a = makeService('a'.repeat(64));
    const b = makeService('b'.repeat(64));
    const enc = a.encryptVector(vector);
    expect(() => b.decryptVector(enc)).toThrow();
  });

  it('hashVector é determinístico e sensível ao conteúdo', () => {
    const svc = makeService('a'.repeat(64));
    const h1 = svc.hashVector(vector);
    const h2 = svc.hashVector(vector);
    const h3 = svc.hashVector([...vector, 0.5]);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('resolveKey aceita hex, base64 e passphrase (sempre 32 bytes)', () => {
    expect(TemplateCipherService.resolveKey('a'.repeat(64)).length).toBe(32);
    expect(
      TemplateCipherService.resolveKey(Buffer.alloc(32, 7).toString('base64'))
        .length,
    ).toBe(32);
    expect(TemplateCipherService.resolveKey('minha-senha').length).toBe(32);
    expect(TemplateCipherService.resolveKey(undefined).length).toBe(32);
  });
});
