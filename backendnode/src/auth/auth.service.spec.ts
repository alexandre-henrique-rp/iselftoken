import { HttpException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../common/audit/audit.service';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { CookiesService } from './cookies/cookies.service';
import { LoginAlertService } from './services/login-alert.service';
import { LoginLockoutService } from './services/login-lockout.service';
import { SessionService } from './session/session.service';

jest.mock('@sentry/nestjs', () => ({
  startSpan: (_opts: unknown, cb: () => unknown) => cb(),
  setTag: jest.fn(),
  setUser: jest.fn(),
  captureException: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    id: 1,
    publicId: 'pub-1',
    email: 'joao@test.com',
    nome: 'João Silva',
    role: 'USER',
    isActive: true,
    requirePasswordReset: false,
    senha: '',
    telefone: null,
    data_nascimento: null,
    genero: null,
    endereco: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: 'São Paulo',
    uf: 'SP',
    cep: null,
    pais: null,
    termosAceitos: true,
    politicaAceita: true,
    tipo_documento: null,
    reg_documento: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    wallet: null,
    payments: [],
    subscriptions: [],
    startups: [],
    investments: [],
    tokens: [],
    tokenHistory: [],
    auditLogs: [],
    avatar: null,
    comprovante: null,
    documento: null,
    biofacial: null,
  };

  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    accessLog: {
      create: jest.fn(),
    },
  };

  const mockSession = {
    createSession: jest.fn(),
    getSession: jest.fn(),
    storeVerificationCode: jest.fn(),
    deleteVerificationCode: jest.fn(),
    verifyCode: jest.fn(),
    verify2FA: jest.fn(),
    deleteSession: jest.fn(),
  };

  const mockCookies = {
    setCookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  const mockEmail = {
    sendVerificationCodeEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

  const mockJwt = {
    sign: jest.fn(() => 'jwt-token'),
    verify: jest.fn(),
  };

  const mockLockout = {
    getLockTTL: jest.fn().mockResolvedValue(0),
    incrementFailures: jest.fn().mockResolvedValue({
      locked: false,
      severity: null,
      lockSeconds: 0,
      failedAttempts: 1,
      skipped: false,
    }),
    clearOnSuccess: jest.fn().mockResolvedValue(undefined),
  };

  const mockLoginAlert = {
    checkAndAlert: jest.fn().mockResolvedValue({
      isNewDevice: false,
      isAnomalousGeo: false,
      alerted: false,
      reason: 'known_device',
      fingerprint: 'abc123',
      geo: null,
    }),
    markDeviceAsKnown: jest.fn().mockResolvedValue(undefined),
    recordLastKnownCountry: jest.fn().mockResolvedValue(undefined),
  };

  const mockAudit = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SessionService, useValue: mockSession },
        { provide: CookiesService, useValue: mockCookies },
        { provide: EmailService, useValue: mockEmail },
        { provide: JwtService, useValue: mockJwt },
        { provide: LoginLockoutService, useValue: mockLockout },
        { provide: LoginAlertService, useValue: mockLoginAlert },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forgotPassword', () => {
    it('deve informar quando o e-mail não foi localizado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'inexistente@test.com' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({
          message: 'e-mail não foi localizado.',
        }),
        status: 404,
      });
    });
  });

  describe('login', () => {
    it('deve autenticar usuário válido e enviar código 2FA', async () => {
      const hashed = await bcrypt.hash('senha123', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        senha: hashed,
      });
      mockPrisma.accessLog.create.mockResolvedValue({});
      mockSession.createSession.mockResolvedValue(undefined);
      mockSession.storeVerificationCode.mockResolvedValue(undefined);
      mockEmail.sendVerificationCodeEmail.mockResolvedValue(undefined);

      const req = {
        ip: '127.0.0.1',
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'user-agent': 'jest-agent' },
      } as any;

      const result = await service.login(
        {
          email: 'joao@test.com',
          senha: 'senha123',
          urlRedirect: '/plans',
        },
        req,
      );

      expect(result.error).toBe(false);
      expect(result.data?.requiresVerification).toBe(true);
      expect(result.data?.email).toBe('joao@test.com');
      expect(mockEmail.sendVerificationCodeEmail).toHaveBeenCalled();
      expect(mockSession.createSession).toHaveBeenCalled();
      expect(mockPrisma.accessLog.create).not.toHaveBeenCalled();
    });

    it('deve rejeitar o login quando o código 2FA não puder ser enviado', async () => {
      const hashed = await bcrypt.hash('senha123', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        senha: hashed,
      });
      mockSession.createSession.mockResolvedValue(undefined);
      mockSession.storeVerificationCode.mockResolvedValue(undefined);
      mockEmail.sendVerificationCodeEmail.mockResolvedValue({
        success: false,
        message: 'Transporte SMTP não configurado',
      });

      let httpErr: HttpException | undefined;
      try {
        await service.login({ email: 'joao@test.com', senha: 'senha123' }, {
          ip: '127.0.0.1',
          headers: {},
        } as any);
      } catch (error) {
        httpErr = error as HttpException;
      }

      expect(httpErr).toBeInstanceOf(HttpException);
      expect(httpErr!.getStatus()).toBe(503);
      expect(httpErr!.getResponse()).toMatchObject({
        message:
          'Não foi possível enviar o código de verificação. Tente novamente.',
      });
      expect(mockSession.deleteVerificationCode).toHaveBeenCalled();
      expect(mockSession.deleteSession).toHaveBeenCalled();
    });

    it('deve lançar 401 quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'inexistente@test.com', senha: 'qualquer' }),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 401 quando usuário está inativo', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      await expect(
        service.login({ email: 'joao@test.com', senha: 'qualquer' }),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 401 com mensagem específica "Conta suspensa" quando usuário existe e isActive=false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      let httpErr: HttpException | undefined;
      try {
        await service.login({ email: 'joao@test.com', senha: 'qualquer' });
      } catch (err) {
        httpErr = err as HttpException;
      }

      expect(httpErr).toBeInstanceOf(HttpException);
      const body = httpErr!.getResponse() as { message: string };
      expect(httpErr!.getStatus()).toBe(401);
      expect(body.message).toMatch(/Conta suspensa/i);
      expect(body.message).toMatch(/suporte/i);
    });

    it('deve lançar 401 com mensagem GENÉRICA quando usuário NÃO existe (não revela enumeração)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      let httpErr: HttpException | undefined;
      try {
        await service.login({
          email: 'inexistente@test.com',
          senha: 'qualquer',
        });
      } catch (err) {
        httpErr = err as HttpException;
      }

      const body = httpErr!.getResponse() as { message: string };
      expect(httpErr!.getStatus()).toBe(401);
      expect(body.message).toMatch(/Credenciais inválidas/i);
      expect(body.message).not.toMatch(/suspensa/i);
    });

    it('deve lançar 401 com mensagem GENÉRICA quando senha está incorreta (independente de isActive)', async () => {
      const hashed = await bcrypt.hash('senha-correta', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        senha: hashed,
        isActive: true,
      });

      let httpErr: HttpException | undefined;
      try {
        await service.login({ email: 'joao@test.com', senha: 'senha-errada' });
      } catch (err) {
        httpErr = err as HttpException;
      }

      const body = httpErr!.getResponse() as { message: string };
      expect(httpErr!.getStatus()).toBe(401);
      expect(body.message).toMatch(/Credenciais inválidas/i);
    });

    it('deve chamar bcrypt mesmo com isActive=false (timing-safe contra enumeração)', async () => {
      const hashed = await bcrypt.hash('senha-correta', 4);
      const bcryptCompareSpy = jest.spyOn(bcrypt, 'compare');
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        senha: hashed,
        isActive: false,
      });

      try {
        await service.login({ email: 'joao@test.com', senha: 'qualquer' });
      } catch {
        // esperado
      }

      // M1+M2: bcrypt deve rodar mesmo para user inativo (anti-enumeração).
      // Sem isso, atacante distingue "email existe, conta inativa" de
      // "email nao existe" por latência.
      expect(bcryptCompareSpy).toHaveBeenCalled();
    });

    it('deve lançar 401 quando senha está incorreta', async () => {
      const hashed = await bcrypt.hash('senha-correta', 4);
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        senha: hashed,
      });
      await expect(
        service.login({ email: 'joao@test.com', senha: 'senha-errada' }),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 401 quando senha é null no banco', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        senha: null,
      });
      await expect(
        service.login({ email: 'joao@test.com', senha: 'qualquer' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('create (registro)', () => {
    const validDto = {
      email: 'novo@test.com',
      nome: 'Novo User',
      senha: 'Senha123',
      senhaConfirmacao: 'Senha123',
      telefone: '11999998888',
      termosAceitos: true,
      politicaAceita: true,
      urlRedirect: '/plans',
    };

    it('deve criar usuário válido e enviar email de boas-vindas', async () => {
      // 1ª chamada: checagem de existencia (deve retornar null = email livre)
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      // 2ª chamada: lookup pos-criacao para popular a sessao publica
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        id: 2,
        email: validDto.email,
        nome: validDto.nome,
      });

      // $transaction em AuthService.create executa o callback com `tx`,
      // onde `tx.user.create` e `tx.wallet.create` rodam atomicamente.
      const txMock = {
        user: {
          create: jest.fn().mockResolvedValue({
            id: 2,
            email: validDto.email,
            nome: validDto.nome,
            role: 'USER',
            isActive: true,
            createdAt: new Date(),
          }),
        },
        wallet: {
          create: jest.fn().mockResolvedValue({
            id: 1,
            balance: 0,
            blocked: 0,
            currency: 'BRL',
          }),
        },
      };
      mockPrisma.$transaction = jest
        .fn()
        .mockImplementation(async (cb: (tx: any) => unknown) => cb(txMock));

      mockSession.createSession.mockResolvedValue(undefined);
      mockEmail.sendWelcomeEmail.mockResolvedValue(undefined);
      mockEmail.sendVerificationCodeEmail.mockResolvedValue(undefined);

      const result = await service.create(validDto);

      expect(result.error).toBe(false);
      expect(result.message).toContain('sucesso');
      expect(mockEmail.sendVerificationCodeEmail).toHaveBeenCalledWith(
        validDto.email,
        validDto.nome,
        expect.stringMatching(/^\d{6}$/),
        'validar seu email',
        validDto.urlRedirect,
      );
      const verificationCode =
        mockEmail.sendVerificationCodeEmail.mock.calls[0][2];
      expect(mockSession.storeVerificationCode).toHaveBeenCalledWith(
        expect.any(String),
        verificationCode,
        300,
      );
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(txMock.user.create).toHaveBeenCalled();
      expect(txMock.wallet.create).toHaveBeenCalled();
      // E que o payload publico foi gravado no Redis (helper usado)
      expect(mockSession.createSession).toHaveBeenCalled();
    });

    it('deve ignorar código de verificação enviado pelo cliente', async () => {
      const dtoWithClientCode = {
        ...validDto,
        email: 'outro-usuario@test.com',
        codigo: '123456',
      };
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        id: 3,
        email: dtoWithClientCode.email,
        nome: dtoWithClientCode.nome,
      });

      const txMock = {
        user: {
          create: jest.fn().mockResolvedValue({
            id: 3,
            email: dtoWithClientCode.email,
            nome: dtoWithClientCode.nome,
            role: 'USER',
            isActive: true,
            createdAt: new Date(),
          }),
        },
        wallet: {
          create: jest.fn().mockResolvedValue({
            id: 2,
            balance: 0,
            blocked: 0,
            currency: 'BRL',
          }),
        },
      };
      mockPrisma.$transaction = jest
        .fn()
        .mockImplementation(async (cb: (tx: any) => unknown) => cb(txMock));
      mockSession.createSession.mockResolvedValue(undefined);
      mockEmail.sendWelcomeEmail.mockResolvedValue(undefined);
      mockEmail.sendVerificationCodeEmail.mockResolvedValue(undefined);
      const randomIntSpy = jest
        .spyOn(service as any, 'generateVerificationCode')
        .mockReturnValue('654321');

      try {
        await service.create(dtoWithClientCode);

        expect(mockEmail.sendVerificationCodeEmail).toHaveBeenCalledWith(
          dtoWithClientCode.email,
          dtoWithClientCode.nome,
          '654321',
          'validar seu email',
          dtoWithClientCode.urlRedirect,
        );
        expect(mockSession.storeVerificationCode).toHaveBeenCalledWith(
          expect.any(String),
          '654321',
          300,
        );
      } finally {
        randomIntSpy.mockRestore();
      }
    });

    it('deve rejeitar email já cadastrado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(service.create(validDto)).rejects.toThrow(HttpException);
    });

    it('deve rejeitar senhas que não coincidem', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ ...validDto, senhaConfirmacao: 'Outra123' }),
      ).rejects.toThrow(HttpException);
    });

    it('deve rejeitar senha fraca (sem maiúscula ou número)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({
          ...validDto,
          senha: 'fraca123',
          senhaConfirmacao: 'fraca123',
        }),
      ).rejects.toThrow(HttpException);
      await expect(
        service.create({
          ...validDto,
          senha: 'Senhafraca',
          senhaConfirmacao: 'Senhafraca',
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('verifyCode', () => {
    it('deve retornar sucesso quando código é válido', async () => {
      mockSession.verifyCode.mockResolvedValue(true);
      mockSession.verify2FA.mockResolvedValue(undefined);

      const result = await service.verifyCode('session-abc', '123456');

      expect(result.error).toBe(false);
      expect(result.data?.af2Verified).toBe(true);
      expect(mockSession.verify2FA).toHaveBeenCalledWith('session-abc');
    });

    it('deve lançar 401 quando código é inválido', async () => {
      mockSession.verifyCode.mockResolvedValue(false);
      await expect(service.verifyCode('session-abc', 'errado')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('newcode', () => {
    it('deve enviar novo código quando usuário existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockSession.deleteVerificationCode.mockResolvedValue(undefined);
      mockSession.storeVerificationCode.mockResolvedValue(undefined);
      mockEmail.sendVerificationCodeEmail.mockResolvedValue(undefined);

      const result = await service.newcode(
        { email: 'joao@test.com', urlRedirect: '/plans' },
        'session-abc',
      );

      expect(result.error).toBe(false);
      expect(mockEmail.sendVerificationCodeEmail).toHaveBeenCalled();
    });

    it('deve lançar 404 quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.newcode({ email: 'inexistente@test.com' }, 'session-abc'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('requestCode', () => {
    it('deve enviar código para usuário válido', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockSession.deleteVerificationCode.mockResolvedValue(undefined);
      mockSession.storeVerificationCode.mockResolvedValue(undefined);
      mockEmail.sendVerificationCodeEmail.mockResolvedValue(undefined);

      const result = await service.requestCode(
        { email: 'joao@test.com', urlRedirect: '/plans' },
        'session-abc',
      );

      expect(result.error).toBe(false);
    });

    it('deve lançar 404 quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.requestCode(
          { email: 'inexistente@test.com', urlRedirect: '/plans' },
          'session-abc',
        ),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('validatePassword', () => {
    it('deve retornar true para senha correta', async () => {
      const hashed = await bcrypt.hash('senha123', 4);
      const ok = await service.validatePassword('senha123', { senha: hashed });
      expect(ok).toBe(true);
    });

    it('deve retornar false para senha incorreta', async () => {
      const hashed = await bcrypt.hash('senha123', 4);
      const ok = await service.validatePassword('errada', { senha: hashed });
      expect(ok).toBe(false);
    });
  });

  describe('getMe', () => {
    it('deve retornar dados do usuário autenticado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'joao@test.com',
        nome: 'João Silva',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
      });
      const result = await service.getMe({ id: '1' });
      expect(result.error).toBe(false);
      expect(result.data?.id).toBe(1);
    });

    it('deve lançar 404 quando usuário não existe', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMe({ id: '999' })).rejects.toThrow(HttpException);
    });
  });
});
