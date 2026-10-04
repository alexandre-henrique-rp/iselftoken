import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FundTransferController } from './fund-transfer.controller';
import { FundTransferService, RepasseStatus } from './fund-transfer.service';
import { AuthGuard } from 'src/auth/auth.guard';

describe('FundTransferController', () => {
  let controller: FundTransferController;
  let service: any;

  const baseRepasseStatus: RepasseStatus = {
    notafiscal: {
      id: 1,
      number: 'NF-2026-000001',
      amount: 30000,
      issuedAt: new Date(),
      status: 'ISSUED',
      xmlUrl: null,
    },
    transfers: [
      {
        id: 11,
        installmentNumber: 1,
        amount: 10000,
        scheduledDate: new Date(),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
      },
      {
        id: 12,
        installmentNumber: 2,
        amount: 10000,
        scheduledDate: new Date(),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
      },
      {
        id: 13,
        installmentNumber: 3,
        amount: 10000,
        scheduledDate: new Date(),
        status: 'PENDING',
        paidAt: null,
        txIdBancario: null,
      },
    ],
    totalRaised: 30000,
    transferStarted: true,
  };

  beforeEach(async () => {
    service = {
      initiateTransfer: jest.fn(),
      getTransferStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FundTransferController],
      providers: [{ provide: FundTransferService, useValue: service }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FundTransferController>(FundTransferController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateTransfer()', () => {
    it('retorna 201 quando repasse recém-criado (NF emitida há < 5s)', async () => {
      const freshStatus = {
        ...baseRepasseStatus,
        notafiscal: { ...baseRepasseStatus.notafiscal, issuedAt: new Date() },
      };
      service.initiateTransfer.mockResolvedValue(freshStatus);

      const req = { user: { id: 100, role: 'FOUNDER' } } as any;
      const result = await controller.initiateTransfer('10', req);

      expect(service.initiateTransfer).toHaveBeenCalledWith(10, 100, 'FOUNDER');
      expect(result.codigo).toBe(HttpStatus.CREATED);
      expect(result.data).toEqual(freshStatus);
    });

    it('retorna 200 quando repasse já existia (NF emitida há > 5s, idempotente)', async () => {
      const oldStatus = {
        ...baseRepasseStatus,
        notafiscal: {
          ...baseRepasseStatus.notafiscal,
          issuedAt: new Date(Date.now() - 60_000),
        },
      };
      service.initiateTransfer.mockResolvedValue(oldStatus);

      const req = { user: { id: 100, role: 'FOUNDER' } } as any;
      const result = await controller.initiateTransfer('10', req);

      expect(result.codigo).toBe(HttpStatus.OK);
      expect(result.message).toMatch(/já estava iniciado/);
    });

    it('repropaga HttpException lançado pelo service (403/404/400)', async () => {
      service.initiateTransfer.mockRejectedValue(
        new HttpException('Você não tem permissão', HttpStatus.FORBIDDEN),
      );

      const req = { user: { id: 999, role: 'USER' } } as any;
      await expect(controller.initiateTransfer('10', req)).rejects.toThrow(
        HttpException,
      );
    });

    it('envolve erro genérico em 500', async () => {
      service.initiateTransfer.mockRejectedValue(new Error('DB offline'));

      const req = { user: { id: 100, role: 'FOUNDER' } } as any;
      await expect(controller.initiateTransfer('10', req)).rejects.toThrow(
        HttpException,
      );
    });

    it('extrai userId e role corretamente do request', async () => {
      service.initiateTransfer.mockResolvedValue(baseRepasseStatus);

      const req = { user: { id: 42, role: 'ADMIN' } } as any;
      await controller.initiateTransfer('99', req);

      expect(service.initiateTransfer).toHaveBeenCalledWith(99, 42, 'ADMIN');
    });
  });

  describe('getTransferStatus()', () => {
    it('retorna o RepasseStatus do service', async () => {
      service.getTransferStatus.mockResolvedValue(baseRepasseStatus);

      const req = { user: { id: 100, role: 'FOUNDER' } } as any;
      const result = await controller.getTransferStatus('10', req);

      expect(service.getTransferStatus).toHaveBeenCalledWith(
        10,
        100,
        'FOUNDER',
      );
      expect(result).toEqual(baseRepasseStatus);
    });

    it('retorna RepasseStatus vazio quando repasse não iniciado', async () => {
      const empty: RepasseStatus = {
        notafiscal: null,
        transfers: [],
        totalRaised: 0,
        transferStarted: false,
      };
      service.getTransferStatus.mockResolvedValue(empty);

      const req = { user: { id: 100, role: 'FOUNDER' } } as any;
      const result = await controller.getTransferStatus('10', req);

      expect(result.notafiscal).toBeNull();
      expect(result.transfers).toHaveLength(0);
    });

    it('repropaga HttpException do service', async () => {
      service.getTransferStatus.mockRejectedValue(
        new HttpException('Startup não encontrada', HttpStatus.NOT_FOUND),
      );

      const req = { user: { id: 100, role: 'FOUNDER' } } as any;
      await expect(controller.getTransferStatus('99999', req)).rejects.toThrow(
        HttpException,
      );
    });

    it('envolve erro genérico em 500', async () => {
      service.getTransferStatus.mockRejectedValue(
        new Error('Falha inesperada'),
      );

      const req = { user: { id: 100, role: 'FOUNDER' } } as any;
      await expect(controller.getTransferStatus('10', req)).rejects.toThrow(
        HttpException,
      );
    });
  });
});
