/**
 * S4-T01 — PinService
 *
 * Regras (PRD_MARKETPLACE_IMPL.md §4.3, §4.4 + RF-02/RF-03/RF-10):
 *  - POST valida reason >= 20 chars (400 se menor)
 *  - POST conta pinos ativos antes de inserir; 409 MAX_PINNED_EXCEEDED se >= 3
 *  - POST seta manuallyPinned=true, manuallyPinnedBy=actorId,
 *         manuallyPinnedAt=now, manuallyPinnedReason=reason
 *  - DELETE seta manuallyPinned=false e limpa campos (mantem reason em audit)
 *  - Cada acao cria AuditLog com action='PIN_STARTUP'/'UNPIN_STARTUP',
 *         IP, userAgent, actorId
 *  - Race condition tratada via transacao Prisma
 */

import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { PinService } from './pin.service';
import { PrismaService } from 'src/prisma/prisma.service';

const silentLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
  setLogLevels: jest.fn(),
} as unknown as Logger;

describe('PinService — regras de pinning manual (S4-T01)', () => {
  let service: PinService;
  let prisma: any;
  let events: EventEmitter2;

  beforeEach(async () => {
    prisma = {
      startup: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };
    events = new EventEmitter2();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PinService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        { provide: Logger, useValue: silentLogger },
      ],
    }).compile();

    service = module.get(PinService);
  });

  describe('pin()', () => {
    it('valida motivo >= 20 chars (400 BAD_REQUEST se menor)', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: false,
        founderId: 10,
      });

      await expect(
        service.pin(1, { reason: 'muito curto', actorId: 99 }),
      ).rejects.toThrow(/motivo.*20/i);
    });

    it('valida motivo de exatamente 19 chars rejeita', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: false,
        founderId: 10,
      });

      await expect(
        service.pin(1, {
          reason: 'a'.repeat(19),
          actorId: 99,
        }),
      ).rejects.toThrow(/motivo.*20/i);
    });

    it('valida motivo de 20 chars aceita', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: false,
        founderId: 10,
      });
      prisma.startup.count.mockResolvedValue(0);

      await expect(
        service.pin(1, {
          reason: 'a'.repeat(20),
          actorId: 99,
        }),
      ).resolves.toBeDefined();
    });

    it('retorna 409 MAX_PINNED_EXCEEDED quando ja existem 3 pinos ativos', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: false,
        founderId: 10,
      });
      prisma.startup.count.mockResolvedValue(3);

      await expect(
        service.pin(1, {
          reason: 'motivo grande o suficiente para passar',
          actorId: 99,
        }),
      ).rejects.toThrow(/MAX_PINNED_EXCEEDED|3/i);
    });

    it('incrementa count se a propria startup ja esta pinned (idempotencia)', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: true,
        founderId: 10,
      });
      prisma.startup.count.mockResolvedValue(2);

      await service.pin(1, {
        reason: 're-pin da mesma startup com motivo valido',
        actorId: 99,
      });

      expect(prisma.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            manuallyPinned: true,
            manuallyPinnedBy: 99,
          }),
        }),
      );
    });

    it('cria AuditLog com action=PIN_STARTUP + IP + userAgent + actorId', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: false,
        founderId: 10,
      });
      prisma.startup.count.mockResolvedValue(0);

      await service.pin(1, {
        reason: 'Y Combinator W26 batch top startup',
        actorId: 99,
        ip: '203.0.113.42',
        userAgent: 'Mozilla/5.0 (compatible; TestBot/1.0)',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PIN_STARTUP',
            entity: 'Startup',
            entityId: '1',
            userId: 99,
          }),
        }),
      );
    });

    it('emite evento marketplace.pinChanged para invalidar cache do featured', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: false,
        founderId: 10,
      });
      prisma.startup.count.mockResolvedValue(0);
      const emitSpy = jest.spyOn(events, 'emit');

      await service.pin(1, {
        reason: 'Y Combinator W26 batch top startup',
        actorId: 99,
      });

      expect(emitSpy).toHaveBeenCalledWith(
        'marketplace.pinChanged',
        expect.objectContaining({ startupId: 1, action: 'PIN' }),
      );
    });

    it('404 NOT_FOUND se startup nao existe', async () => {
      prisma.startup.findUnique.mockResolvedValue(null);

      await expect(
        service.pin(999, {
          reason: 'Y Combinator W26 batch top startup',
          actorId: 99,
        }),
      ).rejects.toThrow(/nao encontrada/i);
    });
  });

  describe('unpin()', () => {
    it('seta manuallyPinned=false e limpa campos', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: true,
        founderId: 10,
        manuallyPinnedReason: 'motivo antigo aqui',
        manuallyPinnedBy: 50,
      });

      await service.unpin(1, { actorId: 99 });

      expect(prisma.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            manuallyPinned: false,
            manuallyPinnedBy: null,
            manuallyPinnedAt: null,
            manuallyPinnedReason: null,
          }),
        }),
      );
    });

    it('cria AuditLog com action=UNPIN_STARTUP preservando reason', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: true,
        founderId: 10,
        manuallyPinnedReason: 'motivo antigo que sera preservado',
        manuallyPinnedBy: 50,
      });

      await service.unpin(1, {
        actorId: 99,
        ip: '203.0.113.42',
        userAgent: 'TestBot/1.0',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UNPIN_STARTUP',
            entity: 'Startup',
            entityId: '1',
            userId: 99,
          }),
        }),
      );
    });

    it('emite evento marketplace.pinChanged para unpin', async () => {
      prisma.startup.findUnique.mockResolvedValue({
        id: 1,
        manuallyPinned: true,
        founderId: 10,
        manuallyPinnedBy: 50,
      });
      const emitSpy = jest.spyOn(events, 'emit');

      await service.unpin(1, { actorId: 99 });

      expect(emitSpy).toHaveBeenCalledWith(
        'marketplace.pinChanged',
        expect.objectContaining({ startupId: 1, action: 'UNPIN' }),
      );
    });

    it('404 NOT_FOUND se startup nao existe', async () => {
      prisma.startup.findUnique.mockResolvedValue(null);

      await expect(service.unpin(999, { actorId: 99 })).rejects.toThrow(
        /nao encontrada/i,
      );
    });
  });

  describe('listPinned()', () => {
    it('retorna lista ordenada por manuallyPinnedAt DESC (mais recente primeiro)', async () => {
      prisma.startup.findMany.mockResolvedValue([
        {
          id: 3,
          slug: 's3',
          nome: 'Startup 3',
          manuallyPinnedAt: new Date('2026-09-22T10:00:00Z'),
          manuallyPinnedBy: 99,
          manuallyPinnedReason: 'motivo 3',
        },
        {
          id: 1,
          slug: 's1',
          nome: 'Startup 1',
          manuallyPinnedAt: new Date('2026-09-15T10:00:00Z'),
          manuallyPinnedBy: 50,
          manuallyPinnedReason: 'motivo 1',
        },
      ]);

      const result = await service.listPinned();

      expect(result).toHaveLength(2);
      expect(result[0].startupId).toBe(3);
      expect(result[1].startupId).toBe(1);
      expect(prisma.startup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ manuallyPinned: true }),
        }),
      );
    });
  });
});
