/**
 * Unit tests para SplitController (S05 T043).
 *
 * Testa 1 endpoint por route (200/201 esperados):
 * 1. POST /payment/split → 201 create
 * 2. GET /payment/split → 200 listActive
 * 3. GET /payment/split/:id → 200 findOne
 * 4. PATCH /payment/split/:id → 200 update
 * 5. DELETE /payment/split/:id → 204 deactivate
 *
 * @spec SplitController
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from 'src/auth/admin.guard';
import { AuthGuard } from 'src/auth/auth.guard';
import { SplitController } from './split.controller';
import { SplitConfigResponse, SplitService } from './split.service';

describe('SplitController (S05 T043)', () => {
  let controller: SplitController;
  let mockService: any;

  const sampleResponse: SplitConfigResponse = {
    id: 'cuid-abc123',
    name: 'Split Teste',
    platformPercent: 5,
    founderPercent: 90,
    investorCashbackPercent: 5,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      listActive: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SplitController],
      providers: [{ provide: SplitService, useValue: mockService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SplitController>(SplitController);
  });

  afterEach(() => jest.clearAllMocks());

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('protege a classe com AuthGuard antes de AdminGuard', () => {
    const guards = Reflect.getMetadata('__guards__', SplitController) ?? [];

    expect(guards).toEqual([AuthGuard, AdminGuard]);
  });

  describe('POST /payment/split', () => {
    it('retorna 201 ao criar split com soma 100%', async () => {
      mockService.create.mockResolvedValue(sampleResponse);

      const result = await controller.create({
        name: 'Split Teste',
        platformPercent: 5,
        founderPercent: 90,
        investorCashbackPercent: 5,
      });

      expect(result).toEqual(sampleResponse);
      expect(mockService.create).toHaveBeenCalledWith({
        name: 'Split Teste',
        platformPercent: 5,
        founderPercent: 90,
        investorCashbackPercent: 5,
      });
    });
  });

  describe('GET /payment/split', () => {
    it('retorna 200 com lista de splits ativos', async () => {
      mockService.listActive.mockResolvedValue([sampleResponse]);

      const result = await controller.listActive();

      expect(result).toEqual([sampleResponse]);
      expect(mockService.listActive).toHaveBeenCalled();
    });
  });

  describe('GET /payment/split/:id', () => {
    it('retorna 200 com split encontrado', async () => {
      mockService.findOne.mockResolvedValue(sampleResponse);

      const result = await controller.findOne(1);

      expect(result).toEqual(sampleResponse);
      expect(mockService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('PATCH /payment/split/:id', () => {
    it('retorna 200 ao atualizar split', async () => {
      const updated = { ...sampleResponse, name: 'Atualizado' };
      mockService.update.mockResolvedValue(updated);

      const result = await controller.update(1, { name: 'Atualizado' });

      expect(result.name).toBe('Atualizado');
      expect(mockService.update).toHaveBeenCalledWith(1, {
        name: 'Atualizado',
      });
    });
  });

  describe('DELETE /payment/split/:id', () => {
    it('retorna 204 ao desativar split', async () => {
      mockService.deactivate.mockResolvedValue({ id: 1, isActive: false });

      await controller.deactivate(1);

      expect(mockService.deactivate).toHaveBeenCalledWith(1);
    });
  });
});
