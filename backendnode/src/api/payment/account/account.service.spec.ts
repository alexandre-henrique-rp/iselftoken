import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { AccountService, EfiAccountWebhookPayload } from './account.service';
import { EfiAccountAdapter } from '../efi/adapters/efi-account.adapter';
import { FeatureFlagsService } from 'src/common/feature-flags/feature-flags.service';
import { AuditService } from 'src/common/audit/audit.service';
import { OpenAccountDto } from './dto/open-account.dto';

describe('AccountService', () => {
  let service: AccountService;
  let efiAccountAdapter: jest.Mocked<EfiAccountAdapter>;
  let ff: jest.Mocked<FeatureFlagsService>;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const mockEfiAccountAdapter = {
      openAccount: jest.fn(),
      getAccountStatus: jest.fn(),
      cancelAccountOpening: jest.fn(),
      validateHolder: jest.fn(),
    };

    const mockFf = {
      efiEnabled: true,
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: EfiAccountAdapter, useValue: mockEfiAccountAdapter },
        { provide: FeatureFlagsService, useValue: mockFf },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    efiAccountAdapter = module.get(EfiAccountAdapter);
    ff = module.get(FeatureFlagsService);
    auditService = module.get(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // openAccount
  // -------------------------------------------------------------------------
  describe('openAccount', () => {
    const dto: OpenAccountDto = {
      holderDocument: '12345678901',
      holderName: 'João da Silva',
      holderEmail: 'joao@startup.com',
      holderPhone: '11999998888',
    };

    it('cria EfiAccountOpening PENDING quando EFI_ENABLED=true', async () => {
      efiAccountAdapter.openAccount.mockResolvedValue({
        id: 'reg_123',
        status: 'PENDING',
        criadoEm: new Date().toISOString(),
      });

      const result = await service.openAccount(dto, 1);

      expect(efiAccountAdapter.openAccount).toHaveBeenCalledWith({
        holder: {
          tipo: 'PF',
          nome: 'João da Silva',
          email: 'joao@startup.com',
          phone: '11999998888',
          cpfCnpj: '12345678901',
        },
        bank: {
          bankCode: '000',
          agency: '0001',
          account: '00000000',
          accountType: 'checking',
        },
      });
      expect(result.status).toBe('PENDING');
      expect(result.userId).toBe(1);
      expect(result.efiRegistrationId).toBe('reg_123');
    });

    it('determina tipo PJ quando documento tem 14 dígitos', async () => {
      efiAccountAdapter.openAccount.mockResolvedValue({
        id: 'reg_456',
        status: 'PENDING',
        criadoEm: new Date().toISOString(),
      });

      const cnpjDto: OpenAccountDto = {
        holderDocument: '12345678000199',
        holderName: 'Startup XYZ LTDA',
        holderEmail: 'financeiro@startup.com',
      };

      await service.openAccount(cnpjDto, 2);

      expect(efiAccountAdapter.openAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          holder: expect.objectContaining({
            tipo: 'PJ',
            cpfCnpj: '12345678000199',
          }),
        }),
      );
    });

    it('throws 409 quando user já tem conta APPROVED', async () => {
      // Simula que o user 10 já tem conta APPROVED no store (test isolation:
      // precisamos de userId diferente dos outros testes)
      (service as any).findByUserId = jest.fn().mockReturnValue([
        {
          id: 'existing_acc',
          userId: 10,
          holderDocument: dto.holderDocument,
          holderName: dto.holderName,
          holderEmail: dto.holderEmail,
          efiRegistrationId: 'reg_existing',
          status: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Tentativa de segunda abertura
      await expect(service.openAccount(dto, 10)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.openAccount(dto, 10)).rejects.toMatchObject({
        response: { code: 'account_already_open' },
      });
    });

    it('throws 503 quando EFI_ENABLED=false', async () => {
      (ff as any).efiEnabled = false;

      await expect(service.openAccount(dto, 1)).rejects.toThrow(
        ServiceUnavailableException,
      );
      await expect(service.openAccount(dto, 1)).rejects.toMatchObject({
        response: {
          message: 'EFI_ENABLED=false — abertura de conta desabilitada',
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // handleWebhook
  // -------------------------------------------------------------------------
  describe('handleWebhook', () => {
    it('atualiza status para APPROVED quando webhook recebe APPROVED', async () => {
      // Cria conta primeiro
      efiAccountAdapter.openAccount.mockResolvedValue({
        id: 'reg_webhook_test',
        status: 'PENDING',
        criadoEm: new Date().toISOString(),
      });
      await service.openAccount(
        {
          holderDocument: '98765432101',
          holderName: 'Test',
          holderEmail: 'test@test.com',
        },
        100,
      );

      const payload: EfiAccountWebhookPayload = {
        accountId: 'reg_webhook_test',
        status: 'APPROVED',
      };

      const result = await service.handleWebhook(payload);

      expect(result).toEqual({ received: true });
      expect(auditService.log).toHaveBeenCalledWith({
        userId: null,
        action: 'EFI_ACCOUNT_STATUS_CHANGED',
        entity: 'EfiAccountOpening',
        entityId: expect.any(String),
        oldValue: { status: 'PENDING' },
        newValue: { status: 'APPROVED' },
      });
    });

    it('ack sempre (mesmo quando accountId não encontrada)', async () => {
      const payload: EfiAccountWebhookPayload = {
        accountId: 'unknown_account_id',
        status: 'APPROVED',
      };

      const result = await service.handleWebhook(payload);

      expect(result).toEqual({ received: true });
      // Não lança, não retorna erro — ack puro
    });

    it('registra rejectionReason quando status é REJECTED', async () => {
      efiAccountAdapter.openAccount.mockResolvedValue({
        id: 'reg_reject_test',
        status: 'PENDING',
        criadoEm: new Date().toISOString(),
      });
      await service.openAccount(
        {
          holderDocument: '11122233344',
          holderName: 'Reject Test',
          holderEmail: 'reject@test.com',
        },
        200,
      );

      const payload: EfiAccountWebhookPayload = {
        accountId: 'reg_reject_test',
        status: 'REJECTED',
        rejectionReason: 'Documentos inválidos',
      };

      await service.handleWebhook(payload);

      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          newValue: { status: 'REJECTED' },
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // listMine
  // -------------------------------------------------------------------------
  describe('listMine', () => {
    it('retorna lista vazia quando user não tem aberturas', async () => {
      const result = await service.listMine(999);
      expect(result).toEqual([]);
    });

    it('retorna aberturas do user ordenadas por createdAt desc', async () => {
      efiAccountAdapter.openAccount.mockResolvedValue({
        id: 'reg_list_1',
        status: 'PENDING',
        criadoEm: new Date().toISOString(),
      });
      await service.openAccount(
        {
          holderDocument: '12345678901',
          holderName: 'User List',
          holderEmail: 'list@test.com',
        },
        300,
      );

      const result = await service.listMine(300);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe(300);
    });
  });
});
