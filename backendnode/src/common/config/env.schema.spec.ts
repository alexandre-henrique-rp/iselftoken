import { envSchema } from './env.schema';

describe('envSchema', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.WEBHOOK_HASH_SECRET = 'c'.repeat(32);
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('DATABASE_URL', () => {
    it('deve aceitar URL SQLite válida', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar URL MySQL porque o banco ativo é SQLite', () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.DATABASE_PROVIDER = 'mysql';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar DATABASE_URL inválida', () => {
      process.env.DATABASE_URL = 'invalid-url';
      process.env.JWT_SECRET = 'a'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(false);
    });
  });

  describe('JWT_SECRET', () => {
    it('deve aceitar JWT_SECRET com 32+ caracteres', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar JWT_SECRET com menos de 32 caracteres', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(31);
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['JWT_SECRET'],
              message: expect.stringContaining('32 caracteres'),
            }),
          ]),
        );
      }
    });

    it('deve rejeitar JWT_SECRET ausente sem usar fallback', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      delete process.env.JWT_SECRET;
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ['JWT_SECRET'] }),
          ]),
        );
      }
    });

    it('deve rejeitar JWT_SECRET vazio', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = '';
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['JWT_SECRET'],
              message: expect.stringContaining('32 caracteres'),
            }),
          ]),
        );
      }
    });

    it.each([
      'your-jwt-secret-here',
      'TROCAR-POR-VALOR-SEGURO-MIN-32-CHARS',
      'dev-jwt-secret-change-in-production',
    ])('deve rejeitar placeholder JWT_SECRET: %s', (placeholder) => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = placeholder;
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);

      const result = envSchema.safeParse(process.env);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['JWT_SECRET'],
              message: 'JWT_SECRET não pode usar placeholder conhecido',
            }),
          ]),
        );
      }
    });
  });

  describe('WEBHOOK_HASH_SECRET', () => {
    it('deve aceitar segredo de 32+ caracteres', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.WEBHOOK_HASH_SECRET = 'c'.repeat(32);
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);

      const result = envSchema.safeParse(process.env);

      expect(result.success).toBe(true);
    });

    it('deve rejeitar segredo ausente', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      delete process.env.WEBHOOK_HASH_SECRET;
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);

      const result = envSchema.safeParse(process.env);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: ['WEBHOOK_HASH_SECRET'] }),
          ]),
        );
      }
    });

    it.each([
      'default-secret-change-me',
      'dev-webhook-hash-secret-change-in-production',
    ])('deve rejeitar placeholder: %s', (placeholder) => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.WEBHOOK_HASH_SECRET = placeholder;
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);

      const result = envSchema.safeParse(process.env);

      expect(result.success).toBe(false);
    });
  });

  describe('EFI_MODE', () => {
    it('deve aceitar mock como default', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      // EFI_MODE não setado = usa default 'mock'
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.EFI_MODE).toBe('mock');
      }
    });

    it('deve aceitar sandbox', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_MODE = 'sandbox';
      process.env.EFI_CLIENT_ID = 'cli_123';
      process.env.EFI_CLIENT_SECRET = 'secret';
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(true);
    });

    it('deve aceitar prod', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_MODE = 'prod';
      process.env.EFI_CLIENT_ID = 'cli_123';
      process.env.EFI_CLIENT_SECRET = 'secret';
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(true);
    });
  });

  describe('EFI_MODE + credentials refinement', () => {
    it('deve falhar se EFI_MODE != mock e EFI_CLIENT_ID ausente', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_MODE = 'sandbox';
      process.env.EFI_CLIENT_SECRET = 'secret';
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(false);
    });

    it('deve falhar se EFI_MODE != mock e EFI_CLIENT_SECRET ausente', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_MODE = 'sandbox';
      process.env.EFI_CLIENT_ID = 'cli_123';
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(false);
    });

    it('deve passar mock sem credenciais EFI', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_MODE = 'mock';
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(true);
    });
  });

  describe('EFI_WEBHOOK_HMAC_SECRET', () => {
    it('deve aceitar com 32+ caracteres', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'b'.repeat(32);
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar com menos de 32 caracteres', () => {
      process.env.DATABASE_URL = 'file:./dev.db';
      process.env.DATABASE_PROVIDER = 'sqlite';
      process.env.JWT_SECRET = 'a'.repeat(32);
      process.env.EFI_WEBHOOK_HMAC_SECRET = 'short';
      const result = envSchema.safeParse(process.env);
      expect(result.success).toBe(false);
    });
  });
});
