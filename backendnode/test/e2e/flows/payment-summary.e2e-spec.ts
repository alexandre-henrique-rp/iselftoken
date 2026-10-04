import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { SessionService } from '../../../src/auth/session/session.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { buildAuthCookie, generateUniqueEmail } from './setup/test-helpers';

describe('Payment summary HTTP contract', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessionService: SessionService;
  let ownerId: number;
  let otherOwnerId: number;
  let paymentId: number;
  let draftId: number;
  let ownerSessionId: string;
  let otherOwnerSessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    sessionService = app.get(SessionService);

    const owner = await prisma.user.create({
      data: {
        email: generateUniqueEmail('paymentSummaryOwner'),
        nome: 'Payment Summary Owner',
        senha: 'test-only-password-hash',
        termosAceitos: true,
        politicaAceita: true,
      },
    });
    ownerId = owner.id;

    const otherOwner = await prisma.user.create({
      data: {
        email: generateUniqueEmail('paymentSummaryOtherOwner'),
        nome: 'Payment Summary Other Owner',
        senha: 'test-only-password-hash',
        termosAceitos: true,
        politicaAceita: true,
      },
    });
    otherOwnerId = otherOwner.id;

    ownerSessionId = randomUUID();
    otherOwnerSessionId = randomUUID();
    await sessionService.createSession(ownerSessionId, {
      id: owner.id,
      publicId: owner.publicId,
      email: owner.email,
      nome: owner.nome,
      role: owner.role,
      isActive: owner.isActive,
      af2Verified: true,
    });
    await sessionService.createSession(otherOwnerSessionId, {
      id: otherOwner.id,
      publicId: otherOwner.publicId,
      email: otherOwner.email,
      nome: otherOwner.nome,
      role: otherOwner.role,
      isActive: otherOwner.isActive,
      af2Verified: true,
    });

    const payment = await prisma.payment.create({
      data: {
        userId: owner.id,
        purpose: 'TOKEN_RESERVATION',
        amount: 500,
        method: 'PIX',
        status: 'PENDING',
      },
    });
    paymentId = payment.id;

    const draft = await prisma.startupDraft.create({
      data: {
        founderId: owner.id,
        paymentId: payment.id,
        status: 'PENDING_PAYMENT',
        payload: {
          nomeFantasia: 'Acme HTTP Contract',
          razaoSocial: 'Acme HTTP Contract LTDA',
          cpf: '52998224725',
          email: 'payment-summary-private@example.com',
          telefone: '11999999999',
          cnpj: '11444777000161',
          banco: 'private-bank-data',
        },
      },
    });
    draftId = draft.id;
  });

  afterAll(async () => {
    await prisma.startupDraft.delete({ where: { id: draftId } });
    await prisma.payment.delete({ where: { id: paymentId } });
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, otherOwnerId] } },
    });
    await sessionService
      .getRedisClient()
      .del(`session:${ownerSessionId}`, `session:${otherOwnerSessionId}`);
    await app.close();
  });

  it('expõe reservationContext mínimo ao owner e retorna 404 neutro cross-owner', async () => {
    const ownerResponse = await request(app.getHttpServer())
      .get(`/payment/${paymentId}`)
      .set('Cookie', buildAuthCookie(ownerSessionId))
      .expect(200);

    expect(ownerResponse.body.data.reservationContext).toEqual({
      kind: 'STARTUP_RESERVATION',
      displayName: 'Acme HTTP Contract',
      nameSource: 'DRAFT_PAYLOAD',
      startup: null,
      campaign: null,
    });
    expect(ownerResponse.body.data).not.toHaveProperty('startupDraft');
    expect(ownerResponse.body.data).not.toHaveProperty('userId');
    expect(ownerResponse.body.data).not.toHaveProperty('campaignId');

    const serializedOwnerData = JSON.stringify(ownerResponse.body.data);
    expect(serializedOwnerData).not.toContain('52998224725');
    expect(serializedOwnerData).not.toContain(
      'payment-summary-private@example.com',
    );
    expect(serializedOwnerData).not.toContain('11999999999');
    expect(serializedOwnerData).not.toContain('11444777000161');
    expect(serializedOwnerData).not.toContain('private-bank-data');

    const crossOwnerResponse = await request(app.getHttpServer())
      .get(`/payment/${paymentId}`)
      .set('Cookie', buildAuthCookie(otherOwnerSessionId))
      .expect(404);

    const serializedCrossOwnerResponse = JSON.stringify(
      crossOwnerResponse.body,
    );
    expect(serializedCrossOwnerResponse).not.toContain('Acme HTTP Contract');
    expect(serializedCrossOwnerResponse).not.toContain('PENDING_PAYMENT');
    expect(serializedCrossOwnerResponse).not.toContain('52998224725');
  });
});
