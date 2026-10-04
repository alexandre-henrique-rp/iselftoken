/**
 * S5-T02 — InternalAdminController — testes
 *
 * Cobre:
 *   - 503 quando INTERNAL_ADMIN_TOKEN nao configurado
 *   - 403 quando X-Internal-Token ausente ou invalido
 *   - 202 quando token bate; recalculateAll e chamado
 *   - 500 quando recalculateAll lanca erro
 */

import {
  ForbiddenException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalAdminController } from './internal-admin.controller';
import { ScoreCalculatorService } from './score-calculator.service';
import { ScoreRecalcCron } from './score-recalc.cron';

describe('InternalAdminController — /internal/admin/recalculate-scores (S5-T02)', () => {
  let controller: InternalAdminController;
  let scoreCalculator: any;
  let scoreRecalcCron: any;
  const ORIGINAL_TOKEN = process.env.INTERNAL_ADMIN_TOKEN;

  beforeEach(async () => {
    scoreCalculator = {
      recalculateAll: jest.fn().mockResolvedValue({ total: 5, outliers: 1 }),
    };
    scoreRecalcCron = {
      handleCron: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InternalAdminController],
      providers: [
        { provide: ScoreCalculatorService, useValue: scoreCalculator },
        { provide: ScoreRecalcCron, useValue: scoreRecalcCron },
      ],
    }).compile();

    controller = module.get(InternalAdminController);
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) {
      delete process.env.INTERNAL_ADMIN_TOKEN;
    } else {
      process.env.INTERNAL_ADMIN_TOKEN = ORIGINAL_TOKEN;
    }
  });

  it('retorna 503 quando INTERNAL_ADMIN_TOKEN nao configurado', async () => {
    delete process.env.INTERNAL_ADMIN_TOKEN;

    await expect(controller.recalculateScores('any-token')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('retorna 403 quando X-Internal-Token ausente', async () => {
    process.env.INTERNAL_ADMIN_TOKEN = 'secret-token';

    await expect(controller.recalculateScores(undefined)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('retorna 403 quando X-Internal-Token invalido', async () => {
    process.env.INTERNAL_ADMIN_TOKEN = 'secret-token';

    await expect(controller.recalculateScores('wrong-token')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('retorna 202 + chama cron handler quando token bate', async () => {
    process.env.INTERNAL_ADMIN_TOKEN = 'secret-token';

    const result = await controller.recalculateScores('secret-token');

    expect(result.status).toBe('accepted');
    expect(scoreRecalcCron.handleCron).toHaveBeenCalled();
  });

  it('retorna 500 quando cron handler lanca erro', async () => {
    process.env.INTERNAL_ADMIN_TOKEN = 'secret-token';
    scoreRecalcCron.handleCron.mockRejectedValueOnce(new Error('boom'));

    await expect(controller.recalculateScores('secret-token')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
