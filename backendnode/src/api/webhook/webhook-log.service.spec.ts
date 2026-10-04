import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { WebhookLogService } from './webhook-log.service';

const WEBHOOK_HASH_SECRET = 'webhook-hash-secret-for-test-32';

describe('WebhookLogService', () => {
  const prisma = {} as never;
  const sseKms = {} as never;

  function createConfig(secret?: string) {
    return {
      get: jest.fn((_key: string, defaultValue?: unknown) => defaultValue),
      getOrThrow: jest.fn((key: string) => {
        if (key === 'WEBHOOK_HASH_SECRET' && secret) return secret;
        throw new Error(`${key} não configurado`);
      }),
    } as unknown as ConfigService;
  }

  it('usa WEBHOOK_HASH_SECRET injetado para anonimizar PII com HMAC-SHA256', () => {
    const service = new WebhookLogService(
      prisma,
      sseKms,
      createConfig(WEBHOOK_HASH_SECRET),
    );
    const value = '12345678909';
    const expected = createHmac('sha256', WEBHOOK_HASH_SECRET)
      .update(value)
      .digest('hex');

    expect(
      (service as unknown as { hashPii(value: string): string }).hashPii(value),
    ).toBe(expected);
  });

  it('falha na construção quando WEBHOOK_HASH_SECRET não está configurado', () => {
    expect(() => new WebhookLogService(prisma, sseKms, createConfig())).toThrow(
      'WEBHOOK_HASH_SECRET não configurado',
    );
  });
});
