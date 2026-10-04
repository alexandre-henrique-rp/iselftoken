import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FundTransferService } from './fund-transfer.service';

/**
 * Cron de processamento de parcelas de repasse (B12).
 *
 * Roda diariamente às 09:00 (horário de Brasília / BRT).
 * Para cada FundTransfer com status PENDING e scheduledDate <= agora,
 * chama o gateway C6 (PIX/TED) para executar a transferência e atualiza
 * o status da parcela (COMPLETED / FAILED).
 *
 * Timezone: America/Sao_Paulo (BRT, UTC-3). Garantido pelo segundo
 * argumento de `@Cron`.
 *
 * Decorator:
 * - `name`: identificador único (útil pra monitoring/healthcheck).
 */
@Injectable()
export class FundTransferCronService {
  private readonly logger = new Logger(FundTransferCronService.name);

  constructor(private readonly fundTransferService: FundTransferService) {}

  /**
   * Handler agendado para rodar todos os dias às 09:00 BRT.
   * Delega ao `FundTransferService.processScheduledTransfers()` que
   * faz o trabalho pesado (busca, chamada C6, atualização, audit log).
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'process-fund-transfers',
    timeZone: 'America/Sao_Paulo',
  })
  async handleScheduledTransfers(): Promise<void> {
    const startedAt = Date.now();
    this.logger.log(
      `[process-fund-transfers] Iniciando cron de repasse diário às ${new Date().toISOString()}`,
    );

    try {
      // Sprint S34-f — reagendamento PRIMEIRO: parcelas AWAITING_REQUEST
      // vencidas há >10 dias são empurradas para o próximo mês (sem afetar
      // o ciclo de processamento abaixo). Garante que o fundador sempre
      // tem pelo menos 7 dias no futuro para solicitar cada parcela.
      const reagendadas = await this.fundTransferService
        .reagendarParcelasAtrasadas()
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            `[process-fund-transfers] reagendarParcelasAtrasadas falhou: ${msg}`,
          );
          return { reagendadas: 0, skipped: 0 };
        });

      const result = await this.fundTransferService.processScheduledTransfers();
      const elapsedMs = Date.now() - startedAt;
      this.logger.log(
        `[process-fund-transfers] Concluído em ${elapsedMs}ms — reagendadas=${reagendadas.reagendadas} | processadas=${result.processed} completed=${result.completed} failed=${result.failed} skipped=${result.skipped}`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[process-fund-transfers] Erro inesperado no cron: ${msg}`,
      );
      // Não relança — erro já foi logado. Cron continua rodando amanhã.
    }
  }
}
