import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SKIP_SESSION_FILTER_KEY } from '../common/decorators/skip-session-filter.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SessionService } from '../auth/session/session.service';
import { JwtService } from '@nestjs/jwt';
import { CookiesService } from './cookies/cookies.service';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { AdminValidateService } from '../api/plans/services/admi-validate.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoginLockoutService } from './services/login-lockout.service';
import { LoginAlertService } from './services/login-alert.service';
import { AuditService } from '../common/audit/audit.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockEmailService = {
    sendVerificationCodeEmail: jest.fn(),
  };

  const mockSessionService = {
    getSession: jest.fn(),
    setSession: jest.fn(),
    deleteSession: jest.fn(),
    deleteUserCache: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockCookiesService = {
    setCookie: jest.fn(),
    clearCookie: jest.fn(),
    getSessionId: jest.fn(),
    clearSessionCookie: jest.fn(),
    clearTwoFaCookie: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
    getAll: jest.fn(),
  };

  const mockAuthGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [],
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: CookiesService,
          useValue: mockCookiesService,
        },
        {
          provide: LoginLockoutService,
          useValue: {
            getLockTTL: jest.fn().mockResolvedValue(0),
            incrementFailures: jest.fn().mockResolvedValue({
              locked: false,
              severity: null,
              lockSeconds: 0,
              failedAttempts: 0,
              skipped: false,
            }),
            clearOnSuccess: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: LoginAlertService,
          useValue: {
            checkAndAlert: jest.fn().mockResolvedValue({
              isNewDevice: false,
              isAnomalousGeo: false,
              alerted: false,
              reason: 'known_device',
              fingerprint: 'abc',
              geo: null,
            }),
            markDeviceAsKnown: jest.fn().mockResolvedValue(undefined),
            recordLastKnownCountry: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: AdminValidateService,
          useValue: {},
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('deve limpar os cookies de sessão ao fazer logout', async () => {
    mockCookiesService.getSessionId.mockReturnValue('session-123');

    await controller.logout({ user: { id: 42 } }, {} as any);

    expect(mockSessionService.deleteSession).toHaveBeenCalledWith(
      'session-123',
    );
    expect(mockSessionService.deleteUserCache).toHaveBeenCalledWith('42');
    expect(mockCookiesService.clearSessionCookie).toHaveBeenCalledTimes(1);
    expect(mockCookiesService.clearTwoFaCookie).toHaveBeenCalledTimes(1);
  });
});

describe('AuthController route metadata', () => {
  // Regressão: sem este decorator o AuthGuard executa applySessionFilters
  // no /check-af2; usuários sem subscription ativa são bloqueados com
  // 401+redirect=/plans, o BFF auth-status cai em isAuthenticated=false
  // e a layout loader redireciona para /login depois do 2FA.
  // Comportamento esperado: check-af2 reporta af2Verified independente
  // de plano; o ensureActivePlan do frontend é quem manda pra /pricing.
  it('checkAf2 deve ter @SkipSessionFilter() para evitar loop /login pós-2FA em usuários sem plano', () => {
    const skip = Reflect.getMetadata(
      SKIP_SESSION_FILTER_KEY,
      AuthController.prototype.checkAf2,
    );
    expect(skip).toBe(true);
  });
});
