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
const common_1 = require("@nestjs/common");
const request = __importStar(require("supertest"));
const app_module_1 = require("../../../src/app.module");
const prisma_service_1 = require("../../../src/prisma/prisma.service");
const email_service_1 = require("../../../src/email/email.service");
const db_cleanup_1 = require("./setup/db-cleanup");
const test_helpers_1 = require("./setup/test-helpers");
describe("E2E - Email de Boas-Vindas no Cadastro (T022)", () => {
    let app;
    let prisma;
    let emailService;
    let sendWelcomeEmailSpy;
    let sendVerificationCodeEmailSpy;
    let sendValidationEmailSpy;
    const TEST_EMAIL = (0, test_helpers_1.generateUniqueEmail)();
    let userId;
    let sessionId;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({ transform: true }));
        await app.init();
        prisma = app.get(prisma_service_1.PrismaService);
        emailService = app.get(email_service_1.EmailService);
        sendWelcomeEmailSpy = jest
            .spyOn(emailService, "sendWelcomeEmail")
            .mockResolvedValue({ success: true, message: "mocked" });
        sendVerificationCodeEmailSpy = jest
            .spyOn(emailService, "sendVerificationCodeEmail")
            .mockResolvedValue({ success: true, message: "mocked" });
        sendValidationEmailSpy = jest
            .spyOn(emailService, "sendValidationEmail")
            .mockResolvedValue({ success: true, message: "mocked" });
    });
    afterAll(async () => {
        if (userId) {
            const before = await (0, db_cleanup_1.countUserArtifacts)(prisma, userId);
            await (0, db_cleanup_1.cleanupTestUser)(prisma, TEST_EMAIL);
            const after = await (0, db_cleanup_1.countUserArtifacts)(prisma, userId);
            console.log(`[CLEANUP T022] User ${userId} (${TEST_EMAIL}):`);
            console.log(`  before: ${JSON.stringify(before)}`);
            console.log(`  after:  ${JSON.stringify(after)}`);
            expect(after.user).toBe(0);
        }
        sendWelcomeEmailSpy.mockRestore();
        sendVerificationCodeEmailSpy.mockRestore();
        sendValidationEmailSpy.mockRestore();
        await app.close();
    });
    describe("STEP 1: disparar welcome email no cadastro", () => {
        it("deve chamar sendWelcomeEmail com email + dados do usuario", async () => {
            sendWelcomeEmailSpy.mockClear();
            sendVerificationCodeEmailSpy.mockClear();
            sendValidationEmailSpy.mockClear();
            const registerDto = {
                email: TEST_EMAIL,
                nome: "Maria Silva",
                senha: (0, test_helpers_1.generateValidPassword)(),
                senhaConfirmacao: (0, test_helpers_1.generateValidPassword)(),
                telefone: (0, test_helpers_1.generateValidPhone)(),
                termosAceitos: true,
                politicaAceita: true,
                codigo: "123456",
                urlRedirect: "http://localhost:5173/home",
            };
            const res = await request(app.getHttpServer())
                .post("/auth/register/user")
                .send(registerDto)
                .expect(201);
            const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
            expect(user).not.toBeNull();
            userId = user.id;
            sessionId = res.body.data?.sessionId;
            expect(sendWelcomeEmailSpy).toHaveBeenCalledTimes(1);
            expect(sendWelcomeEmailSpy).toHaveBeenCalledWith(TEST_EMAIL.toLowerCase(), expect.objectContaining({
                email: TEST_EMAIL.toLowerCase(),
                nome: "Maria Silva",
            }));
            expect(sendVerificationCodeEmailSpy).toHaveBeenCalledTimes(1);
            expect(sendVerificationCodeEmailSpy).toHaveBeenCalledWith(TEST_EMAIL.toLowerCase(), "Maria Silva", "123456", expect.any(String), expect.any(String));
            expect(sendValidationEmailSpy).not.toHaveBeenCalled();
            console.log(`
      ============================================
      [T022 - WELCOME EMAIL] RELATORIO FINAL
      ============================================
      User ID criado: ${userId}
      Email: ${TEST_EMAIL}
      Session ID: ${sessionId}
      ============================================
      Emails disparados no cadastro:
      ✅ sendWelcomeEmail           (chamado 1x com email + dados)
      ✅ sendVerificationCodeEmail   (chamado 1x com codigo 2FA)
      ❌ sendValidationEmail         (NAO chamado - sem validacao automatica)
      ============================================
      `);
            expect(userId).toBeDefined();
            expect(sendWelcomeEmailSpy).toHaveBeenCalledTimes(1);
        });
    });
});
//# sourceMappingURL=welcome-email-on-register.e2e-spec.js.map