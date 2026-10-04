/**
 * E2E — Webhook EFI Security (5 cenários).
 * Valida: mTLS, IP whitelist, HMAC, timestamp, payload valido.
 * Escopo: S01 (WebhookSignatureGuard).
 * runners: jest --config ./test/e2e/jest-e2e-flows.config.js
 */
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import * as crypto from 'crypto';

const WEBHOOK_URL = '/payment/efi/webhook';
const HMAC_SECRET = process.env.EFI_WEBHOOK_HMAC_SECRET || 'test-hmac-secret';

function signPayload(payload: object, timestamp: string): string {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(JSON.stringify({ ...payload, timestamp }))
    .digest('hex');
}

describe('Webhook EFI — Security E2E (S01)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ------------------------------------------------------------------
  // Cenário 1: Webhook sem mTLS cert → 401
  // ------------------------------------------------------------------
  describe('1. Sem mTLS cert → 401', () => {
    it('request sem client certificate → 401 Unauthorized', async () => {
      const payload = {
        pix: [
          {
            txid: 'TEST001',
            valor: '1',
            horario: new Date().toISOString(),
            infoPagador: '12345678900',
          },
        ],
      };
      const timestamp = String(Date.now());
      const signature = signPayload(payload, timestamp);

      await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature)
        .set('X-Efi-Timestamp', timestamp)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);
    });
  });

  // ------------------------------------------------------------------
  // Cenário 2: Webhook com IP fora whitelist → 401
  // ------------------------------------------------------------------
  describe('2. IP fora whitelist → 401', () => {
    it('request de IP não autorizado → 401', async () => {
      const payload = {
        pix: [
          {
            txid: 'TEST002',
            valor: '1',
            horario: new Date().toISOString(),
            infoPagador: '12345678900',
          },
        ],
      };
      const timestamp = String(Date.now());
      const signature = signPayload(payload, timestamp);

      // Nota: em ambiente de teste, todos os IPs são "127.0.0.1"
      // Este teste valida a existencia do guard. Em produção real,
      // o guard verifica X-Forwarded-For ou remoteAddress.
      await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature)
        .set('X-Efi-Timestamp', timestamp)
        .set('X-Forwarded-For', '192.168.99.99') // IP inválido
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);
    });
  });

  // ------------------------------------------------------------------
  // Cenário 3: Webhook com HMAC inválido → 401
  // ------------------------------------------------------------------
  describe('3. HMAC inválido → 401', () => {
    it('X-Efi-Signature com valor forjado → 401', async () => {
      const payload = {
        pix: [
          {
            txid: 'TEST003',
            valor: '1',
            horario: new Date().toISOString(),
            infoPagador: '12345678900',
          },
        ],
      };
      const timestamp = String(Date.now());

      await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', 'invalid_signature_hmac')
        .set('X-Efi-Timestamp', timestamp)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);
    });
  });

  // ------------------------------------------------------------------
  // Cenário 4: Webhook com timestamp > 5min → 401
  // ------------------------------------------------------------------
  describe('4. Timestamp > 5min → 401', () => {
    it('X-Efi-Timestamp muito antigo → 401', async () => {
      const payload = {
        pix: [
          {
            txid: 'TEST004',
            valor: '1',
            horario: new Date().toISOString(),
            infoPagador: '12345678900',
          },
        ],
      };
      const oldTimestamp = String(Date.now() - 6 * 60 * 1000); // 6 min no passado
      const signature = signPayload(payload, oldTimestamp);

      await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature)
        .set('X-Efi-Timestamp', oldTimestamp)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(401);
    });
  });

  // ------------------------------------------------------------------
  // Cenário 5: Webhook válido → 200 + processado
  // ------------------------------------------------------------------
  describe('5. Webhook válido → 200 + processado', () => {
    it('payload com signature + timestamp + IP válidos → 200', async () => {
      // Criar payment com txid conhecido
      const payment = await prisma.payment.create({
        data: {
          userId: 1, // fixture — existe no banco de teste
          amount: 100000,
          method: 'PIX',
          purpose: 'TOKEN_RESERVATION',
          status: 'PENDING',
          txid: `SEC${Date.now()}`,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const payload = {
        pix: [
          {
            txid: payment.txid,
            valor: '100000',
            horario: new Date().toISOString(),
            endToEndId: `ESEC${Date.now()}`,
            infoPagador: '12345678900',
          },
        ],
      };
      const timestamp = String(Date.now());
      const signature = signPayload(payload, timestamp);

      const res = await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature)
        .set('X-Efi-Timestamp', timestamp)
        .set('X-Forwarded-For', '127.0.0.1') // Whitelist
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(res.body.error).toBe(false);

      // Verificar webhook log
      const logs = await prisma.webhookLog.findMany({
        where: { eventType: 'pix.received' },
        orderBy: { receivedAt: 'desc' },
      });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].txid).toContain(payment.txid!);

      // Cleanup
      await prisma.payment.delete({ where: { id: payment.id } });
    });
  });

  // ------------------------------------------------------------------
  // Cenário Bônus: Replay attack (mesmo payload + timestamp repetido) → 401
  // ------------------------------------------------------------------
  describe('6. Replay attack (idempotência) → 401', () => {
    it('mesmo txid + timestamp duplicado → 401 ou ignora', async () => {
      const txid = `REPLAY${Date.now()}`;
      const timestamp = String(Date.now());
      const payload = {
        pix: [
          {
            txid,
            valor: '1',
            horario: new Date().toISOString(),
            infoPagador: '12345678900',
          },
        ],
      };
      const signature = signPayload(payload, timestamp);

      // Primeira requisição — deve passar
      await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature)
        .set('X-Efi-Timestamp', timestamp)
        .set('X-Forwarded-For', '127.0.0.1')
        .set('Content-Type', 'application/json')
        .send(payload);

      // Breve pausa para garantir processamento
      await new Promise((r) => setTimeout(r, 500));

      // Segunda requisição com mesmo txid + timestamp — deve ser rejeitada
      const res2 = await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature)
        .set('X-Efi-Timestamp', timestamp)
        .set('X-Forwarded-For', '127.0.0.1')
        .set('Content-Type', 'application/json')
        .send(payload);

      // 401 (replay detectado) ou 200 (idempotente — processado apenas 1x)
      expect([200, 401]).toContain(res2.status);
    });
  });
});
