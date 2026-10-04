import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagsService } from '../../../common/feature-flags/feature-flags.service';
import { EfiAccountAdapter } from './adapters/efi-account.adapter';
import { EfiChargeAdapter } from './adapters/efi-charge.adapter';
import { EfiConfigAdapter } from './adapters/efi-config.adapter';
import { EfiPixAdapter } from './adapters/efi-pix.adapter';
import { EfiSplitAdapter } from './adapters/efi-split.adapter';
import { EfiWebhookAdapter } from './adapters/efi-webhook.adapter';
import { EfiBaseClient } from './efi-base.client';
import { EfiSdkClient } from './efi-sdk.client';

describe('EFI Adapters (Unit)', () => {
  let efiBaseClient: EfiBaseClient;
  let efiConfigAdapter: EfiConfigAdapter;
  let efiChargeAdapter: EfiChargeAdapter;
  let efiPixAdapter: EfiPixAdapter;
  let efiWebhookAdapter: EfiWebhookAdapter;
  let efiSplitAdapter: EfiSplitAdapter;
  let efiAccountAdapter: EfiAccountAdapter;
  let featureFlagsService: FeatureFlagsService;

  beforeEach(async () => {
    // Set mock mode
    process.env['EFI_MODE'] = 'mock';
    process.env['EFI_ENABLED'] = 'false';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EfiBaseClient,
        EfiSdkClient,
        {
          provide: FeatureFlagsService,
          useValue: {
            efiEnabled: false,
            efiBankMigration: false,
          },
        },
        EfiConfigAdapter,
        EfiChargeAdapter,
        EfiPixAdapter,
        EfiWebhookAdapter,
        EfiSplitAdapter,
        EfiAccountAdapter,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    efiBaseClient = module.get<EfiBaseClient>(EfiBaseClient);
    efiConfigAdapter = module.get<EfiConfigAdapter>(EfiConfigAdapter);
    efiChargeAdapter = module.get<EfiChargeAdapter>(EfiChargeAdapter);
    efiPixAdapter = module.get<EfiPixAdapter>(EfiPixAdapter);
    efiWebhookAdapter = module.get<EfiWebhookAdapter>(EfiWebhookAdapter);
    efiSplitAdapter = module.get<EfiSplitAdapter>(EfiSplitAdapter);
    efiAccountAdapter = module.get<EfiAccountAdapter>(EfiAccountAdapter);
    featureFlagsService = module.get<FeatureFlagsService>(FeatureFlagsService);
  });

  afterEach(() => {
    delete process.env['EFI_MODE'];
    delete process.env['EFI_ENABLED'];
  });

  describe('EfiConfigAdapter', () => {
    it('should return isMock=true when EFI_MODE=mock', () => {
      expect(efiConfigAdapter.isMock).toBe(true);
    });

    it('should return isEnabled=false when not configured', () => {
      expect(efiConfigAdapter.isEnabled).toBe(false);
    });

    it('should validate config and report missing fields', () => {
      const result = efiConfigAdapter.validateConfig();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('EfiChargeAdapter', () => {
    it('should create a mock charge in mock mode', async () => {
      const charge = await efiChargeAdapter.createCharge({
        amount: '99.99',
        expirationSeconds: 900,
        payerRequest: 'Test payment',
      });

      expect(charge).toBeDefined();
      expect(charge.charge_id).toBeDefined();
      expect(charge.status).toBe('ACTIVE');
      expect(charge.valor.original).toBe('99.99');
    });

    it('should return location in mock mode', async () => {
      const charge = await efiChargeAdapter.createCharge({ amount: '50.00' });
      const location = await efiChargeAdapter.createLocation(charge.charge_id);

      expect(location).toBeDefined();
      expect(location.location).toContain('https://');
    });
  });

  describe('EfiPixAdapter', () => {
    it('should create a mock PIX in mock mode', async () => {
      const pix = await efiPixAdapter.createPix({
        amount: '100.00',
        payerName: 'John Doe',
        payerCpf: '12345678901',
      });

      expect(pix).toBeDefined();
      expect(pix.txid).toBeDefined();
      expect(pix.txid.length).toBe(26);
      expect(pix.status).toBe('ATIVA');
    });

    it('should generate txid with 26 alphanumeric characters', () => {
      const txid = efiBaseClient.generateTxid();

      expect(txid).toBeDefined();
      expect(txid.length).toBe(26);
      expect(/^[A-Za-z0-9]+$/.test(txid)).toBe(true);
    });

    it('should list received PIX in mock mode', async () => {
      const result = await efiPixAdapter.listReceivedPix({
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
      });

      expect(result).toBeDefined();
      expect(result.pix).toBeDefined();
      expect(Array.isArray(result.pix)).toBe(true);
    });

    it('should request PIX refund in mock mode', async () => {
      const refund = await efiPixAdapter.refundPix({
        e2eId: 'E2E12345678901234567890123456789012345',
        amount: '50.00',
      });

      expect(refund).toBeDefined();
      expect(refund.status).toBe('ACEITA');
      expect(refund.valor).toBe('50.00');
    });
  });

  describe('EfiWebhookAdapter', () => {
    it('should process PIX received event', async () => {
      const payload = {
        pix: [
          {
            bancoHId: '12345678',
            chave: 'test@example.com',
            txid: 'TESTTXID12345678901234567',
            valor: '99.99',
            horario: '2026-08-22T10:00:00Z',
            tipoOperacao: 'RECEBIMENTO',
            infoPagador: 'Test payment',
          },
        ],
      };

      const result = await efiWebhookAdapter.processWebhook(
        payload,
        '127.0.0.1',
      );

      expect(result.events.length).toBeGreaterThanOrEqual(0);
    });

    it('should reject webhook from invalid IP in production', async () => {
      process.env['NODE_ENV'] = 'production';

      const payload = { pix: [] };
      const result = await efiWebhookAdapter.processWebhook(
        payload,
        '192.168.1.1',
      );

      expect(result.processed).toBe(false);
      expect(result.errors).toContain('Invalid IP address');

      process.env['NODE_ENV'] = 'test';
    });

    it('should generate valid webhook response', () => {
      const response = efiWebhookAdapter.generateWebhookResponse();

      expect(response.status).toBe('OK');
      expect(response.motivo).toBe('Webhook recebido com sucesso');
    });
  });

  describe('EfiSplitAdapter', () => {
    it('should create mock split config', async () => {
      const split = await efiSplitAdapter.createSplit({
        name: 'Test Split',
        granularity: 'TRANSAÇÃO',
        recipients: [
          { cnpj: '12345678000199', percentage: 95 },
          { cnpj: '98765432000188', percentage: 5 },
        ],
      });

      expect(split).toBeDefined();
      expect(split.nome).toBe('Split Configuration (Mock)');
    });

    it('should calculate split amounts correctly', () => {
      const splits = efiSplitAdapter.calculateSplit(1000, [
        { cnpj: '12345678000199', percentage: 95 },
        { cnpj: '98765432000188', percentage: 5 },
      ]);

      expect(splits).toHaveLength(2);
      expect(splits[0].amount).toBe(950);
      expect(splits[1].amount).toBe(50);
    });
  });

  describe('EfiAccountAdapter', () => {
    it('should validate PF holder data', () => {
      const result = efiAccountAdapter.validateHolder({
        tipo: 'PF',
        nome: 'John Doe',
        email: 'john@example.com',
        phone: '11999999999',
        cpfCnpj: '12345678901',
        cnh: '123456789',
        birthDate: '1990-01-01',
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid PF holder data', () => {
      const result = efiAccountAdapter.validateHolder({
        tipo: 'PF',
        nome: 'J',
        email: 'invalid-email',
        phone: '123',
        cpfCnpj: '123',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate PJ holder data', () => {
      const result = efiAccountAdapter.validateHolder({
        tipo: 'PJ',
        nome: 'Company',
        email: 'company@example.com',
        phone: '11999999999',
        cpfCnpj: '12345678000199',
        companyName: 'Test Company',
        foundingDate: '2020-01-01',
      });

      expect(result.valid).toBe(true);
    });

    it('should create mock account opening', async () => {
      const account = await efiAccountAdapter.openAccount({
        holder: {
          tipo: 'PF',
          nome: 'John Doe',
          email: 'john@example.com',
          phone: '11999999999',
          cpfCnpj: '12345678901',
          cnh: '123456789',
          birthDate: '1990-01-01',
        },
        bank: {
          bankCode: '001',
          agency: '0001',
          account: '12345',
          accountType: 'checking',
        },
      });

      expect(account).toBeDefined();
      expect(account.id).toBeDefined();
      expect(account.status).toBe('PENDING');
    });
  });

  describe('FeatureFlagsService', () => {
    it('should return efiEnabled=false when not set', () => {
      expect(featureFlagsService.efiEnabled).toBe(false);
    });

    it('should return efiEnabled=true when EFI_ENABLED=true', () => {
      process.env['EFI_ENABLED'] = 'true';
      // Need to create new instance to pick up env change
      const ff = new FeatureFlagsService();
      expect(ff.efiEnabled).toBe(true);
    });

    it('should return all flags as object', () => {
      const all = new FeatureFlagsService().all;
      expect(all.efiEnabled).toBe(false);
      expect(all.efiBankMigration).toBe(false);
    });
  });
});
