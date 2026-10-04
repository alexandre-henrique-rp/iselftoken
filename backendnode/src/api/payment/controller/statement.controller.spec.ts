import { Test, TestingModule } from '@nestjs/testing';
import { StatementController } from './statement.controller';
import { StatementService } from '../service/statement.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('StatementController', () => {
  let controller: StatementController;
  let service: jest.Mocked<StatementService>;

  const mockStatementService = {
    getStatement: jest.fn(),
  };

  const mockAuthGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatementController],
      providers: [
        { provide: StatementService, useValue: mockStatementService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<StatementController>(StatementController);
    service = module.get(StatementService);
  });

  describe('getStatement', () => {
    it('deve retornar extrato JSON para o usuário logado', async () => {
      const mockResult = {
        transactions: [{ id: 1, amount: 1000, status: 'PAID' }],
        summary: { totalConfirmed: 1000, totalRefunded: 0, count: 1 },
      };
      mockStatementService.getStatement.mockResolvedValue(mockResult);

      const req = { user: { id: 1 } };
      const query = { format: 'JSON' as const };
      const result = await controller.getStatement(req, query);

      expect(result).toEqual(mockResult);
      expect(service.getStatement).toHaveBeenCalledWith(1, query);
    });

    it('deve passar filtros de query para o service', async () => {
      const mockResult = {
        transactions: [],
        summary: { totalConfirmed: 0, totalRefunded: 0, count: 0 },
      };
      mockStatementService.getStatement.mockResolvedValue(mockResult);

      const req = { user: { id: 1 } };
      const query = {
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-08-31T23:59:59Z',
        format: 'JSON' as const,
      };
      await controller.getStatement(req, query);

      expect(service.getStatement).toHaveBeenCalledWith(1, query);
    });
  });
});
