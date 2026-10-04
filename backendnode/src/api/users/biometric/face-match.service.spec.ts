import { ConfigService } from '@nestjs/config';
import type { FaceBiometricService } from './face-biometric.service';
import type { FaceEmbedder } from './face-embedder';
import { NoopFaceEmbedder } from './face-embedder';
import { cosineSimilarity, FaceMatchService } from './face-match.service';

describe('cosineSimilarity', () => {
  it('vetores idênticos → 1', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
  });
  it('ortogonais → 0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
  it('opostos → -1', () => {
    expect(cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 6);
  });
  it('tamanhos diferentes ou vazios → null', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBeNull();
    expect(cosineSimilarity([], [])).toBeNull();
  });
  it('vetor nulo → null (evita divisão por zero)', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBeNull();
  });
});

function makeService(opts: {
  embedder: FaceEmbedder;
  vector?: number[] | null;
  threshold?: string;
}): FaceMatchService {
  const config = {
    get: (n: string) =>
      n === 'FACE_MATCH_THRESHOLD' ? (opts.threshold ?? '0.38') : undefined,
  } as unknown as ConfigService;
  const faceBiometric = {
    getVector: jest.fn().mockResolvedValue(opts.vector ?? null),
  } as unknown as FaceBiometricService;
  return new FaceMatchService(config, faceBiometric, opts.embedder);
}

describe('FaceMatchService.classify', () => {
  const svc = makeService({
    embedder: new NoopFaceEmbedder(),
    threshold: '0.4',
  });
  it('acima do threshold → match', () => {
    expect(svc.classify(0.5)).toBe('match');
  });
  it('na zona cinzenta → review', () => {
    expect(svc.classify(0.35)).toBe('review'); // 0.4 - 0.08 = 0.32
  });
  it('abaixo → no_match', () => {
    expect(svc.classify(0.1)).toBe('no_match');
  });
});

describe('FaceMatchService.status', () => {
  it('extrator desabilitado → indisponível', async () => {
    const svc = makeService({ embedder: new NoopFaceEmbedder() });
    const r = await svc.status(1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('embedder_disabled');
  });

  it('extrator ativo mas sem template → indisponível', async () => {
    const enabled: FaceEmbedder = {
      isEnabled: () => true,
      extract: async () => null,
    };
    const svc = makeService({ embedder: enabled, vector: null });
    const r = await svc.status(1);
    expect(r.available).toBe(false);
    expect(r.reason).toBe('no_template');
  });

  it('extrator ativo + template → disponível com threshold', async () => {
    const enabled: FaceEmbedder = {
      isEnabled: () => true,
      extract: async () => null,
    };
    const svc = makeService({
      embedder: enabled,
      vector: [0.1, 0.2],
      threshold: '0.42',
    });
    const r = await svc.status(1);
    expect(r.available).toBe(true);
    expect(r.threshold).toBe(0.42);
  });
});

describe('FaceMatchService.compareToDocument', () => {
  it('compara selfie×documento e classifica quando ativo', async () => {
    const enabled: FaceEmbedder = {
      isEnabled: () => true,
      extract: async () => ({
        vector: [1, 0, 0],
        dim: 3,
        modelVersion: 'stub',
      }),
    };
    const svc = makeService({
      embedder: enabled,
      vector: [1, 0, 0],
      threshold: '0.5',
    });
    const r = await svc.compareToDocument(1, Buffer.from('x'));
    expect(r.available).toBe(true);
    expect(r.score).toBeCloseTo(1, 5);
    expect(r.band).toBe('match');
  });

  it('sem face no documento → indisponível', async () => {
    const enabled: FaceEmbedder = {
      isEnabled: () => true,
      extract: async () => null,
    };
    const svc = makeService({ embedder: enabled, vector: [1, 0, 0] });
    const r = await svc.compareToDocument(1, Buffer.from('x'));
    expect(r.available).toBe(false);
    expect(r.reason).toBe('no_face_in_document');
  });
});
