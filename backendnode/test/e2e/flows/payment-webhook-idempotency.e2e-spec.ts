/**
 * E2E — Payment Webhook Idempotency (S05 T046).
 *
 * Fluxo coberto:
 *  1. Criar Payment PENDING com txid
 *  2. Enviar 2 webhooks com mesmo txid
 *  3. Verificar: apenas 1 transição para PAID (idempotência)
 *
 * runners: jest --config ./test/e2e/jest-e2e-flows.config.js
 */
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/prisma/prisma.service';
import {
  generateUniqueEmail,
  generateValidPassword,
  generateValidPhone,
  buildAuthCookie,
} from './setup/test-helpers';

const WEBHOOK_URL = '/webhooks/c6-bank';
const HMAC_SECRET = process.env.EFI_WEBHOOK_HMAC_SECRET || 'test-hmac-secret';

function signPayload(payload: object, timestamp: string): string {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(JSON.stringify({ ...payload, timestamp }))
    .digest('hex');
}

describe('Payment Webhook Idempotency — S05 T046', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const TEST_EMAIL = generateUniqueEmail('e2eWebhook');
  let userId: number;
  let sessionId: string;

  // IDs para cleanup
  const createdPaymentIds: number[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);

    // Criar usuário (sem 2FA para simplificar — webhook não precisa de auth)
    await request(app.getHttpServer())
      .post('/auth/register/user')
      .send({
        email: TEST_EMAIL,
        nome: 'E2E Webhook Tester',
        senha: generateValidPassword(),
        senhaConfirmacao: generateValidPassword(),
        telefone: generateValidPhone(),
        termosAceitos: true,
        politicaAceita: true,
      })
      .expect(201);

    const user = await prisma.user.findUnique({
      where: { email: TEST_EMAIL.toLowerCase() },
    });
    userId = user!.id;

    // Login (sem 2FA)
    const loginRes = await request(app.getHttpServer())
      .post('/auth')
      .send({ email: TEST_EMAIL, senha: generateValidPassword() })
      .expect(200);
    sessionId = loginRes.body.data.sessionId;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.payment.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await app.close();
  });

  // ------------------------------------------------------------------
  // WT1: 2 webhooks com mesmo txid → apenas 1 transição PAID
  // ------------------------------------------------------------------
  describe('WT1. 2 webhooks com mesmo txid → apenas 1 transição PAID', () => {
    it('Primeiro webhook: PENDING → PAID', async () => {
      // Cria payment PENDING com txid conhecido
      const txid = `IDEM${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount: 250000,
          method: 'PIX',
          purpose: 'TOKEN_RESERVATION',
          status: 'PENDING',
          txid,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      createdPaymentIds.push(payment.id);

      const payload = {
        pix: [
          {
            txid,
            valor: '250000',
            horario: new Date().toISOString(),
            endToEndId: `E2E${Date.now()}`,
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
        .set('X-Forwarded-For', '127.0.0.1')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('success');

      // Aguarda processamento
      await new Promise((r) => setTimeout(r, 500));

      const updated = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updated!.status).toBe('PAID');
      expect(updated!.paidAt).toBeDefined();
    });

    it('Segundo webhook com mesmo txid: idempotente (status já PAID)', async () => {
      // Usa o mesmo txid do teste anterior (ou cria novo)
      const txid = `IDEM2${Date.now()}`;
      const payment = await prisma.payment.create({
        data: {
          userId,
          amount: 300000,
          method: 'PIX',
          purpose: 'TOKEN_RESERVATION',
          status: 'PENDING',
          txid,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      createdPaymentIds.push(payment.id);

      // Primeiro webhook
      const payload = {
        pix: [
          {
            txid,
            valor: '300000',
            horario: new Date().toISOString(),
            endToEndId: `E2E2${Date.now()}`,
            infoPagador: '12345678900',
          },
        ],
      };
      const timestamp1 = String(Date.now());
      const signature1 = signPayload(payload, timestamp1);

      await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature1)
        .set('X-Efi-Timestamp', timestamp1)
        .set('X-Forwarded-For', '127.0.0.1')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      await new Promise((r) => setTimeout(r, 500));

      // Segundo webhook (duplicado)
      const timestamp2 = String(Date.now());
      const signature2 = signPayload(payload, timestamp2);

      const res2 = await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature2)
        .set('X-Efi-Timestamp', timestamp2)
        .set('X-Forwarded-For', '127.0.0.1')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      // O segundo deve retornar 200 (idempotente) e não causar erro
      expect(['success', 'already_processed']).toContain(res2.body.status);

      // Payment continua PAID (não duplica)
      const updated = await prisma.payment.findUnique({
        where: { id: payment.id },
      });
      expect(updated!.status).toBe('PAID');
    });
  });

  // ------------------------------------------------------------------
  // WT2: Webhook para payment inexistente → 200 (sem erro, logado)
  // ------------------------------------------------------------------
  describe('WT2. Webhook para txid inexistente → 200 (sem crash)', () => {
    it('txid sem payment correspondente → 200 (webhook ignorado)', async () => {
      const payload = {
        pix: [
          {
            txid: `NOTFOUND${Date.now()}`,
            valor: '100000',
            horario: new Date().toISOString(),
            endToEndId: `ENF${Date.now()}`,
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
        .set('X-Forwarded-For', '127.0.0.1')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      // 200 = webhook processado (mesmo que não encontrou payment)
      expect(res.body.status).not.toBe('error');
    });
  });

  // ------------------------------------------------------------------
  // WT3: Webhook com payload inválido → 200 mas loga warning
  // ------------------------------------------------------------------
  describe('WT3. Webhook sem txid → 200 (payload inválido ignorado)', () => {
    it('payload sem txid → 200 com status error (sem crash)', async () => {
      const payload = {
        pix: [
          {
            valor: '100000',
            horario: new Date().toISOString(),
            // txid ausente
          },
        ],
      };
      const timestamp = String(Date.now());
      const signature = signPayload(payload, timestamp);

      const res = await request(app.getHttpServer())
        .post(WEBHOOK_URL)
        .set('X-Efi-Signature', signature)
        .set('X-Efi-Timestamp', timestamp)
        .set('X-Forwarded-For', '127.0.0.1')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(res.body.status).toBe('error');
    });
  });
});
