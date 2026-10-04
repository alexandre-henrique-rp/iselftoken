/**
 * ScheduledPublishCron — testes do job de publicação agendada (delay 24h).
 *
 * Garante:
 *  - Lock Redis SET NX EX adquirido antes de publicar; skip se já adquirido.
 *  - Só publica DRAFT com `scheduledPublishAt <= now` (antes da hora não abre).
 *  - Transiciona para OPEN, grava AuditLog e emite `startup.approved`.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScheduledPublishCron } from './scheduled-publish.cron';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuditService } from 'src/common/audit/audit.service';

describe('ScheduledPublishCron — publicação agendada', () => {
  let cron: ScheduledPublishCron;
  let prisma: any;
  let audit: any;
  let redis: any;
  let emitter: any;

  beforeEach(async () => {
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    prisma = {
      campaign: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledPublishCron,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: 'default_IORedisModuleConnectionToken', useValue: redis },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    cron = module.get(ScheduledPublishCron);
  });

  it('adquire lock Redis SET NX EX antes de publicar', async () => {
    await cron.handleCron();
    expect(redis.set).toHaveBeenCalledWith(
      'lock:scheduled-publish:campaigns',
      expect.any(String),
      'EX',
      expect.any(Number),
      'NX',
    );
    expect(redis.del).toHaveBeenCalled();
  });

  it('skip quando lock já adquirido por outra instância', async () => {
    redis.set.mockResolvedValueOnce(null);
    await cron.handleCron();
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
    expect(redis.del).not.toHaveBeenCalled();
  });

  it('não publica nada quando não há campanha vencida', async () => {
    prisma.campaign.findMany.mockResolvedValueOnce([]);
    const published = await cron.publishDueCampaigns(new Date());
    expect(published).toBe(0);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('publica campanha DRAFT vencida: OPEN + AuditLog + evento startup.approved', async () => {
    const now = new Date('2026-10-02T15:00:00.000Z');
    prisma.campaign.findMany.mockResolvedValueOnce([
      { id: 77, startupId: 3, deadline: null },
    ]);

    const published = await cron.publishDueCampaigns(now);

    expect(published).toBe(1);
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 77 },
        data: expect.objectContaining({
          status: 'OPEN',
          dataLancamentoRodada: now,
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CAMPAIGN_PUBLISHED_SCHEDULED' }),
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'startup.approved',
      expect.objectContaining({ startupId: 3, scheduled: false }),
    );
  });

  it('filtra por scheduledPublishAt <= now (antes da hora não abre)', async () => {
    // findMany é o filtro: garantimos que o where usa lte com a data informada.
    const now = new Date('2026-10-02T15:00:00.000Z');
    await cron.publishDueCampaigns(now);
    expect(prisma.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'DRAFT',
          scheduledPublishAt: { not: null, lte: now },
        }),
      }),
    );
  });
});
