import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { RefundController } from './refund.controller';
import { RefundService } from '../refund.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { TwoFactorGuard } from '../guards/two-factor.guard';
import { InstallmentConfigPermissionGuard } from '../guards/installment-config-permission.guard';

describe('RefundController', () => {
  let controller: RefundController;
  let refundService: any;

  beforeEach(async () => {
    refundService = { processRefund: jest.fn() };

    const mockGuard = { canActivate: () => true } as CanActivate;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefundController],
      providers: [{ provide: RefundService, useValue: refundService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(TwoFactorGuard)
      .useValue(mockGuard)
      .overrideGuard(InstallmentConfigPermissionGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(RefundController);
  });

  describe('POST /payment/:id/refund', () => {
    it('deve chamar refundService.processRefund com id e userId corretos', async () => {
      refundService.processRefund.mockResolvedValue({
        success: true,
        refundId: 'REF-001',
      });

      const mockReq = { user: { id: 42 } };
      const dto = { amount: 500, reason: 'Cancelamento' };

      const result = await controller.refund(1, dto, mockReq);

      expect(refundService.processRefund).toHaveBeenCalledWith(1, dto, 42);
      expect(result).toEqual({ success: true, refundId: 'REF-001' });
    });
  });
});
