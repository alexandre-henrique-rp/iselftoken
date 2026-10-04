import { Test, TestingModule } from '@nestjs/testing';
import { RepassesNotificationService } from './repasses-notification.service';
import { EmailService } from 'src/email/email.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationsService } from 'src/api/notifications/notifications.service';

const mockEmail = {
  sendTemplateBySlug: jest.fn(),
};

const mockNotifications = {
  create: jest.fn(),
};

const mockPrisma = {
  user: { findMany: jest.fn() },
  startup: { findUnique: jest.fn() },
  installment: { findUnique: jest.fn() },
  repasse: { findUnique: jest.fn() },
};

describe('RepassesNotificationService', () => {
  let service: RepassesNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepassesNotificationService,
        { provide: EmailService, useValue: mockEmail },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<RepassesNotificationService>(
      RepassesNotificationService,
    );
    jest.clearAllMocks();
  });

  describe('onInstallmentRequested', () => {
    it('should send email to financeiro when installment is requested', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'financeiro@test.com' },
      ]);
      mockPrisma.installment.findUnique.mockResolvedValue({
        id: 1,
        numero: 1,
        valor: '1000.00',
        scheduledDate: new Date(),
        status: 'REQUESTED',
        request: { allocationPercents: {}, txidC6: 'TX123' },
        repasseId: 1,
      });
      mockPrisma.repasse.findUnique.mockResolvedValue({
        id: 1,
        numeroParcelas: 12,
        valorParcela: '1000.00',
        intervaloDias: 30,
        campaign: {
          title: 'Campaign 1',
          startup: {
            id: 1,
            nome: 'Startup 1',
            founder: { nome: 'Founder', email: 'founder@test.com' },
          },
        },
      });
      mockEmail.sendTemplateBySlug.mockResolvedValue({
        success: true,
        message: 'Email sent',
      });

      await service.onInstallmentRequested({ installmentId: 1, startupId: 1 });

      expect(mockEmail.sendTemplateBySlug).toHaveBeenCalledWith(
        'financeiro@test.com',
        'parcela-solicitada',
        expect.any(Object),
      );
    });

    it('should not send email when no financeiro users found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.onInstallmentRequested({ installmentId: 1, startupId: 1 });

      expect(mockEmail.sendTemplateBySlug).not.toHaveBeenCalled();
    });
  });

  describe('onInstallmentApproved', () => {
    it('should send email to founder when installment is approved', async () => {
      mockPrisma.installment.findUnique.mockResolvedValue({
        id: 1,
        numero: 1,
        valor: '1000.00',
        status: 'APPROVED',
        paidAt: null,
        request: { allocationPercents: { marketing: 20 }, txidC6: 'TX123' },
        repasseId: 1,
      });
      mockPrisma.repasse.findUnique.mockResolvedValue({
        id: 1,
        numeroParcelas: 12,
        campaign: {
          title: 'Campaign 1',
          startup: {
            id: 1,
            nome: 'Startup 1',
            founder: { nome: 'Founder', email: 'founder@test.com' },
          },
        },
      });
      mockEmail.sendTemplateBySlug.mockResolvedValue({
        success: true,
        message: 'Email sent',
      });

      await service.onInstallmentApproved({ installmentId: 1, startupId: 1 });

      expect(mockEmail.sendTemplateBySlug).toHaveBeenCalledWith(
        'founder@test.com',
        'parcela-aprovada',
        expect.any(Object),
      );
    });
  });

  describe('onInstallmentCompleted', () => {
    it('should send email to founder when installment is completed', async () => {
      mockPrisma.installment.findUnique.mockResolvedValue({
        id: 1,
        numero: 1,
        valor: '1000.00',
        status: 'COMPLETED',
        paidAt: new Date(),
        request: { allocationPercents: {}, txidC6: 'TX123' },
        repasseId: 1,
      });
      mockPrisma.repasse.findUnique.mockResolvedValue({
        id: 1,
        numeroParcelas: 12,
        campaign: {
          title: 'Campaign 1',
          startup: {
            id: 1,
            nome: 'Startup 1',
            founder: { nome: 'Founder', email: 'founder@test.com' },
          },
        },
      });
      mockEmail.sendTemplateBySlug.mockResolvedValue({
        success: true,
        message: 'Email sent',
      });

      await service.onInstallmentCompleted({ installmentId: 1, startupId: 1 });

      expect(mockEmail.sendTemplateBySlug).toHaveBeenCalledWith(
        'founder@test.com',
        'parcela-depositada',
        expect.any(Object),
      );
    });
  });

  describe('onRepasseConfigured', () => {
    it('should send email to founder when repasse is configured', async () => {
      mockPrisma.repasse.findUnique.mockResolvedValue({
        id: 1,
        numeroParcelas: 12,
        valorParcela: '1000.00',
        intervaloDias: 30,
        installments: [],
        campaign: {
          title: 'Campaign 1',
          startup: {
            id: 1,
            nome: 'Startup 1',
            founder: { nome: 'Founder', email: 'founder@test.com' },
          },
        },
      });
      mockEmail.sendTemplateBySlug.mockResolvedValue({
        success: true,
        message: 'Email sent',
      });

      await service.onRepasseConfigured({ repasseId: 1, startupId: 1 });

      expect(mockEmail.sendTemplateBySlug).toHaveBeenCalledWith(
        'founder@test.com',
        'repasse-configurado',
        expect.any(Object),
      );
    });
  });
});
