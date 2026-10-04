import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TransferService } from './transfer.service';

describe('TransferService', () => {
  let service: TransferService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransferService],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  describe('transfer', () => {
    it('deve retornar PROCESSING com transferId para PIX', async () => {
      const dto = {
        method: 'PIX' as const,
        amount: 500,
        destinationBankCode: '0001',
        destinationAccountNumber: '12345',
        destinationBranchNumber: '0001',
        destinationHolderName: 'João Silva',
        destinationHolderDocument: '12345678901',
      };

      const result = await service.transfer(dto, 1);

      expect(result.status).toBe('PROCESSING');
      expect(result.transferId).toMatch(/^MOCK-/);
      expect(result.estimatedArrival).toBeDefined();
    });

    it('deve retornar PROCESSING com 24h ETA para TED', async () => {
      const dto = {
        method: 'TED' as const,
        amount: 1000,
        destinationBankCode: '033',
        destinationAccountNumber: '12345',
        destinationBranchNumber: '0001',
        destinationHolderName: 'Empresa X',
        destinationHolderDocument: '12345678000199',
      };

      const result = await service.transfer(dto, 1);

      expect(result.status).toBe('PROCESSING');
      const eta = new Date(result.estimatedArrival);
      const now = new Date();
      const diffMs = eta.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23);
    });

    it('deve lançar BadRequestException para amount <= 0', async () => {
      const dto = {
        method: 'PIX' as const,
        amount: 0,
        destinationBankCode: '0001',
        destinationAccountNumber: '12345',
        destinationBranchNumber: '0001',
        destinationHolderName: 'João',
        destinationHolderDocument: '12345678901',
      };

      await expect(service.transfer(dto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve rejeitar amount negativo', async () => {
      const dto = {
        method: 'PIX' as const,
        amount: -100,
        destinationBankCode: '0001',
        destinationAccountNumber: '12345',
        destinationBranchNumber: '0001',
        destinationHolderName: 'João',
        destinationHolderDocument: '12345678901',
      };

      await expect(service.transfer(dto, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
