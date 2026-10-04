import { Test, TestingModule } from '@nestjs/testing';
import { HistoryService } from './history.service';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Testes do HistoryService — novas categorias, filtros HH:mm e actorName,
 * e mapeamento de audit actions → categorias.
 */
describe('HistoryService', () => {
  let service: HistoryService;

  const mockPrisma = {
    investment: { findMany: jest.fn().mockResolvedValue([]) },
    payment: { findMany: jest.fn().mockResolvedValue([]) },
    tokenReservation: { findMany: jest.fn().mockResolvedValue([]) },
    withdrawal: { findMany: jest.fn().mockResolvedValue([]) },
    affiliateProgram: { findMany: jest.fn().mockResolvedValue([]) },
    affiliation: { findMany: jest.fn().mockResolvedValue([]) },
    affiliateCommission: { findMany: jest.fn().mockResolvedValue([]) },
    dataChangeRequest: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Re-assign default returns after clearAllMocks
    mockPrisma.investment.findMany.mockResolvedValue([]);
    mockPrisma.payment.findMany.mockResolvedValue([]);
    mockPrisma.tokenReservation.findMany.mockResolvedValue([]);
    mockPrisma.withdrawal.findMany.mockResolvedValue([]);
    mockPrisma.affiliateProgram.findMany.mockResolvedValue([]);
    mockPrisma.affiliation.findMany.mockResolvedValue([]);
    mockPrisma.affiliateCommission.findMany.mockResolvedValue([]);
    mockPrisma.dataChangeRequest.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.user.findMany.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list — empty state', () => {
    it('returns empty items when no data exists', async () => {
      const result: any = await service.list({});
      expect(result.data).toBeDefined();
      expect(result.data.items).toEqual([]);
      expect(result.data.total).toBe(0);
    });
  });

  describe('new categories — USUARIO, ASSINATURA, KYC', () => {
    it('maps USER_PROFILE_UPDATED to USUARIO category', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '1',
          action: 'USER_PROFILE_UPDATED',
          entity: 'User',
          entityId: '42',
          createdAt: new Date('2026-09-08T10:00:00Z'),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
      ]);

      const result = await service.list({});
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].category).toBe('USUARIO');
      expect(result.data.items[0].type).toBe('USER_PROFILE_UPDATED');
    });

    it('maps SUBSCRIPTION_CREATED to ASSINATURA category', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '2',
          action: 'SUBSCRIPTION_CREATED',
          entity: 'Subscription',
          entityId: '10',
          createdAt: new Date('2026-09-08T11:00:00Z'),
          user: { id: 5, nome: 'User', email: 'user@test.com' },
          userId: 5,
        },
      ]);

      const result = await service.list({});
      expect(result.data.items[0].category).toBe('ASSINATURA');
    });

    it('maps USER_KYC_DECIDED to KYC category', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '3',
          action: 'USER_KYC_DECIDED',
          entity: 'KYCProfile',
          entityId: '7',
          createdAt: new Date('2026-09-08T12:00:00Z'),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
      ]);

      const result = await service.list({});
      expect(result.data.items[0].category).toBe('KYC');
    });

    it('maps WITHDRAWAL_APPROVED to SAQUE category', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '4',
          action: 'WITHDRAWAL_APPROVED',
          entity: 'Withdrawal',
          entityId: '3',
          createdAt: new Date('2026-09-08T13:00:00Z'),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
      ]);

      const result = await service.list({});
      expect(result.data.items[0].category).toBe('SAQUE');
    });

    it('maps FINANCE_CONFIG_UPDATED to ADMIN category', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '5',
          action: 'FINANCE_CONFIG_UPDATED',
          entity: 'FinanceConfig',
          entityId: 'fee_pct',
          createdAt: new Date('2026-09-08T14:00:00Z'),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
      ]);

      const result = await service.list({});
      expect(result.data.items[0].category).toBe('ADMIN');
    });
  });

  describe('filters — fromTime / toTime', () => {
    const localDate = (h: number, m = 0) => new Date(2026, 8, 8, h, m); // Sep 8 2026 — return Date object

    it('filters events by fromTime (HH:mm)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '10',
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: '1',
          createdAt: localDate(8, 30),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
        {
          id: '11',
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: '2',
          createdAt: localDate(15, 0),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
      ]);

      const result: any = await service.list({ fromTime: '10:00' });
      expect(result.data).toBeDefined();
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].id).toContain('11');
    });

    it('filters events by toTime (HH:mm)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '20',
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: '1',
          createdAt: localDate(8, 30),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
        {
          id: '21',
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: '2',
          createdAt: localDate(15, 0),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
      ]);

      const result: any = await service.list({ toTime: '12:00' });
      expect(result.data).toBeDefined();
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].id).toContain('20');
    });

    it('filters events by both fromTime and toTime', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '30',
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: '1',
          createdAt: localDate(7, 0),
          user: null,
          userId: null,
        },
        {
          id: '31',
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: '2',
          createdAt: localDate(10, 0),
          user: null,
          userId: null,
        },
        {
          id: '32',
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: '3',
          createdAt: localDate(14, 0),
          user: null,
          userId: null,
        },
      ]);

      const result: any = await service.list({
        fromTime: '08:00',
        toTime: '12:00',
      });
      expect(result.data).toBeDefined();
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].id).toContain('31');
    });

    it('ignores invalid fromTime format', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '40',
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: '1',
          createdAt: localDate(10, 0),
          user: null,
          userId: null,
        },
      ]);

      const result: any = await service.list({ fromTime: 'invalid' });
      expect(result.data).toBeDefined();
      expect(result.data.items).toHaveLength(1);
    });
  });

  describe('filter — actorName', () => {
    it('filters by actor name (case-insensitive)', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '50',
          action: 'USER_PROFILE_UPDATED',
          entity: 'User',
          entityId: '1',
          createdAt: new Date('2026-09-08T10:00:00Z'),
          user: { id: 1, nome: 'Carlos Silva', email: 'carlos@test.com' },
          userId: 1,
        },
        {
          id: '51',
          action: 'USER_PROFILE_UPDATED',
          entity: 'User',
          entityId: '2',
          createdAt: new Date('2026-09-08T11:00:00Z'),
          user: { id: 2, nome: 'Ana Santos', email: 'ana@test.com' },
          userId: 2,
        },
      ]);

      const result = await service.list({ actorName: 'carlos' });
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].actor.nome).toBe('Carlos Silva');
    });

    it('filters by actor email', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '60',
          action: 'USER_PROFILE_UPDATED',
          entity: 'User',
          entityId: '1',
          createdAt: new Date('2026-09-08T10:00:00Z'),
          user: { id: 1, nome: 'Carlos', email: 'carlos@corp.com' },
          userId: 1,
        },
      ]);

      const result = await service.list({ actorName: 'corp.com' });
      expect(result.data.items).toHaveLength(1);
    });
  });

  describe('filter — category', () => {
    it('filters by new category USUARIO', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: '70',
          action: 'USER_PROFILE_UPDATED',
          entity: 'User',
          entityId: '1',
          createdAt: new Date('2026-09-08T10:00:00Z'),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
        {
          id: '71',
          action: 'STARTUP_STATUS_CHANGED',
          entity: 'Startup',
          entityId: '1',
          createdAt: new Date('2026-09-08T11:00:00Z'),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        },
      ]);

      const result = await service.list({ category: 'USUARIO' });
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].type).toBe('USER_PROFILE_UPDATED');
    });
  });

  describe('export — listAllForExport', () => {
    it('returns all events without pagination', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: String(i + 100),
          action: 'USER_TOGGLED',
          entity: 'User',
          entityId: String(i),
          createdAt: new Date(`2026-09-08T${10 + i}:00:00Z`),
          user: { id: 1, nome: 'Admin', email: 'admin@test.com' },
          userId: 1,
        })),
      );

      const result = await service.listAllForExport({});
      expect(result).toHaveLength(5);
    });
  });
});
