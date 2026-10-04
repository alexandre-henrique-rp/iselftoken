import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookSignatureGuard } from './webhook-signature.guard';

/**
 * Testes do guard de webhook EFI (modelo real: HMAC na query string + IP).
 * mTLS é validado pelo Nginx (não pela aplicação).
 */
describe('WebhookSignatureGuard', () => {
  let guard: WebhookSignatureGuard;
  let mockConfig: Partial<ConfigService>;

  const EFI_IP = '34.193.116.226';
  const HMAC_SECRET = 'test-hmac-secret-key-32-chars-abcdef';
  const OLD_ENV = process.env['NODE_ENV'];

  const createMockContext = (
    overrides: Record<string, any> = {},
  ): ExecutionContext => {
    const defaultReq = {
      query: {},
      headers: {},
      ip: EFI_IP,
      socket: { remoteAddress: EFI_IP },
      ...overrides,
    };
    return {
      switchToHttp: () => ({ getRequest: () => defaultReq }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    process.env['NODE_ENV'] = 'test'; // não é development nem production
    mockConfig = {
      get: jest.fn((key: string) =>
        key === 'EFI_WEBHOOK_HMAC_SECRET' ? HMAC_SECRET : null,
      ),
    };
    guard = new WebhookSignatureGuard(mockConfig as ConfigService);
  });

  afterEach(() => {
    process.env['NODE_ENV'] = OLD_ENV;
  });

  describe('HMAC na query string', () => {
    it('aceita quando o hmac da query bate com o segredo', () => {
      const ctx = createMockContext({ query: { hmac: HMAC_SECRET } });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('aceita quando o hmac vem só na URL crua', () => {
      const ctx = createMockContext({
        query: {},
        originalUrl: `/payment/efi/webhook?hmac=${HMAC_SECRET}&ignorar=`,
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejeita quando o hmac está ausente', () => {
      const ctx = createMockContext({ query: {} });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('rejeita quando o hmac é inválido', () => {
      const ctx = createMockContext({ query: { hmac: 'errado' } });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });
  });

  describe('IP whitelist (apenas em produção)', () => {
    it('rejeita IP fora da whitelist em produção', () => {
      process.env['NODE_ENV'] = 'production';
      const ctx = createMockContext({
        query: { hmac: HMAC_SECRET },
        headers: { 'x-forwarded-for': '1.2.3.4' },
        ip: '1.2.3.4',
      });
      expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('aceita IP oficial da EFI em produção (via x-forwarded-for)', () => {
      process.env['NODE_ENV'] = 'production';
      const ctx = createMockContext({
        query: { hmac: HMAC_SECRET },
        headers: { 'x-forwarded-for': EFI_IP },
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('bypass em development', () => {
    it('libera qualquer request em development', () => {
      process.env['NODE_ENV'] = 'development';
      const ctx = createMockContext({ query: {} });
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });
});
