import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { ManualApproveController } from './manual-approve.controller';
import { ManualApproveService } from '../service/manual-approve.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { TwoFactorGuard } from '../guards/two-factor.guard';
import { InstallmentConfigPermissionGuard } from '../guards/installment-config-permission.guard';

describe('ManualApproveController', () => {
  let controller: ManualApproveController;
  let manualApproveService: any;

  beforeEach(async () => {
    manualApproveService = { manualApprove: jest.fn() };

    const mockGuard = { canActivate: () => true } as CanActivate;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManualApproveController],
      providers: [
        { provide: ManualApproveService, useValue: manualApproveService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(TwoFactorGuard)
      .useValue(mockGuard)
      .overrideGuard(InstallmentConfigPermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(ManualApproveController);
  });

  describe('POST /payment/:id/manual-approve', () => {
    it('deve chamar manualApproveService.manualApprove com id e userId corretos', async () => {
      const updatedPayment = { id: 1, status: 'PAID' };
      manualApproveService.manualApprove.mockResolvedValue(updatedPayment);

      const mockReq = { user: { id: 99 } };
      const dto = { justification: 'pagamento via transferencia bancaria' };

      const result = await controller.manualApprove(1, dto, mockReq);

      expect(manualApproveService.manualApprove).toHaveBeenCalledWith(
        1,
        dto,
        99,
      );
      expect(result).toEqual(updatedPayment);
    });
  });
});
