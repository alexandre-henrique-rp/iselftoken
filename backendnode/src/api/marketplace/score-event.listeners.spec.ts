/**
 * S2-T03 — ScoreEventListeners
 *
 * Listeners granulares que recalculam score de uma startup em eventos de
 * dominio:
 *   - startup.documentUploaded       (novo doc submetido)
 *   - startup.kycStatusChanged      (KYC aprovado/rejeitado)
 *   - startup.sealAssigned          (selo atribuido)
 *   - startup.campaignStatusChanged (captacao aberta/fechada)
 *
 * Debounce 30s por startupId via Redis SET NX EX 30 (chave
 * `lock:recalc:startup:<id>`). Evita spam quando varios eventos disparam
 * em sequencia para a mesma startup.
 *
 * Cache Redis `marketplace:featured:v1` invalidado em startup.scoreUpdated
 * (via S4-T04 PinChangeListener ja cobre; aqui so recalculamos).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ScoreEventListeners } from './score-event.listeners';
import { ScoreCalculatorService } from './score-calculator.service';

const silentLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
  setLogLevels: jest.fn(),
} as unknown as Logger;

describe('ScoreEventListeners — debounce 30s por startupId (S2-T03)', () => {
  let listeners: ScoreEventListeners;
  let scoreCalculator: any;
  let redis: any;

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    scoreCalculator = {
      calculateForStartup: jest.fn().mockResolvedValue({
        score: 50,
        breakdown: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScoreEventListeners,
        { provide: ScoreCalculatorService, useValue: scoreCalculator },
        { provide: 'default_IORedisModuleConnectionToken', useValue: redis },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();

    listeners = module.get(ScoreEventListeners);
  });

  describe('debounce via Redis', () => {
    it('adquire lock Redis SET NX EX 30 antes de recalcular', async () => {
      await listeners.onStartupChange({ startupId: 7 });
      expect(redis.set).toHaveBeenCalledWith(
        'lock:recalc:startup:7',
        expect.any(String),
        'EX',
        30,
        'NX',
      );
      expect(scoreCalculator.calculateForStartup).toHaveBeenCalledWith(7);
    });

    it('NAO recalcula se lock ja adquirido (debounce)', async () => {
      redis.set.mockResolvedValueOnce(null);

      await listeners.onStartupChange({ startupId: 7 });

      expect(scoreCalculator.calculateForStartup).not.toHaveBeenCalled();
    });

    it('libera lock apos recalcular', async () => {
      await listeners.onStartupChange({ startupId: 7 });
      expect(redis.del).toHaveBeenCalledWith('lock:recalc:startup:7');
    });

    it('libera lock mesmo se calculateForStartup lanca erro', async () => {
      scoreCalculator.calculateForStartup.mockRejectedValueOnce(
        new Error('boom'),
      );

      await expect(listeners.onStartupChange({ startupId: 7 })).rejects.toThrow(
        'boom',
      );
      expect(redis.del).toHaveBeenCalledWith('lock:recalc:startup:7');
    });
  });

  describe('eventos de dominio', () => {
    it.each([
      ['onDocumentUploaded', { startupId: 1 }],
      ['onKycStatusChanged', { startupId: 2 }],
      ['onSealAssigned', { startupId: 3 }],
      ['onCampaignStatusChanged', { startupId: 4 }],
    ])(
      '%s recalcula score da startup',
      async (method: string, payload: { startupId: number }) => {
        const fn = (listeners as any)[method].bind(listeners);
        await fn(payload);
        expect(scoreCalculator.calculateForStartup).toHaveBeenCalledWith(
          payload.startupId,
        );
      },
    );
  });
});
