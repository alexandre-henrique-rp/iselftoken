import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../common/audit/audit.service';
import { SessionService } from '../../auth/session/session.service';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SealsService } from '../seals/seals.service';
import { S3Service } from '../../s3/s3.service';
import { AdminService } from './admin.service';

describe('AdminService.incrementStartupScore', () => {
  let service: AdminService;
  const prisma = {
    startup: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    startupReviewDecision: {
      findFirst: jest.fn(),
    },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const eventEmitter = { emit: jest.fn() };

  const adminContext = {
    adminUserId: 1,
    adminName: 'Admin Test',
    ip: '127.0.0.1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: SealsService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: AuditService, useValue: audit },
        {
          provide: SessionService,
          useValue: { refreshUserProfile: jest.fn().mockResolvedValue(0) },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: S3Service, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(AdminService);
  });

  it('rejeita delta = 0', async () => {
    const r: any = await service.incrementStartupScore(
      1,
      0,
      undefined,
      adminContext,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(400);
    expect(prisma.startup.findUnique).not.toHaveBeenCalled();
  });

  it('rejeita delta > 100', async () => {
    const r: any = await service.incrementStartupScore(
      1,
      150,
      undefined,
      adminContext,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(400);
  });

  it('rejeita delta < -100', async () => {
    const r: any = await service.incrementStartupScore(
      1,
      -150,
      undefined,
      adminContext,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(400);
  });

  it('rejeita delta não-inteiro', async () => {
    const r: any = await service.incrementStartupScore(
      1,
      10.5,
      undefined,
      adminContext,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(400);
  });

  it('retorna 404 se startup não existe', async () => {
    prisma.startup.findUnique.mockResolvedValue(null);
    const r: any = await service.incrementStartupScore(
      999,
      10,
      undefined,
      adminContext,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(404);
  });

  it('retorna 403 se Fase 3 não aprovada (REJECTED)', async () => {
    prisma.startup.findUnique.mockResolvedValue({ id: 1, score: 50 });
    prisma.startupReviewDecision.findFirst.mockResolvedValue({
      decision: 'REJECTED',
    });
    const r: any = await service.incrementStartupScore(
      1,
      10,
      undefined,
      adminContext,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(403);
    expect(prisma.startup.update).not.toHaveBeenCalled();
  });

  it('retorna 403 se Fase 3 sem decisão', async () => {
    prisma.startup.findUnique.mockResolvedValue({ id: 1, score: 50 });
    prisma.startupReviewDecision.findFirst.mockResolvedValue(null);
    const r: any = await service.incrementStartupScore(
      1,
      10,
      undefined,
      adminContext,
    );
    expect(r.error).toBe(true);
    expect(r.codigo).toBe(403);
  });

  it('incrementa score happy path e audita', async () => {
    prisma.startup.findUnique.mockResolvedValue({ id: 1, score: 50 });
    prisma.startupReviewDecision.findFirst.mockResolvedValue({
      decision: 'APPROVED',
    });
    prisma.startup.update.mockResolvedValue({ id: 1, nome: 'X', score: 60 });

    const r: any = await service.incrementStartupScore(
      1,
      10,
      'Performance Q3 validada',
      adminContext,
    );

    expect(r.error).toBe(false);
    expect(r.data.score).toBe(60);
    expect(r.data.previousScore).toBe(50);
    expect(r.data.appliedDelta).toBe(10);
    expect(r.data.reason).toBe('Performance Q3 validada');

    expect(prisma.startup.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { score: 60 },
      select: { id: true, nome: true, score: true },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        action: 'STARTUP_SCORE_INCREMENTED',
        entity: 'Startup',
        entityId: '1',
        oldValue: { score: 50 },
        newValue: { score: 60, delta: 10 },
        ip: '127.0.0.1',
      }),
    );
  });

  it('clampa em 100 quando delta estoura limite superior', async () => {
    prisma.startup.findUnique.mockResolvedValue({ id: 1, score: 90 });
    prisma.startupReviewDecision.findFirst.mockResolvedValue({
      decision: 'APPROVED',
    });
    prisma.startup.update.mockResolvedValue({ id: 1, nome: 'X', score: 100 });

    const r: any = await service.incrementStartupScore(
      1,
      20,
      undefined,
      adminContext,
    );

    expect(r.data.score).toBe(100);
    expect(r.data.appliedDelta).toBe(10); // 20 solicitado, 10 aplicado (90→100)
  });

  it('clampa em 0 quando delta estoura limite inferior', async () => {
    prisma.startup.findUnique.mockResolvedValue({ id: 1, score: 5 });
    prisma.startupReviewDecision.findFirst.mockResolvedValue({
      decision: 'APPROVED',
    });
    prisma.startup.update.mockResolvedValue({ id: 1, nome: 'X', score: 0 });

    const r: any = await service.incrementStartupScore(
      1,
      -20,
      undefined,
      adminContext,
    );

    expect(r.data.score).toBe(0);
    expect(r.data.appliedDelta).toBe(-5); // -20 solicitado, -5 aplicado (5→0)
  });

  it('aceita delta negativo (decremento) com Fase 3 aprovada', async () => {
    prisma.startup.findUnique.mockResolvedValue({ id: 1, score: 80 });
    prisma.startupReviewDecision.findFirst.mockResolvedValue({
      decision: 'APPROVED',
    });
    prisma.startup.update.mockResolvedValue({ id: 1, nome: 'X', score: 70 });

    const r: any = await service.incrementStartupScore(
      1,
      -10,
      'KPI abaixo do esperado',
      adminContext,
    );

    expect(r.data.score).toBe(70);
    expect(r.data.appliedDelta).toBe(-10);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        newValue: { score: 70, delta: -10 },
      }),
    );
  });
});
