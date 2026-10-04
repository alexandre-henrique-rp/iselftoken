import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { HttpException } from '@nestjs/common';

describe('WalletService', () => {
  let service: WalletService;

  const mockWallet = {
    id: 1,
    userId: 1,
    balance: 5000,
    blocked: 500,
    currency: 'BRL',
    transactions: [],
  };

  const mockPrismaService = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      update: jest.fn(),
    },
    investment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('deve retornar balance, blocked e currency', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.getWallet(1);

      expect(result.error).toBe(false);
      expect(result.data.balance).toBe(5000);
      expect(result.data.blocked).toBe(500);
      expect(result.data.currency).toBe('BRL');
    });

    it('deve criar carteira se não existir', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);
      mockPrismaService.wallet.create.mockResolvedValue({
        ...mockWallet,
        id: 2,
        balance: 0,
        blocked: 0,
        transactions: [],
      });

      const result = await service.getWallet(1);

      expect(result.error).toBe(false);
      expect(mockPrismaService.wallet.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 1,
            balance: 0,
            blocked: 0,
            currency: 'BRL',
          }),
        }),
      );
    });

    it('deve retornar transações ordenadas por createdAt desc', async () => {
      const walletWithTx = {
        ...mockWallet,
        transactions: [
          {
            id: 1,
            type: 'DEPOSIT',
            amount: 1000,
            description: 'PIX',
            createdAt: new Date('2026-05-01'),
          },
          {
            id: 2,
            type: 'WITHDRAWAL',
            amount: 500,
            description: 'Saque',
            createdAt: new Date('2026-04-30'),
          },
        ],
      };
      mockPrismaService.wallet.findUnique.mockResolvedValue(walletWithTx);

      const result = await service.getWallet(1);

      expect(result.data.transactions).toHaveLength(2);
      expect(result.data.transactions[0].type).toBe('DEPOSIT');
    });
  });

  describe('deposit', () => {
    it('deve gerar PIX para depósito com txid único', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        nome: 'João Silva',
        email: 'joao@test.com',
      });
      mockPrismaService.wallet.upsert.mockResolvedValue({ id: 1, userId: 1 });
      mockPrismaService.walletTransaction.create.mockResolvedValue({ id: 77 });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 10,
        userId: 1,
        amount: 1000,
        method: 'PIX',
        status: 'PENDING',
        txid: 'DEP123',
        qrCodeBase64: null,
        copyPastePix: null,
      });
      mockPrismaService.payment.update.mockResolvedValue({});

      const result = await service.deposit(1, { amount: 1000 });

      expect(result.error).toBe(false);
      expect(result.data.txid).toMatch(/^DEP/);
      expect(result.data.amount).toBe(1000);
      expect(result.data.expiresAt).toBeDefined();
    });

    it('deve lançar 404 se usuário não existir', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deposit(999, { amount: 100 })).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('withdraw', () => {
    it('deve criar transação de saque com status pending', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrismaService.walletTransaction.create.mockResolvedValue({
        id: 50,
        type: 'WITHDRAWAL',
        amount: 200,
      });
      mockPrismaService.wallet.update.mockResolvedValue({});

      const result = await service.withdraw(1, {
        amount: 200,
        banco: '001',
        agencia: '1234',
        conta: '56789-0',
        tipoConta: 'CORRENTE',
        titular: 'João Silva',
      });

      expect(result.error).toBe(false);
      expect(result.data.status).toBe('pending');
      expect(result.data.bankInfo.banco).toBe('001');
      expect(result.data.bankInfo.agencia).toBe('1234');
      expect(result.data.bankInfo.conta).toBe('56789-0');
    });

    it('deve lançar erro se saldo insuficiente', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(
        service.withdraw(1, {
          amount: 99999,
          banco: '001',
          agencia: '1234',
          conta: '56789-0',
          tipoConta: 'CORRENTE',
          titular: 'João Silva',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('deve lançar 404 se carteira não existir', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);

      await expect(
        service.withdraw(999, {
          amount: 100,
          banco: '001',
          agencia: '1234',
          conta: '56789-0',
          tipoConta: 'CORRENTE',
          titular: 'João Silva',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('deve bloquear o valor do saque (decrement balance, increment blocked)', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      mockPrismaService.walletTransaction.create.mockResolvedValue({ id: 50 });
      mockPrismaService.wallet.update.mockResolvedValue({});

      await service.withdraw(1, {
        amount: 200,
        banco: '001',
        agencia: '1234',
        conta: '56789-0',
        tipoConta: 'CORRENTE',
        titular: 'João Silva',
      });

      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: { decrement: 200 },
            blocked: { increment: 200 },
          }),
        }),
      );
    });
  });

  describe('approveWithdraw', () => {
    it('deve desbloquear o valor ao aprovar saque', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 50,
        walletId: 1,
        amount: 200,
        wallet: { id: 1 },
      });
      mockPrismaService.wallet.update.mockResolvedValue({});

      const result = await service.approveWithdraw(50, 1);

      expect(result.error).toBe(false);
      expect(result.data.status).toBe('approved');
    });
  });

  describe('rejectWithdraw', () => {
    it('deve estornar o valor ao rejeitar saque', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue({
        id: 50,
        walletId: 1,
        amount: 200,
        wallet: { id: 1 },
      });
      mockPrismaService.wallet.update.mockResolvedValue({});

      const result = await service.rejectWithdraw(50);

      expect(result.error).toBe(false);
      expect(result.data.status).toBe('rejected');
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            balance: { increment: 200 },
            blocked: { decrement: 200 },
          }),
        }),
      );
    });

    it('deve lançar 404 se transação não existir', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue(null);
      await expect(service.rejectWithdraw(999)).rejects.toThrow(HttpException);
    });
  });

  describe('approveWithdraw', () => {
    it('deve lançar 404 se transação não existir', async () => {
      mockPrismaService.walletTransaction.findUnique.mockResolvedValue(null);
      await expect(service.approveWithdraw(999, 1)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('deposit', () => {
    it('deve retornar error quando payment.create falha', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        nome: 'João Silva',
        email: 'joao@test.com',
      });
      mockPrismaService.payment.create.mockRejectedValue(
        new Error('Falha ao criar pagamento'),
      );

      const result = await service.deposit(1, { amount: 1000 });

      expect(result.error).toBe(true);
      expect(result.codigo).toBe(500);
    });

    it('deve retornar txid começando com DEP e expiresAt 24h à frente', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        nome: 'João Silva',
        email: 'joao@test.com',
      });
      mockPrismaService.wallet.upsert.mockResolvedValue({ id: 1, userId: 1 });
      mockPrismaService.walletTransaction.create.mockResolvedValue({ id: 78 });
      mockPrismaService.payment.create.mockResolvedValue({
        id: 10,
        userId: 1,
        amount: 500,
        method: 'PIX',
        status: 'PENDING',
        txid: 'DEPX1Y2Z3',
        qrCodeBase64: null,
        copyPastePix: null,
      });
      mockPrismaService.payment.update.mockResolvedValue({});

      const result = await service.deposit(1, { amount: 500 });

      expect(result.error).toBe(false);
      expect(result.data.txid).toMatch(/^DEP/);
      const hours =
        (result.data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
      expect(hours).toBeGreaterThanOrEqual(23.9);
      expect(hours).toBeLessThanOrEqual(24.1);
    });

    it('deve retornar error quando user não existe', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.deposit(999, { amount: 100 })).rejects.toThrow(
        HttpException,
      );
    });
  });
});

