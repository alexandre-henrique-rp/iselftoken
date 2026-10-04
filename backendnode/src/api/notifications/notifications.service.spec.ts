import { Test } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from 'src/prisma/prisma.service';

describe('NotificationsService', () => {
  const mockGateway = {
    emitToUser: jest.fn(),
  } as unknown as NotificationsGateway;

  const mockPrisma: any = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  let service: NotificationsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();
    service = moduleRef.get(NotificationsService);
  });

  describe('create', () => {
    it('persiste no Prisma e emite via gateway', async () => {
      const created = {
        id: 1,
        userId: 42,
        title: 't',
        description: 'd',
        type: 'general',
        isRead: false,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      };
      mockPrisma.notification.create.mockResolvedValue(created);

      const result = await service.create(42, 't', 'd', 'general' as any);

      expect(result.id).toBe(1);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: { userId: 42, title: 't', description: 'd', type: 'general' },
      });
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(42, 'notification', {
        id: 1,
        title: 't',
        description: 'd',
        type: 'general',
        isRead: false,
        createdAt: '2026-01-01T00:00:00.000Z',
      });
    });

    it('NÃO propaga erro quando emitToUser falha', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 1,
        userId: 1,
        title: 't',
        description: 'd',
        type: 'general',
        isRead: false,
        createdAt: new Date(),
      });
      (mockGateway.emitToUser as jest.Mock).mockImplementation(() => {
        throw new Error('ws down');
      });

      // A camada superior (`emitToUser` no gateway) engole erros, mas se
      // algo passar, o service não pode quebrar o caller.
      await expect(
        service.create(1, 't', 'd', 'general' as any),
      ).resolves.toBeDefined();
    });
  });

  describe('markAsRead', () => {
    it('retorna 404 quando notificação não pertence ao user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        userId: 99,
        isRead: false,
      });
      const res = await service.markAsRead(1, 10);
      expect(res.error).toBe(true);
      expect(res.codigo).toBe(404);
    });

    it('marca como lida quando pertence ao user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        userId: 1,
        isRead: false,
      });
      const res = await service.markAsRead(1, 10);
      expect(mockPrisma.notification.update).toHaveBeenCalled();
      expect(res.codigo).toBe(200);
    });

    it('não chama update se já estava lida', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        userId: 1,
        isRead: true,
      });
      await service.markAsRead(1, 10);
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('getUnreadCount', () => {
    it('filtra por userId', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);
      const res = await service.getUnreadCount(42);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 42, isRead: false },
      });
      expect(res.data.unreadCount).toBe(7);
    });
  });
});
