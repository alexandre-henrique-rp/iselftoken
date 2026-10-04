"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const cookieParser = __importStar(require("cookie-parser"));
const common_1 = require("@nestjs/common");
const request = __importStar(require("supertest"));
const app_module_1 = require("../../../src/app.module");
const prisma_service_1 = require("../../../src/prisma/prisma.service");
const session_service_1 = require("../../../src/auth/session/session.service");
const email_service_1 = require("../../../src/email/email.service");
const test_helpers_1 = require("./setup/test-helpers");
describe('E2E Real Flow - Founder Dashboard Integration (T023)', () => {
    let app;
    let prisma;
    let sessionService;
    let emailService;
    const TEST_EMAIL = (0, test_helpers_1.generateUniqueEmail)('e2eT023');
    const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
    let userId;
    let sessionId;
    let twoFactorCode;
    let startupId;
    let subscriptionId;
    let paymentId;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
        app.use(cookieParser());
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
        sessionService = app.get(session_service_1.SessionService);
        emailService = app.get(email_service_1.EmailService);
        jest.spyOn(emailService, 'sendVerificationCodeEmail').mockImplementation(async (_to, _nome, codigo, acao) => {
            if (acao && (acao.includes('Autenticar') || acao.includes('autenticar'))) {
                twoFactorCode = codigo;
            }
            return { success: true, message: 'mocked' };
        });
        jest.spyOn(emailService, 'sendWelcomeEmail').mockReturnValue(Promise.resolve({ success: true, message: 'mocked' }));
        jest.spyOn(emailService, 'sendValidationEmail').mockReturnValue(Promise.resolve({ success: true, message: 'mocked' }));
    });
    afterAll(async () => {
        if (startupId) {
            await prisma.startup.deleteMany({ where: { id: startupId } });
        }
        if (paymentId) {
            await prisma.payment.deleteMany({ where: { id: paymentId } });
        }
        if (subscriptionId) {
            await prisma.subscription.deleteMany({ where: { id: subscriptionId } });
        }
        if (userId) {
            await prisma.accessLog.deleteMany({ where: { userId } });
            await prisma.emailValidation.deleteMany({ where: { userId } });
            await prisma.backupUser.deleteMany({ where: { userId } });
            await prisma.walletTransaction.deleteMany({ where: { wallet: { userId } } });
            await prisma.wallet.deleteMany({ where: { userId } });
            await prisma.token.deleteMany({ where: { userId } });
            await prisma.investment.deleteMany({ where: { userId } });
            await prisma.auditLog.deleteMany({ where: { userId } });
            await prisma.user.delete({ where: { id: userId } });
        }
        await app.close();
    });
    describe('STEP 1: Cadastro de usuario founder', () => {
        it('deve cadastrar usuario e criar sessao', async () => {
            const registerDto = {
                email: TEST_EMAIL,
                nome: 'Joao Fundador',
                senha: (0, test_helpers_1.generateValidPassword)(),
                senhaConfirmacao: (0, test_helpers_1.generateValidPassword)(),
                telefone: (0, test_helpers_1.generateValidPhone)(),
                termosAceitos: true,
                politicaAceita: true,
                codigo: '123456',
                urlRedirect: 'http://localhost:5173/home',
            };
            const res = await request(app.getHttpServer())
                .post('/auth/register/user')
                .send(registerDto)
                .expect(201);
            expect(res.body.error).toBe(false);
            expect(res.body.data).toHaveProperty('sessionId');
            sessionId = res.body.data.sessionId;
            const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL_LOWER } });
            expect(user).not.toBeNull();
            userId = user.id;
        });
    });
    describe('STEP 2: Comprar plano FUNDADOR', () => {
        it('deve listar planos e encontrar FUNDADOR', async () => {
            const res = await request(app.getHttpServer())
                .get('/plans')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(sessionId))
                .expect(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            const fundadorPlan = res.body.data.find((p) => p.slug?.toLowerCase().includes('fundador'));
            expect(fundadorPlan).toBeDefined();
            expect(Number(fundadorPlan.preco)).toBeGreaterThan(0);
        });
        it('deve criar Subscription PENDING e Payment SUBSCRIPTION, depois simular pago', async () => {
            const plansRes = await request(app.getHttpServer())
                .get('/plans')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(sessionId))
                .expect(200);
            const fundadorPlan = plansRes.body.data.find((p) => p.slug?.toLowerCase().includes('fundador'));
            const planId = fundadorPlan.id;
            const planPrice = Number(fundadorPlan.preco);
            const subRes = await request(app.getHttpServer())
                .post('/subscriptions')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(sessionId))
                .send({ userId, planId, status: 'PENDING' })
                .expect(201);
            subscriptionId = subRes.body.data.id;
            expect(subRes.body.data.status).toBe('PENDING');
            const payRes = await request(app.getHttpServer())
                .post('/payment')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(sessionId))
                .send({
                amount: planPrice,
                method: 'PIX',
                purpose: 'SUBSCRIPTION',
                subscriptionId,
            })
                .expect(201);
            paymentId = payRes.body.data.id;
            expect(payRes.body.data.status).toBe('PENDING');
            expect(payRes.body.data.purpose).toBe('SUBSCRIPTION');
            await request(app.getHttpServer())
                .post(`/payment/${paymentId}/dev/simulate-paid`)
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(sessionId))
                .expect(201);
            const sub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
            expect(sub.status).toBe('ACTIVE');
            const freshUser = await prisma.user.findUnique({
                where: { id: userId },
                include: { subscriptions: { include: { plan: true } } },
            });
            const existingSession = await sessionService.getSession(sessionId);
            const updatedSession = {
                ...freshUser,
                af2Verified: true,
                lastAccessAt: new Date().toISOString(),
            };
            await sessionService.updateSession(sessionId, updatedSession);
        });
    });
    describe('STEP 3: Criar startup via POST /startup', () => {
        it('deve criar startup com status PENDING_RESERVATION_PAYMENT', async () => {
            const startupPayload = {
                nomeFantasia: 'TechNova MVP',
                razaoSocial: 'TechNova Tecnologia LTDA',
                cnpj: (0, test_helpers_1.generateValidCnpj)(),
                dataAbertura: '2020-01-15',
                paisIso3: 'BRA',
                areaAtuacao: 'tecnologia_saas',
                estagio: 'mvp',
                descricao: 'Plataforma SaaS para automacao financeira de PMEs brasileiras.',
                titular: 'Joao Fundador',
                banco: '000',
                agencia: '0001',
                conta: '123456',
                digito: '7',
                metaCaptacao: 500000,
                equityOferecido: 10,
            };
            const res = await request(app.getHttpServer())
                .post('/startup')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(sessionId))
                .send(startupPayload)
                .expect(201);
            expect(res.body.data).toHaveProperty('id');
            startupId = res.body.data.id;
            expect(res.body.data.status).toBe('PENDING_RESERVATION_PAYMENT');
        });
        it('deve falhar com CNPJ invalido', async () => {
            const invalidPayload = {
                nomeFantasia: 'Teste',
                razaoSocial: 'Teste LTDA',
                cnpj: '11.444.777/0001-80',
                dataAbertura: '2020-01-15',
                paisIso3: 'BRA',
                areaAtuacao: 'tecnologia_saas',
                estagio: 'mvp',
                descricao: 'Descricao valida com mais de 10 caracteres para teste.',
                titular: 'Teste',
                banco: '000',
                agencia: '0001',
                conta: '123456',
                digito: '7',
                metaCaptacao: 500000,
                equityOferecido: 10,
            };
            const res = await request(app.getHttpServer())
                .post('/startup')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(sessionId))
                .send(invalidPayload);
            expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });
    describe('STEP 4: Criar payment TOKEN_RESERVATION via POST /payment', () => {
        it('deve criar payment PENDING com purpose TOKEN_RESERVATION', async () => {
            const paymentPayload = {
                amount: 500,
                method: 'PIX',
                purpose: 'TOKEN_RESERVATION',
                campaignId: null,
            };
            const res = await request(app.getHttpServer())
                .post('/payment')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(sessionId))
                .send(paymentPayload)
                .expect(201);
            expect(res.body.data).toHaveProperty('id');
            const newPaymentId = res.body.data.id;
            expect(res.body.data.status).toBe('PENDING');
            expect(res.body.data.purpose).toBe('TOKEN_RESERVATION');
            expect(Number(res.body.data.amount)).toBe(500);
            paymentId = newPaymentId;
        });
    });
    describe('STEP 5: Verificar estado no banco de dados', () => {
        it('startup deve ter status PENDING_RESERVATION_PAYMENT', async () => {
            const startup = await prisma.startup.findUnique({ where: { id: startupId } });
            expect(startup).not.toBeNull();
            expect(startup.status).toBe('PENDING_RESERVATION_PAYMENT');
        });
        it('payment deve ter purpose TOKEN_RESERVATION e status PENDING', async () => {
            const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
            expect(payment).not.toBeNull();
            expect(payment.purpose).toBe('TOKEN_RESERVATION');
            expect(payment.status).toBe('PENDING');
            expect(Number(payment.amount)).toBe(500);
        });
        it('subscription do founder deve estar ACTIVE', async () => {
            const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
            expect(subscription).not.toBeNull();
            expect(subscription.status).toBe('ACTIVE');
        });
    });
});
//# sourceMappingURL=founder-dashboard-integration.e2e-spec.js.map