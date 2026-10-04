/**
 * Testes de integracao HTTP para UploadsController.
 *
 * Testa todos os endpoints via supertest:
 * - POST /uploads -> 200 OK síncrono
 * - GET /uploads -> 200 listagem
 * - GET /uploads/:id -> 200 detalhes
 * - DELETE /uploads/:id -> 403/204
 *
 * @see T34
 */
import {
  INestApplication,
  NestMiddleware,
  PayloadTooLargeException,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NextFunction, Request, Response } from 'express';
import * as request from 'supertest';
import { AuthGuard } from '../../auth/auth.guard';
import { CookiesService } from '../../auth/cookies/cookies.service';
import { SessionService } from '../../auth/session/session.service';
import { UserPlanHelper } from './helpers/user-plan.helper';
import { QuotaService, UserPlan } from './services/quota.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/** Middleware that maps x-user-id/x-user-role headers to req.user for testing */
class TestUserMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const userId = req.headers['x-user-id'] as string | undefined;
    const userRole = req.headers['x-user-role'] as string | undefined;
    if (userId) {
      (req as any).user = {
        id: parseInt(userId, 10),
        role: userRole || 'USER',
      };
    }
    next();
  }
}

jest.setTimeout(30_000);

describe('UploadsController (Integration)', () => {
  let app: INestApplication;
  let uploadsService: any;
  let quotaService: jest.Mocked<QuotaService>;
  let userPlanHelper: jest.Mocked<UserPlanHelper>;

  const mockUpload = {
    id: 1,
    publicId: 'test-public-id-123',
    userId: 1,
    startupId: null,
    type: 'image',
    mimeType: 'image/jpeg',
    originalName: 'test.jpg',
    size: 1024,
    extension: 'jpg',
    bucket: 'image',
    key: 'abc123sha256.jpg',
    sha256: 'abc123sha256',
    variants: null,
    status: 'READY',
    applicancy: 'APPLICABLE',
    rejectionReason: null,
    url: 'https://storage.test/image/original.jpg',
    url_md: 'https://storage.test/image-md/original.webp',
    url_web: 'https://storage.test/image-sm/original.webp',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockUploadsService = {
      create: jest.fn(),
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByUser: jest.fn(),
      findByStartup: jest.fn(),
      remove: jest.fn(),
    };

    const mockQuotaService = {
      checkQuota: jest.fn().mockResolvedValue(undefined),
      getUsage: jest.fn(),
      getUserLimits: jest.fn(),
    } as unknown as jest.Mocked<QuotaService>;

    const mockUserPlanHelper = {
      getPlan: jest.fn().mockResolvedValue(UserPlan.FREE),
      invalidate: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<UserPlanHelper>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [UploadsController],
      providers: [
        { provide: UploadsService, useValue: mockUploadsService },
        { provide: QuotaService, useValue: mockQuotaService },
        { provide: UserPlanHelper, useValue: mockUserPlanHelper },
        {
          provide: CookiesService,
          useValue: {
            getSessionId: jest.fn(
              (req: Request) =>
                (req.headers['x-user-id'] as string | undefined) ?? undefined,
            ),
          },
        },
        {
          provide: SessionService,
          useValue: {
            getSession: jest.fn(async (sessionId: string) => ({
              id: Number(sessionId),
            })),
          },
        },
        {
          provide: ThrottlerGuard,
          useClass: class extends ThrottlerGuard {
            protected getReqResp(req: any) {
              return { req, res: {} };
            }
          },
        },
        Reflector,
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    // Apply test middleware to map x-user-* headers to req.user
    app.use(new TestUserMiddleware().use);
    await app.init();

    uploadsService = module.get(UploadsService);
    quotaService = module.get(QuotaService);
    userPlanHelper = module.get(UserPlanHelper);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /uploads', () => {
    it('deve retornar 200 ao fazer upload síncrono com sucesso', async () => {
      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'test-public-id-123',
        status: 'READY',
        sha256: 'abc123sha256',
      });

      const response = await request(app.getHttpServer())
        .post('/uploads')
        .attach('file', Buffer.from('test image'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .field('userId', '1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.publicId).toBe('test-public-id-123');
    });

    it('deve retornar 400 quando arquivo nao enviado', async () => {
      const response = await request(app.getHttpServer())
        .post('/uploads')
        .field('userId', '1');

      expect(response.status).toBe(400);
    });

    it('deve retornar 400 quando MIME nao permitido', async () => {
      const response = await request(app.getHttpServer())
        .post('/uploads')
        .attach('file', Buffer.from('executable'), {
          filename: 'malware.exe',
          contentType: 'application/x-msdownload',
        });

      expect(response.status).toBe(400);
    });

    it('deve chamar create com userId correto', async () => {
      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'test-public-id-123',
        status: 'READY',
        sha256: 'abc123sha256',
      });

      await request(app.getHttpServer())
        .post('/uploads')
        .attach('file', Buffer.from('test'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .set('x-user-id', '42');

      expect(uploadsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ mimetype: 'image/jpeg' }),
        42,
      );
    });

    it('deve chamar QuotaService.checkQuota com plano FREE quando userId via query', async () => {
      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'pub',
        status: 'READY',
      });

      await request(app.getHttpServer())
        .post('/uploads')
        .attach('file', Buffer.from('test'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .set('x-user-id', '7');

      expect(userPlanHelper.getPlan).toHaveBeenCalledWith(7);
      expect(quotaService.checkQuota).toHaveBeenCalledWith(
        7,
        undefined,
        expect.any(Number),
        UserPlan.FREE,
      );
    });

    it('deve chamar QuotaService.checkQuota com plano PRO', async () => {
      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'pub',
        status: 'READY',
      });
      userPlanHelper.getPlan.mockResolvedValueOnce(UserPlan.PRO);

      await request(app.getHttpServer())
        .post('/uploads')
        .attach('file', Buffer.from('test'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .set('x-user-id', '8');

      expect(userPlanHelper.getPlan).toHaveBeenCalledWith(8);
      expect(quotaService.checkQuota).toHaveBeenCalledWith(
        8,
        undefined,
        expect.any(Number),
        UserPlan.PRO,
      );
    });

    it('deve priorizar req.user.id sobre query.userId (auth > query)', async () => {
      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'pub',
        status: 'READY',
      });

      // x-user-id=99 (auth) vs query.userId=42 (fallback)
      await request(app.getHttpServer())
        .post('/uploads')
        .set('x-user-id', '99')
        .attach('file', Buffer.from('test'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .query({ userId: '42' });

      expect(userPlanHelper.getPlan).toHaveBeenCalledWith(99);
      expect(uploadsService.create).toHaveBeenCalledWith(
        expect.any(Object),
        99,
      );
    });

    it('deve pular quota quando nem auth nem query.userId estao presentes', async () => {
      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'pub',
        status: 'READY',
      });

      await request(app.getHttpServer())
        .post('/uploads')
        .attach('file', Buffer.from('test'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        });

      expect(userPlanHelper.getPlan).not.toHaveBeenCalled();
      expect(quotaService.checkQuota).not.toHaveBeenCalled();
      expect(uploadsService.create).toHaveBeenCalledWith(
        expect.any(Object),
        undefined,
      );
    });

    it('deve retornar 413 quando QuotaService lanca PayloadTooLargeException', async () => {
      quotaService.checkQuota.mockRejectedValueOnce(
        new PayloadTooLargeException('Limite de uploads atingido: 50/50'),
      );

      const response = await request(app.getHttpServer())
        .post('/uploads')
        .attach('file', Buffer.from('test'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .set('x-user-id', '1');

      expect(response.status).toBe(413);
      expect(response.body.message).toContain('Limite de uploads atingido');
      expect(uploadsService.create).not.toHaveBeenCalled();
    });

    it('deve retornar 413 com mensagem em PT-BR quando limite de storage excedido', async () => {
      quotaService.checkQuota.mockRejectedValueOnce(
        new PayloadTooLargeException(
          'Limite de storage excedido: 0.49GB usado de 0.49GB',
        ),
      );

      const response = await request(app.getHttpServer())
        .post('/uploads')
        .attach('file', Buffer.from('test'), {
          filename: 'test.jpg',
          contentType: 'image/jpeg',
        })
        .set('x-user-id', '1');

      expect(response.status).toBe(413);
      expect(response.body.message).toContain('Limite de storage excedido');
    });

    it('deve completar 50 uploads FREE e o 51o retornar 413 (Cenário PRD §9)', async () => {
      // Simula FREE que atinge limite de 50 uploads/hora
      const quotaServiceError = new PayloadTooLargeException(
        'Limite de uploads atingido: 50/50',
      );

      uploadsService.create.mockResolvedValue({
        id: 1,
        publicId: 'pub',
        status: 'READY',
      });

      // Sequência: 50x OK + 1x 413. Serial para evitar ECONNRESET do supertest.
      const responses: request.Response[] = [];
      for (let i = 0; i < 51; i++) {
        if (i < 50) {
          quotaService.checkQuota.mockResolvedValueOnce(undefined);
        } else {
          quotaService.checkQuota.mockRejectedValueOnce(quotaServiceError);
        }
        responses.push(
          await request(app.getHttpServer())
            .post('/uploads')
            .attach('file', Buffer.from('test'), {
              filename: 'test.jpg',
              contentType: 'image/jpeg',
            })
            .set('x-user-id', '100'),
        );
      }

      const successCount = responses.filter((r) => r.status === 200).length;
      const blockedCount = responses.filter((r) => r.status === 413).length;

      expect(successCount).toBe(50);
      expect(blockedCount).toBe(1);
      expect(responses[50].body.message).toContain(
        'Limite de uploads atingido',
      );
    });
  });

  describe('GET /uploads', () => {
    it('deve retornar 200 com lista paginada', async () => {
      uploadsService.findAll.mockResolvedValue({
        data: [mockUpload],
        total: 1,
        page: 1,
        limit: 10,
      });

      const response = await request(app.getHttpServer())
        .get('/uploads')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it('deve aceitar parametros de filtro', async () => {
      uploadsService.findAll.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await request(app.getHttpServer())
        .get('/uploads')
        .query({ page: 1, limit: 10, status: 'PENDING', type: 'image' });

      expect(uploadsService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: 'PENDING',
        type: 'image',
      });
    });
  });

  describe('GET /uploads/:id', () => {
    it('deve retornar 200 com detalhes do upload', async () => {
      uploadsService.findOne.mockResolvedValue(mockUpload);

      const response = await request(app.getHttpServer()).get('/uploads/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.publicId).toBe('test-public-id-123');
    });

    it('deve retornar 400 quando upload nao encontrado', async () => {
      uploadsService.findOne.mockResolvedValue(null);

      const response = await request(app.getHttpServer()).get('/uploads/999');

      expect(response.status).toBe(400);
    });
  });

  describe('GET /uploads/user/:userId', () => {
    it('deve retornar 200 com uploads do usuario', async () => {
      uploadsService.findByUser.mockResolvedValue([mockUpload]);

      const response = await request(app.getHttpServer()).get(
        '/uploads/user/1',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /uploads/startup/:startupId', () => {
    it('deve retornar 200 com uploads da startup', async () => {
      uploadsService.findByStartup.mockResolvedValue([mockUpload]);

      const response = await request(app.getHttpServer()).get(
        '/uploads/startup/1',
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('DELETE /uploads/:id', () => {
    it('deve retornar 200 quando ADMIN remove upload', async () => {
      uploadsService.remove.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete('/uploads/1')
        .set('x-user-id', '1')
        .set('x-user-role', 'ADMIN');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('deve retornar 200 quando COMPLIANCE remove upload', async () => {
      uploadsService.remove.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete('/uploads/1')
        .set('x-user-id', '1')
        .set('x-user-role', 'COMPLIANCE');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('deve retornar 400 quando usuario sem role apropriada tenta remover', async () => {
      const response = await request(app.getHttpServer())
        .delete('/uploads/1')
        .set('x-user-id', '1')
        .set('x-user-role', 'USER');

      expect(response.status).toBe(400); // BadRequestException
    });

    it('deve retornar 400 quando usuario nao autenticado', async () => {
      const response = await request(app.getHttpServer()).delete('/uploads/1');

      expect(response.status).toBe(400);
    });
  });
});
