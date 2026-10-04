/**
 * S2-T02 — RecalculateMarketplaceScore Cron
 *
 * Job diario 03:00 BRT que recalcula score de todas as startups APPROVED
 * via ScoreCalculatorService.recalculateAll().
 *
 * Lock distribuido Redis SET NX EX 1800 (30min) para evitar corrida em
 * multi-instancia. Listener de outlier (S2-T02.4) cria AuditLog + email DPO.
 *
 * Em staging: validar via POST /internal/admin/recalculate-scores com
 * X-Internal-Token (ver migration-marketplace-pin-spec.md §4.6).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ScoreRecalcCron } from './score-recalc.cron';
import { ScoreCalculatorService } from './score-calculator.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/email/email.service';

const silentLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
  setLogLevels: jest.fn(),
} as unknown as Logger;

describe('ScoreRecalcCron — lock Redis + recalc (S2-T02)', () => {
  let cron: ScoreRecalcCron;
  let scoreCalculator: any;
  let prisma: any;
  let emailService: any;
  let redis: any;

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    scoreCalculator = {
      recalculateAll: jest.fn().mockResolvedValue({ total: 0, outliers: 0 }),
    };
    prisma = {
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    emailService = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreRecalcCron,
        { provide: ScoreCalculatorService, useValue: scoreCalculator },
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: 'default_IORedisModuleConnectionToken', useValue: redis },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();

    cron = module.get(ScoreRecalcCron);
  });

  it('adquire lock Redis com SET NX EX antes de recalcular', async () => {
    await cron.handleCron();
    expect(redis.set).toHaveBeenCalledWith(
      'lock:recalculate:marketplace-scores',
      expect.any(String),
      'EX',
      1800,
      'NX',
    );
    expect(scoreCalculator.recalculateAll).toHaveBeenCalled();
  });

  it('libera lock Redis apos recalcular (DEL)', async () => {
    await cron.handleCron();
    expect(redis.del).toHaveBeenCalledWith(
      'lock:recalculate:marketplace-scores',
    );
  });

  it('NAO recalcula se lock ja esta adquirido (segunda instancia)', async () => {
    redis.set.mockResolvedValueOnce(null);

    await cron.handleCron();

    expect(scoreCalculator.recalculateAll).not.toHaveBeenCalled();
  });

  it('libera lock mesmo se recalculateAll lanca erro', async () => {
    scoreCalculator.recalculateAll.mockRejectedValueOnce(new Error('boom'));

    await expect(cron.handleCron()).rejects.toThrow('boom');
    expect(redis.del).toHaveBeenCalledWith(
      'lock:recalculate:marketplace-scores',
    );
  });

  it('listener de outliers cria AuditLog com action=SCORE_RECALCULATED', async () => {
    await (cron as any).handleOutlier({
      startupId: 42,
      before: 20,
      after: 80,
      delta: 60,
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'SCORE_RECALCULATED',
          entity: 'Startup',
          entityId: '42',
          oldValue: { score: 20 } as any,
          newValue: { score: 80, delta: 60 } as any,
        }),
      }),
    );
  });

  it('listener de outliers envia email DPO quando delta >= 30pts', async () => {
    await (cron as any).handleOutlier({
      startupId: 42,
      before: 20,
      after: 80,
      delta: 60,
    });

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: expect.stringContaining('@'),
        subject: expect.stringMatching(/outlier|marketplace/i),
      }),
    );
  });

  it('NAO envia email DPO quando delta < 30pts (apenas AuditLog)', async () => {
    await (cron as any).handleOutlier({
      startupId: 42,
      before: 50,
      after: 55,
      delta: 5,
    });

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
});
