/**
 * Spec Compliance Gate — Repasse (FIN-12).
 *
 * Verifica:
 * 1. Financeiro NAO consegue configurar sem Compliance ter deliberado
 * 2. Compliance deliberacao cria Repasse com status CONFIGURED
 * 3. Sequencial: Installment N NAO pode ser aprovada sem N-1 COMPLETED
 * 4. Reject NAO emite evento publico
 *
 * Executar: `npm run test -- --testPathPattern=compliance-gate`
 */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';
import { RepassesService } from '../repasses.service';

describe('Compliance Gate — Repasses (FIN-12)', () => {
  let service: RepassesService;
  let prisma: any;
  let events: { emit: jest.Mock };

  beforeEach(async () => {
    prisma = {
      campaign: { findUnique: jest.fn() },
      repasse: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      installment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      installmentRequest: {
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (cb) => cb(prisma)),
    };

    events = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RepassesService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        {
          provide: S3Service,
          useValue: {
            upload: jest.fn().mockResolvedValue({ key: 'k', size: 1 }),
          },
        },
      ],
    }).compile();

    service = module.get(RepassesService);
    (service as any).events = events;
  });

  describe('Compliance gate — Financeiro 400 sem deliberacao', () => {
    it('configure() RECUSA se complianceApprovedAt for null', async () => {
      prisma.repasse.findUnique.mockResolvedValue({
        id: 5,
        numeroParcelas: 12,
        complianceApprovedAt: null,
        installments: [],
      });

      await expect(
        service.configure(
          5,
          { valorParcela: 10000, intervaloDias: 30 } as any,
          99,
        ),
      ).rejects.toThrow(/Compliance deve deliberar primeiro/);
    });

    it('configure() SUCEDE se complianceApprovedAt estiver setado', async () => {
      prisma.repasse.findUnique.mockResolvedValue({
        id: 5,
        numeroParcelas: 12,
        complianceApprovedAt: new Date(),
        valorTotalCaptacao: { toString: () => '120000.00' },
        installments: [],
        campaign: { startupId: 1 },
      });
      prisma.installment.deleteMany.mockResolvedValue({ count: 0 });
      prisma.installment.createMany.mockResolvedValue({ count: 12 });
      prisma.repasse.update.mockResolvedValue({ id: 5 });

      await expect(
        service.configure(
          5,
          { valorParcela: 10000, intervaloDias: 30 } as any,
          99,
        ),
      ).resolves.toBeDefined();
    });

    it('configure() RECUSA se valorTotalCaptacao nao bate (consistencia)', async () => {
      prisma.repasse.findUnique.mockResolvedValue({
        id: 5,
        numeroParcelas: 12,
        complianceApprovedAt: new Date(),
        valorTotalCaptacao: { toString: () => '100000.00' },
        installments: [],
      });

      await expect(
        service.configure(
          5,
          { valorParcela: 10000, intervaloDias: 30 } as any,
          99,
        ),
      ).rejects.toThrow(/Inconsistencia/);
    });
  });

  describe('Sequencial — Installment N exige N-1 COMPLETED', () => {
    it('approveInstallment RECUSA se N-1 nao COMPLETED', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        id: 10,
        numero: 2,
        valor: { toString: () => '10000.00' },
        status: 'REQUESTED',
        repasseId: 5,
        repasse: { id: 5, campaignId: 1, status: 'IN_PROGRESS' },
      });
      prisma.installment.findFirst.mockResolvedValue({
        status: 'APPROVED',
      });

      await expect(
        service.approveInstallment(10, {} as any, 99),
      ).rejects.toThrow(/COMPLETED antes de aprovar a 2/);
    });

    it('approveInstallment SUCEDE se N-1 esta COMPLETED e emite evento', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        id: 10,
        numero: 2,
        valor: { toString: () => '10000.00' },
        status: 'REQUESTED',
        repasseId: 5,
        repasse: { id: 5, campaignId: 1, status: 'IN_PROGRESS' },
      });
      prisma.installment.findFirst.mockResolvedValue({ status: 'COMPLETED' });
      prisma.campaign.findUnique.mockResolvedValue({
        startupId: 1,
        startup: { founderId: 50 },
      });
      prisma.installment.update.mockResolvedValue({ id: 10 });
      prisma.installmentRequest.upsert.mockResolvedValue({ id: 100 });
      prisma.repasse.update.mockResolvedValue({ id: 5 });

      const result = await service.approveInstallment(10, {} as any, 99);
      expect(result).toBeDefined();
      expect(events.emit).toHaveBeenCalledWith(
        'installment.approved',
        expect.objectContaining({ installmentId: 10, requestId: 100 }),
      );
    });

    it('approveInstallment SUCEDE na primeira parcela (numero=1, sem N-1)', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        id: 10,
        numero: 1,
        valor: { toString: () => '10000.00' },
        status: 'AWAITING_REQUEST',
        repasseId: 5,
        repasse: { id: 5, campaignId: 1, status: 'CONFIGURED' },
      });
      prisma.campaign.findUnique.mockResolvedValue({
        startupId: 1,
        startup: { founderId: 50 },
      });
      prisma.installment.update.mockResolvedValue({ id: 10 });
      prisma.installmentRequest.upsert.mockResolvedValue({ id: 100 });
      prisma.repasse.update.mockResolvedValue({ id: 5 });

      const result = await service.approveInstallment(10, {} as any, 99);
      expect(result).toBeDefined();
    });
  });

  describe('Reject — NAO gera auto-post publico', () => {
    it('rejectInstallment NAO emite evento installment.approved/completed', async () => {
      prisma.installment.findUnique.mockResolvedValue({
        id: 10,
        numero: 1,
        status: 'REQUESTED',
      });
      prisma.installment.update.mockResolvedValue({ id: 10 });
      prisma.installmentRequest.updateMany.mockResolvedValue({ count: 1 });

      await service.rejectInstallment(10, 'Documentacao incompleta', 99);

      expect(events.emit).not.toHaveBeenCalledWith(
        'installment.approved',
        expect.anything(),
      );
      expect(events.emit).not.toHaveBeenCalledWith(
        'installment.completed',
        expect.anything(),
      );
    });
  });
});
