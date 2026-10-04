import { Test, TestingModule } from '@nestjs/testing';
import { AdminWithdrawalsService } from './admin-withdrawals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResponseDto } from 'src/common/dto/response.dto';
import { AuditService } from '../../common/audit/audit.service';

/**
 * RED phase — AdminWithdrawalsService
 *
 * Cobre o fluxo mínimo de admin decidir sobre um Withdrawal:
 *  - approve(id, adminId): REQUESTED → PROCESSING, grava approvedBy
 *  - reject(id, adminId): REQUESTED → REJECTED, grava approvedBy
 *
 * Regras de negócio:
 *  - Só transiciona de REQUESTED (idempotente: já processado retorna erro)
 *  - 404 quando o withdrawal não existe
 *  - Envelope padrão ResponseDto (error / codigo / data)
 */
describe('AdminWithdrawalsService', () => {
  let service: AdminWithdrawalsService;

  const mockPrisma = {
    withdrawal: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAuditService = { log: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminWithdrawalsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AdminWithdrawalsService>(AdminWithdrawalsService);
  });

  describe('approve', () => {
    it('should mark REQUESTED withdrawal as PROCESSING and set approvedBy', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'REQUESTED',
      });
      mockPrisma.withdrawal.update.mockResolvedValueOnce({
        id: 1,
        status: 'PROCESSING',
        approvedBy: 42,
      });

      const result = await service.approve(1, 42);

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(200);
      expect(result.data.status).toBe('PROCESSING');
      expect(result.data.approvedBy).toBe(42);
      expect(mockPrisma.withdrawal.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'PROCESSING', approvedBy: 42 },
      });
    });

    it('should reject with 404 when withdrawal does not exist', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce(null);

      const result = await service.approve(999, 42);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
      expect(mockPrisma.withdrawal.update).not.toHaveBeenCalled();
    });

    it('should refuse transition from PROCESSING (already processed)', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'PROCESSING',
      });

      const result = await service.approve(1, 42);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(409);
      expect(result.detalhe?.code).toBe('INVALID_STATE');
      expect(mockPrisma.withdrawal.update).not.toHaveBeenCalled();
    });

    it('should refuse transition from COMPLETED', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'COMPLETED',
      });

      const result = await service.approve(1, 42);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(409);
    });

    it('should refuse transition from REJECTED', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'REJECTED',
      });

      const result = await service.approve(1, 42);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(409);
    });
  });

  describe('reject', () => {
    it('should mark REQUESTED withdrawal as REJECTED and set approvedBy', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'REQUESTED',
      });
      mockPrisma.withdrawal.update.mockResolvedValueOnce({
        id: 1,
        status: 'REJECTED',
        approvedBy: 42,
      });

      const result = await service.reject(1, 42);

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(200);
      expect(result.data.status).toBe('REJECTED');
      expect(mockPrisma.withdrawal.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'REJECTED', approvedBy: 42 },
      });
    });

    it('should reject with 404 when withdrawal does not exist', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce(null);

      const result = await service.reject(999, 42);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(404);
    });

    it('should refuse transition from REJECTED (already rejected)', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'REJECTED',
      });

      const result = await service.reject(1, 42);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(409);
    });

    it('should refuse transition from COMPLETED (cannot reject paid)', async () => {
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce({
        id: 1,
        status: 'COMPLETED',
      });

      const result = await service.reject(1, 42);

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(409);
    });
  });

  describe('response envelope', () => {
    it('should use ResponseDto helper for consistent shape', async () => {
      const okSpy = jest.spyOn(ResponseDto, 'success');
      const errSpy = jest.spyOn(ResponseDto, 'error');
      mockPrisma.withdrawal.findUnique.mockResolvedValueOnce(null);

      await service.approve(1, 42);

      expect(errSpy).toHaveBeenCalled();
      okSpy.mockRestore();
      errSpy.mockRestore();
    });
  });
});
