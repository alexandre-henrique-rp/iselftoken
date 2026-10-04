import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { FaceBiometricService } from './face-biometric.service';
import type { FaceEmbedder, FaceEmbedding } from './face-embedder';
import { NoopFaceEmbedder } from './face-embedder';
import { TemplateCipherService } from './template-cipher.service';

function cipher(): TemplateCipherService {
  const config = {
    get: () => 'a'.repeat(64),
  } as unknown as ConfigService;
  return new TemplateCipherService(config);
}

/** Embedder de teste que sempre entrega um vetor fixo. */
class StubEmbedder implements FaceEmbedder {
  isEnabled() {
    return true;
  }
  async extract(): Promise<FaceEmbedding | null> {
    return { vector: [0.1, 0.2, 0.3], dim: 3, modelVersion: 'stub-v1' };
  }
}

describe('FaceBiometricService', () => {
  const media = Buffer.from('fake-media');

  it('NÃO grava sem consentimento biométrico', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ biofacialConsentAt: null }),
      },
      faceBiometric: { upsert: jest.fn() },
    } as unknown as PrismaService;
    const svc = new FaceBiometricService(prisma, cipher(), new StubEmbedder());

    const res = await svc.enroll({ userId: 1, media });
    expect(res.enrolled).toBe(false);
    expect(res.reason).toBe('no_consent');
    expect((prisma as any).faceBiometric.upsert).not.toHaveBeenCalled();
  });

  it('com consentimento mas extrator desabilitado (Noop) não grava', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          biofacialConsentAt: new Date(),
          biofacialConsentVersion: 'v1',
        }),
      },
      faceBiometric: { upsert: jest.fn() },
    } as unknown as PrismaService;
    const svc = new FaceBiometricService(
      prisma,
      cipher(),
      new NoopFaceEmbedder(),
    );

    const res = await svc.enroll({ userId: 1, media });
    expect(res.enrolled).toBe(false);
    expect(res.reason).toBe('embedder_disabled');
  });

  it('com consentimento + extrator ativo, cifra e faz upsert', async () => {
    const upsert = jest.fn().mockResolvedValue({ publicId: 'pub-1' });
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          biofacialConsentAt: new Date(),
          biofacialConsentVersion: 'v1',
        }),
      },
      faceBiometric: { upsert },
    } as unknown as PrismaService;
    const svc = new FaceBiometricService(prisma, cipher(), new StubEmbedder());

    const res = await svc.enroll({ userId: 42, media, kycProfileId: 7 });
    expect(res.enrolled).toBe(true);
    expect(res.publicId).toBe('pub-1');

    const data = upsert.mock.calls[0][0].create;
    // O vetor NUNCA vai em claro — só o payload cifrado + hash irreversível.
    expect(data.templateEnc).toBeTruthy();
    expect(data.iv).toBeTruthy();
    expect(data.authTag).toBeTruthy();
    expect(data.templateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(data.dim).toBe(3);
    expect(data.modelVersion).toBe('stub-v1');
    expect(data.consentVersion).toBe('v1');
    expect(data.kycProfileId).toBe(7);
    expect(JSON.stringify(data)).not.toContain('0.1,0.2,0.3');
  });

  it('purge remove o template (idempotente)', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      faceBiometric: { deleteMany },
    } as unknown as PrismaService;
    const svc = new FaceBiometricService(prisma, cipher(), new StubEmbedder());

    const res = await svc.purge(42);
    expect(res.purged).toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({ where: { userId: 42 } });
  });

  it('getVector decifra de volta o vetor gravado', async () => {
    const c = cipher();
    const enc = c.encryptVector([0.1, 0.2, 0.3]);
    const prisma = {
      faceBiometric: {
        findUnique: jest.fn().mockResolvedValue({
          templateEnc: enc.templateEnc,
          iv: enc.iv,
          authTag: enc.authTag,
        }),
      },
    } as unknown as PrismaService;
    const svc = new FaceBiometricService(prisma, c, new StubEmbedder());

    const vec = await svc.getVector(42);
    expect(vec).not.toBeNull();
    vec!.forEach((v, i) => expect(v).toBeCloseTo([0.1, 0.2, 0.3][i], 5));
  });
});
