import { Test, TestingModule } from '@nestjs/testing';
import { BalanceController } from './balance.controller';
import { BalanceService } from '../service/balance.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('BalanceController', () => {
  let controller: BalanceController;
  let service: jest.Mocked<BalanceService>;

  const mockBalanceService = {
    getUserBalance: jest.fn(),
  };

  const mockAuthGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BalanceController],
      providers: [{ provide: BalanceService, useValue: mockBalanceService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<BalanceController>(BalanceController);
    service = module.get(BalanceService);
  });

  describe('getBalance', () => {
    it('deve retornar saldo do usuário logado', async () => {
      const mockBalance = {
        totalConfirmed: 1000,
        totalRefunded: 200,
        netBalance: 800,
        asOf: '2026-08-23T10:00:00.000Z',
      };
      mockBalanceService.getUserBalance.mockResolvedValue(mockBalance);

      const req = { user: { id: 1 } };
      const result = await controller.getBalance(req);

      expect(result).toEqual(mockBalance);
      expect(service.getUserBalance).toHaveBeenCalledWith(1);
    });
  });
});
