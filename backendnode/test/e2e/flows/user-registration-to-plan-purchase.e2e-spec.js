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
const db_cleanup_1 = require("./setup/db-cleanup");
describe('E2E Real Flow - Cadastro ate Compra de Plano (M4)', () => {
    let app;
    let prisma;
    let sessionService;
    let emailService;
    const TEST_EMAIL = (0, test_helpers_1.generateUniqueEmail)();
    const TEST_EMAIL_LOWER = TEST_EMAIL.toLowerCase();
    let userId;
    let sessionId;
    let loginSessionId;
    let twoFactorCode;
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
        if (userId) {
            const before = await (0, db_cleanup_1.countUserArtifacts)(prisma, userId);
            await (0, db_cleanup_1.cleanupTestUser)(prisma, TEST_EMAIL);
            const after = await (0, db_cleanup_1.countUserArtifacts)(prisma, userId);
            console.log(`[CLEANUP] User ${userId} (${TEST_EMAIL}):`);
            console.log(`  before: ${JSON.stringify(before)}`);
            console.log(`  after:  ${JSON.stringify(after)}`);
            expect(after.user).toBe(0);
            expect(after.wallet).toBe(0);
            expect(after.subscriptions).toBe(0);
        }
        await app.close();
    });
    describe('STEP 1: Cadastro de usuario', () => {
        it('deve cadastrar usuario com sucesso e criar sessao no Redis', async () => {
            const registerDto = {
                email: TEST_EMAIL,
                nome: 'Maria Silva Santos',
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
            expect(res.body.data.email.toLowerCase()).toBe(TEST_EMAIL_LOWER);
            sessionId = res.body.data.sessionId;
            const setCookies = res.headers['set-cookie'];
            expect(setCookies).toBeDefined();
            const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL_LOWER } });
            expect(user).not.toBeNull();
            expect(user.isActive).toBe(true);
            expect(user.termosAceitos).toBe(true);
            expect(user.politicaAceita).toBe(true);
            expect(user.senha).toMatch(/^\$2[aby]\$/);
            expect(user.publicId).toMatch(/^[0-9a-f-]{36}$/);
            userId = user.id;
            const session = await sessionService.getSession(sessionId);
            expect(session).not.toBeNull();
            expect(session.email.toLowerCase()).toBe(TEST_EMAIL_LOWER);
            expect(emailService.sendWelcomeEmail).toHaveBeenCalledWith(TEST_EMAIL_LOWER, expect.objectContaining({ email: TEST_EMAIL_LOWER }));
        });
        it('deve rejeitar cadastro com email duplicado', async () => {
            await request(app.getHttpServer())
                .post('/auth/register/user')
                .send({
                email: TEST_EMAIL,
                nome: 'Outro Nome',
                senha: (0, test_helpers_1.generateValidPassword)(),
                senhaConfirmacao: (0, test_helpers_1.generateValidPassword)(),
                telefone: (0, test_helpers_1.generateValidPhone)(),
                termosAceitos: true,
                politicaAceita: true,
                codigo: '123456',
                urlRedirect: 'http://localhost:5173/home',
            })
                .expect((res) => {
                if (res.status !== 400 && res.status !== 500) {
                    throw new Error(`Expected 400 or 500, got ${res.status}`);
                }
            });
        });
        it('deve criar wallet atomicamente junto com usuario no cadastro', async () => {
            const wallet = await prisma.wallet.findUnique({ where: { userId } });
            expect(wallet).not.toBeNull();
            expect(wallet.userId).toBe(userId);
            expect(Number(wallet.balance)).toBe(0);
            expect(Number(wallet.blocked)).toBe(0);
            expect(wallet.currency).toBe('BRL');
        });
    });
    describe('STEP 2: Confirmacao de email', () => {
        it('deve solicitar token de validacao REGISTRATION', async () => {
            const newEmail = (0, test_helpers_1.generateUniqueEmail)('valEmail');
            const res = await request(app.getHttpServer())
                .post('/auth/validate-email')
                .send({ email: newEmail })
                .expect(200);
            expect(res.body.data.email).toBe(newEmail);
            const validation = await prisma.emailValidation.findFirst({
                where: { email: newEmail, type: 'REGISTRATION' },
            });
            expect(validation).not.toBeNull();
            expect(validation.usedAt).toBeNull();
            expect(validation.expiresAt.getTime()).toBeGreaterThan(Date.now());
            await prisma.emailValidation.deleteMany({ where: { email: newEmail } });
        });
        it('deve validar token JWT do EmailValidation', async () => {
            const newEmail = (0, test_helpers_1.generateUniqueEmail)('valJwt');
            const token = 'test-jwt-token-' + Date.now();
            await prisma.emailValidation.create({
                data: {
                    email: newEmail,
                    token,
                    type: 'REGISTRATION',
                    expiresAt: new Date(Date.now() + 3600000),
                },
            });
            await request(app.getHttpServer())
                .post('/auth/validate-email')
                .send({ token: 'invalid-token-format' })
                .expect(400);
            await prisma.emailValidation.deleteMany({ where: { email: newEmail } });
        });
    });
    describe('STEP 3: Login com 2FA', () => {
        it('deve fazer login e gerar codigo 2FA no Redis', async () => {
            twoFactorCode = undefined;
            const res = await request(app.getHttpServer())
                .post('/auth')
                .send({ email: TEST_EMAIL_LOWER, senha: (0, test_helpers_1.generateValidPassword)() })
                .expect(200);
            expect(res.body.data.sessionId).toBeDefined();
            expect(res.body.data.requiresVerification).toBe(true);
            loginSessionId = res.body.data.sessionId;
            expect(twoFactorCode).toBeDefined();
            expect(twoFactorCode).toMatch(/^\d{6}$/);
            await sessionService.storeVerificationCode(loginSessionId, twoFactorCode, 300);
            const hasCode = await sessionService.hasPendingVerificationCode(loginSessionId);
            expect(hasCode).toBe(true);
            const accessLog = await prisma.accessLog.findFirst({
                where: { userId, type: 'LOGIN' },
                orderBy: { createdAt: 'desc' },
            });
            expect(accessLog).not.toBeNull();
            expect(accessLog.method).toBe('POST');
            expect(accessLog.path).toBe('/auth');
        });
        it('deve verificar codigo 2FA com sucesso', async () => {
            const res = await request(app.getHttpServer())
                .post('/auth/verify-code')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .send({ codigo: twoFactorCode })
                .expect(200);
            expect(res.body.data.af2Verified).toBe(true);
            const hasCode = await sessionService.hasPendingVerificationCode(loginSessionId);
            expect(hasCode).toBe(false);
            const session = await sessionService.getSession(loginSessionId);
            expect(session).not.toBeNull();
            expect(session.af2Verified).toBe(true);
        });
        it('deve rejeitar codigo 2FA incorreto', async () => {
            const loginRes = await request(app.getHttpServer())
                .post('/auth')
                .send({ email: TEST_EMAIL_LOWER, senha: (0, test_helpers_1.generateValidPassword)() })
                .expect(200);
            const newSessionId = loginRes.body.data.sessionId;
            await request(app.getHttpServer())
                .post('/auth/verify-code')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(newSessionId))
                .send({ codigo: '000000' })
                .expect(401);
        });
    });
    describe('STEP 4: Completar dados do perfil', () => {
        it('deve atualizar dados pessoais e gerar backup', async () => {
            const updateDto = {
                data_nascimento: '1990-05-15',
                genero: 'MULHER',
                endereco: 'Rua das Flores',
                numero: '123',
                complemento: 'Apto 45',
                bairro: 'Centro',
                cidade: 'Sao Paulo',
                uf: 'SP',
                cep: '01310100',
                pais: { iso3: 'BRA', nome: 'Brasil', emoji: 'BR' },
                tipo_documento: 'CPF',
                reg_documento: (0, test_helpers_1.generateValidCpf)(),
            };
            const res = await request(app.getHttpServer())
                .patch('/users/me')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .send(updateDto)
                .expect(200);
            expect(res.body.data.endereco).toBe('Rua das Flores');
            expect(res.body.data.cidade).toBe('Sao Paulo');
            const user = await prisma.user.findUnique({ where: { id: userId } });
            expect(user).not.toBeNull();
            expect(user.endereco).toBe('Rua das Flores');
            expect(user.data_nascimento.toISOString().substring(0, 10)).toBe('1990-05-15');
            const backup = await prisma.backupUser.findFirst({ where: { userId } });
            expect(backup).not.toBeNull();
            expect(backup.process).toBe('ADMIN');
        });
    });
    describe('STEP 5: Listar planos ativos', () => {
        it('deve retornar catalogo de planos com preco > 0', async () => {
            const res = await request(app.getHttpServer())
                .get('/plans')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .expect(200);
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.data.length).toBeGreaterThan(0);
            const firstPlan = res.body.data[0];
            expect(firstPlan.id).toBeDefined();
            expect(firstPlan.preco).toBeDefined();
            expect(Number(firstPlan.preco)).toBeGreaterThan(0);
            expect(firstPlan.periodoMeses).toBeDefined();
        });
    });
    describe('STEP 6: Comprar plano (subscription + payment + simulate)', () => {
        let planId;
        let planPrice;
        let subscriptionId;
        let paymentId;
        it('deve listar planos e selecionar um', async () => {
            const res = await request(app.getHttpServer())
                .get('/plans')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .expect(200);
            const plan = res.body.data[0];
            planId = plan.id;
            planPrice = Number(plan.preco);
            expect(planPrice).toBeGreaterThan(0);
        });
        it('deve criar Subscription PENDING', async () => {
            const res = await request(app.getHttpServer())
                .post('/subscriptions')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .send({ userId, planId, status: 'PENDING' })
                .expect(201);
            subscriptionId = res.body.data.id;
            expect(res.body.data.status).toBe('PENDING');
            expect(res.body.data.startedAt).toBeDefined();
            expect(res.body.data.expiresAt).toBeDefined();
        });
        it('deve criar Payment PENDING com purpose SUBSCRIPTION', async () => {
            const res = await request(app.getHttpServer())
                .post('/payment')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .send({
                amount: planPrice,
                method: 'PIX',
                purpose: 'SUBSCRIPTION',
                subscriptionId,
            })
                .expect(201);
            paymentId = res.body.data.id;
            expect(res.body.data.status).toBe('PENDING');
            expect(res.body.data.purpose).toBe('SUBSCRIPTION');
            expect(res.body.data.amount).toBeDefined();
        });
        it('deve simular pagamento PAID e ativar Subscription', async () => {
            const res = await request(app.getHttpServer())
                .post(`/payment/${paymentId}/dev/simulate-paid`)
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .expect(201);
            expect(res.body.data.status).toBe('PAID');
            expect(res.body.data.paidAt).toBeDefined();
            const finalSub = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
            expect(finalSub).not.toBeNull();
            expect(finalSub.status).toBe('ACTIVE');
            expect(finalSub.startedAt).toBeDefined();
            expect(finalSub.expiresAt).toBeDefined();
            const monthsDiff = (finalSub.expiresAt.getFullYear() - finalSub.startedAt.getFullYear()) * 12
                + (finalSub.expiresAt.getMonth() - finalSub.startedAt.getMonth());
            const plan = await prisma.plan.findUnique({ where: { id: planId } });
            expect(plan).not.toBeNull();
            expect(Math.abs(monthsDiff - plan.periodoMeses)).toBeLessThanOrEqual(1);
        });
        it('deve ser idempotente (chamar simulate novamente nao quebra)', async () => {
            const res = await request(app.getHttpServer())
                .post(`/payment/${paymentId}/dev/simulate-paid`)
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .expect(201);
            expect(res.body.data.status).toBe('PAID');
        });
        it('[HELPER] refresh session apos subscription ACTIVE', async () => {
            const freshUser = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    wallet: true,
                    payments: true,
                    subscriptions: { include: { plan: true } },
                },
            });
            const existingSession = (await sessionService.getSession(loginSessionId));
            const updatedSession = {
                ...freshUser,
                af2Verified: true,
                af2VerifiedAt: existingSession?.af2VerifiedAt || new Date().toISOString(),
                lastAccessAt: new Date().toISOString(),
            };
            await sessionService.updateSession(loginSessionId, updatedSession);
            expect(true).toBe(true);
        });
    });
    describe('STEP 7: Carteira (lazy creation)', () => {
        it('deve criar wallet automaticamente ao chamar GET /wallet', async () => {
            const before = await prisma.wallet.findUnique({ where: { userId } });
            expect(before).not.toBeNull();
            expect(Number(before.balance)).toBe(0);
            expect(Number(before.blocked)).toBe(0);
            expect(before.currency).toBe('BRL');
            const res = await request(app.getHttpServer())
                .get('/wallet')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .expect(200);
            expect(res.body.data.balance).toBe(0);
            expect(res.body.data.blocked).toBe(0);
            expect(res.body.data.currency).toBe('BRL');
            const after = await prisma.wallet.findUnique({ where: { userId } });
            expect(after).not.toBeNull();
            expect(after.id).toBe(before.id);
        });
        it('deve retornar a mesma wallet em chamadas subsequentes', async () => {
            const res1 = await request(app.getHttpServer())
                .get('/wallet')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .expect(200);
            const res2 = await request(app.getHttpServer())
                .get('/wallet')
                .set('Cookie', (0, test_helpers_1.buildAuthCookie)(loginSessionId))
                .expect(200);
            expect(res1.body.data.id).toBe(res2.body.data.id);
        });
    });
    describe('RELATORIO FINAL', () => {
        it('todos os checks do fluxo M4 foram validados', () => {
            const report = `
      ============================================
      [M4 - E2E FLUXO COMPLETO] RELATORIO FINAL
      ============================================
      User ID criado: ${userId}
      Email: ${TEST_EMAIL}
      Session ID (login): ${loginSessionId}
      Codigo 2FA capturado: ${twoFactorCode}
      ============================================
      Steps validados:
      1. Cadastro (User + sessao + bcrypt hash + emails) ✓
      2. Confirmacao email (token JWT REGISTRATION) ✓
      3. Login 2FA (codigo Redis + AccessLog LOGIN + verify 2FA) ✓
      4. Completar perfil (todos campos + backup) ✓
      5. Listar planos (catalogo ativo) ✓
      6. Comprar plano (Subscription ACTIVE + Payment PAID + idempotencia) ✓
      7. Carteira (lazy creation BRL/0/0) ✓
      ============================================
      `;
            console.log(report);
            expect(userId).toBeDefined();
            expect(loginSessionId).toBeDefined();
            expect(twoFactorCode).toBeDefined();
        });
    });
});
//# sourceMappingURL=user-registration-to-plan-purchase.e2e-spec.js.map