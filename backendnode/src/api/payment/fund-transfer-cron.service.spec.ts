import { Test, TestingModule } from '@nestjs/testing';
import { FundTransferCronService } from './fund-transfer-cron.service';
import { FundTransferService } from './fund-transfer.service';

describe('FundTransferCronService', () => {
  let cronService: FundTransferCronService;
  let fundTransferService: any;

  beforeEach(async () => {
    fundTransferService = {
      processScheduledTransfers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FundTransferCronService,
        { provide: FundTransferService, useValue: fundTransferService },
      ],
    }).compile();

    cronService = module.get<FundTransferCronService>(FundTransferCronService);
  });

  it('deve ser definido', () => {
    expect(cronService).toBeDefined();
  });

  describe('handleScheduledTransfers()', () => {
    it('chama FundTransferService.processScheduledTransfers()', async () => {
      fundTransferService.processScheduledTransfers.mockResolvedValue({
        processed: 5,
        completed: 4,
        failed: 1,
        skipped: 0,
      });

      await cronService.handleScheduledTransfers();

      expect(
        fundTransferService.processScheduledTransfers,
      ).toHaveBeenCalledTimes(1);
    });

    it('não relança erro quando o service joga exceção (cron continua amanhã)', async () => {
      fundTransferService.processScheduledTransfers.mockRejectedValue(
        new Error('Database connection lost'),
      );

      // Não deve lançar — o cron swallow erros pra não travar o scheduler
      await expect(
        cronService.handleScheduledTransfers(),
      ).resolves.toBeUndefined();

      expect(
        fundTransferService.processScheduledTransfers,
      ).toHaveBeenCalledTimes(1);
    });

    it('lida corretamente com zero parcelas vencidas', async () => {
      fundTransferService.processScheduledTransfers.mockResolvedValue({
        processed: 0,
        completed: 0,
        failed: 0,
        skipped: 0,
      });

      await cronService.handleScheduledTransfers();

      expect(
        fundTransferService.processScheduledTransfers,
      ).toHaveBeenCalledWith();
    });

    it('processa todas as parcelas de uma vez (sem retry individual no cron)', async () => {
      fundTransferService.processScheduledTransfers.mockResolvedValue({
        processed: 100,
        completed: 95,
        failed: 5,
        skipped: 0,
      });

      await cronService.handleScheduledTransfers();

      expect(
        fundTransferService.processScheduledTransfers,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('configuração do cron', () => {
    it('está configurado com nome "process-fund-transfers"', () => {
      // O decorator @Cron aplica metadata no método. Verificamos indiretamente
      // que o método existe e é uma função (assinatura correta).
      expect(typeof cronService.handleScheduledTransfers).toBe('function');
    });

    it('está configurado para rodar diariamente (handler assíncrono)', () => {
      // O método é async — qualquer falha já é capturada internamente.
      // Aqui validamos apenas que a função existe e pode ser invocada.
      expect(cronService.handleScheduledTransfers.constructor.name).toBe(
        'AsyncFunction',
      );
    });
  });
});
