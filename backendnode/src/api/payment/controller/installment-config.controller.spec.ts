/**
 * @description Testes unitarios para InstallmentConfigController.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { InstallmentConfigController } from './installment-config.controller';
import { InstallmentConfigService } from '../service/installment-config.service';
import { InstallmentConfigPermissionGuard } from '../guards/installment-config-permission.guard';
import { AuthGuard } from '../../../auth/auth.guard';
import { CreateInstallmentConfigDto } from '../dto/create-installment-config.dto';

describe('InstallmentConfigController', () => {
  let controller: InstallmentConfigController;
  let mockConfigService: Partial<InstallmentConfigService>;

  const mockConfig = {
    id: 1,
    interestRate: 0.0299,
    maxInstallments: 12,
    minInstallmentAmount: 50,
    effectiveFrom: new Date(),
    effectiveUntil: null,
    isActive: true,
    createdById: 1,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockConfigService = {
      create: jest.fn().mockResolvedValue(mockConfig),
      getVigente: jest.fn().mockResolvedValue(mockConfig),
      list: jest.fn().mockResolvedValue({
        data: [mockConfig],
        total: 1,
        page: 1,
        limit: 20,
      }),
      deactivate: jest.fn().mockResolvedValue({
        ...mockConfig,
        effectiveUntil: new Date(),
        isActive: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstallmentConfigController],
      providers: [
        { provide: InstallmentConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(InstallmentConfigPermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<InstallmentConfigController>(
      InstallmentConfigController,
    );
  });

  describe('POST /admin/installments', () => {
    it('deve criar config e retornar 201', async () => {
      const dto: CreateInstallmentConfigDto = {
        interestRate: 0.0299,
        maxInstallments: 12,
        minInstallmentAmount: 50,
      };
      const req = { user: { id: 1 } };
      const result = await controller.create(dto, req);

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(201);
      expect(result.data).toEqual(mockConfig);
      expect(mockConfigService.create).toHaveBeenCalledWith(dto, 1);
    });
  });

  describe('GET /admin/installments', () => {
    it('deve listar configs paginado e retornar 200', async () => {
      const result = await controller.list(1, 20);

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(200);
      expect(result.data).toBeInstanceOf(Array);
      expect(mockConfigService.list).toHaveBeenCalledWith(1, 20);
    });
  });

  describe('GET /admin/installments/vigente', () => {
    it('deve retornar config vigente e retornar 200', async () => {
      const result = await controller.vigente();

      expect(result.error).toBe(false);
      expect(result.codigo).toBe(200);
      expect(result.data).toEqual(mockConfig);
      expect(mockConfigService.getVigente).toHaveBeenCalled();
    });
  });

  describe('DELETE /admin/installments/:id', () => {
    it('deve desativar config e retornar 204', async () => {
      const req = { user: { id: 1 } };
      await controller.deactivate(1, req);

      expect(mockConfigService.deactivate).toHaveBeenCalledWith(1, 1);
    });
  });
});