describe('WalletService — getAssets (F2 wallet-assets)', () => {
  let service: WalletService;

  const fullInvestment = {
    id: 42,
    amount: 1200,
    platformFeeAmount: 60,
    status: 'CONFIRMED',
    createdAt: new Date('2026-10-04T12:00:00.000Z'),
    campaign: {
      id: 7,
      title: 'Rodada Série A',
      status: 'OPEN',
      startup: {
        id: 15,
        nome: 'Acme LTDA',
        slug: 'acme',
        area_atuacao: 'Tecnologia',
        logo: { url_sm: 'https://cdn/acme-sm.png', url: 'https://cdn/acme.png' },
      },
    },
    tokens: [
      {
        id: 'token-a',
        hash: 'aaaaaaaaaaaaaaaa' + 'aaaa' + '12345678',
        quantity: 1,
        purchaseVal: 240,
        currentVal: 240,
        dtAquisicao: new Date('2026-10-04T12:00:00.000Z'),
        investmentId: 42,
      },
      {
        id: 'token-b',
        hash: 'bbbbbbbbbbbbbbbb' + 'bbbb' + '87654321',
        quantity: 1,
        purchaseVal: 240,
        currentVal: 250,
        dtAquisicao: new Date('2026-10-04T12:00:01.000Z'),
        investmentId: 42,
      },
    ],
  };

  const mockPrismaServiceForAssets = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    walletTransaction: { create: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    payment: { create: jest.fn(), update: jest.fn() },
    investment: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrismaServiceForAssets },
      ],
    }).compile();
    service = module.get<WalletService>(WalletService);
  });

  afterEach(() => jest.clearAllMocks());

  it('agrupa tokens por investment com shortCode e calcula currentValue', async () => {
    mockPrismaServiceForAssets.investment.findMany.mockResolvedValue([
      fullInvestment,
    ]);

    const result = await service.getAssets(7);

    expect(result.error).toBe(false);
    expect(result.codigo).toBe(200);
    expect(result.data.assets).toHaveLength(1);
    const asset = result.data.assets[0];
    expect(asset).toEqual(
      expect.objectContaining({
        investmentId: 42,
        startupId: 15,
        startupName: 'Acme LTDA',
        startupSlug: 'acme',
        startupLogoUrl: 'https://cdn/acme-sm.png',
        startupCategory: 'Tecnologia',
        campaignTitle: 'Rodada Série A',
        campaignStatus: 'OPEN',
        tokensCount: 2,
        investedAmount: 1200,
        platformFeeAmount: 60,
        totalCharged: 1260,
        currentValue: 490, // 240 + 250
        investmentStatus: 'CONFIRMED',
      }),
    );
    expect(asset.tokens).toHaveLength(2);
    expect(asset.tokens[0]).toEqual(
      expect.objectContaining({
        id: 'token-a',
        shortCode: '12345678',
        purchaseVal: 240,
        currentVal: 240,
        investmentId: 42,
      }),
    );
    expect(asset.tokens[1].shortCode).toBe('87654321');
    expect(result.data.tokensCount).toBe(2);
    expect(result.data.startupsCount).toBe(1);
    expect(result.data.averageRoi).toBeCloseTo(-59.17, 1); // (490-1260)/1260
  });

  it('retorna lista vazia e averageRoi=0 quando o usuário não tem investimentos', async () => {
    mockPrismaServiceForAssets.investment.findMany.mockResolvedValue([]);

    const result = await service.getAssets(7);

    expect(result.error).toBe(false);
    expect(result.data).toEqual({
      assets: [],
      startupsCount: 0,
      tokensCount: 0,
      averageRoi: 0,
    });
  });

  it('totalCharged cai para investedAmount quando platformFeeAmount é null (legado)', async () => {
    const legacy = {
      ...fullInvestment,
      id: 99,
      amount: 1000,
      platformFeeAmount: null,
    };
    mockPrismaServiceForAssets.investment.findMany.mockResolvedValue([legacy]);

    const result = await service.getAssets(7);

    const asset = result.data.assets[0];
    expect(asset.investedAmount).toBe(1000);
    expect(asset.platformFeeAmount).toBeNull();
    expect(asset.totalCharged).toBe(1000);
  });
});
