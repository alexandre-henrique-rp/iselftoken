import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('AccountController', () => {
  let controller: AccountController;
  let accountService: jest.Mocked<AccountService>;

  const mockAccountService = {
    openAccount: jest.fn(),
    listMine: jest.fn(),
    handleWebhook: jest.fn(),
  };

  const mockAuthGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: mockAccountService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<AccountController>(AccountController);
    accountService = module.get(AccountService);
  });

  describe('POST /payment/account/open', () => {
    it('delega openAccount para o service com userId do request', async () => {
      const dto = {
        holderDocument: '12345678901',
        holderName: 'João',
        holderEmail: 'joao@test.com',
        holderPhone: '11999998888',
      };
      const mockReq = { user: { id: 42 } };
      mockAccountService.openAccount.mockResolvedValue({
        id: 'acc_1',
        userId: 42,
        holderDocument: '12345678901',
        holderName: 'João',
        holderEmail: 'joao@test.com',
        holderPhone: '11999998888',
        efiRegistrationId: 'reg_123',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.open(dto, mockReq);

      expect(accountService.openAccount).toHaveBeenCalledWith(dto, 42);
      expect(result.status).toBe('PENDING');
    });
  });

  describe('GET /payment/account', () => {
    it('delega listMine para o service com userId do request', async () => {
      const mockReq = { user: { id: 7 } };
      mockAccountService.listMine.mockResolvedValue([]);

      await controller.list(mockReq);

      expect(accountService.listMine).toHaveBeenCalledWith(7);
    });
  });

  describe('POST /payment/account/webhook', () => {
    it('delega handleWebhook para o service', async () => {
      const payload = { accountId: 'reg_123', status: 'APPROVED' };
      mockAccountService.handleWebhook.mockResolvedValue({ received: true });

      const result = await controller.webhook(payload);

      expect(accountService.handleWebhook).toHaveBeenCalledWith(payload);
      expect(result).toEqual({ received: true });
    });
  });
});
