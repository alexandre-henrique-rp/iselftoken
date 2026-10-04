import { Test, TestingModule } from '@nestjs/testing';
import { TransferController } from './transfer.controller';
import { TransferService } from '../service/transfer.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { TwoFactorGuard } from '../guards/two-factor.guard';
import { FinanceRoleGuard } from 'src/common/guards/finance-role.guard';

describe('TransferController', () => {
  let controller: TransferController;
  let service: jest.Mocked<TransferService>;

  const mockTransferService = {
    transfer: jest.fn(),
  };

  const mockAuthGuard = { canActivate: jest.fn(() => true) };
  const mockTwoFactorGuard = { canActivate: jest.fn(() => true) };
  const mockFinanceRoleGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [{ provide: TransferService, useValue: mockTransferService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .overrideGuard(TwoFactorGuard)
      .useValue(mockTwoFactorGuard)
      .overrideGuard(FinanceRoleGuard)
      .useValue(mockFinanceRoleGuard)
      .compile();

    controller = module.get<TransferController>(TransferController);
    service = module.get(TransferService);
  });

  describe('transfer', () => {
    it('deve chamar transferService com userId e dto', async () => {
      const dto = {
        method: 'PIX' as const,
        amount: 500,
        destinationBankCode: '0001',
        destinationAccountNumber: '12345',
        destinationBranchNumber: '0001',
        destinationHolderName: 'João Silva',
        destinationHolderDocument: '12345678901',
      };
      const mockResult = {
        transferId: 'MOCK-123',
        status: 'PROCESSING',
        estimatedArrival: '2026-08-23T11:00:00.000Z',
      };
      mockTransferService.transfer.mockResolvedValue(mockResult);

      const req = { user: { id: 42 } };
      const result = await controller.transfer(dto, req);

      expect(result).toEqual(mockResult);
      expect(service.transfer).toHaveBeenCalledWith(dto, 42);
    });
  });
});
