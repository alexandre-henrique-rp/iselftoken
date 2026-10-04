import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { TransferDto } from '../dto/transfer.dto';

/**
 * Resultado de uma operação de cash-out.
 */
export interface TransferResult {
  /** ID único da transferência (mock ou real). */
  transferId: string;
  /** Status atual da transferência. */
  status: 'PROCESSING';
  /** Estimativa de chegada dos fundos. */
  estimatedArrival: string;
}

/**
 * Serviço de cash-out (saque) via PIX ou TED.
 *
 * Este é um MOCK — a integração real com EFI Bank / партнер de TED
 * será implementada em sprint futura. O serviço apenas:
 * 1. Valida o valor
 * 2. Gera um transferId mock
 * 3. Retorna status PROCESSING com ETA
 *
 * LGPD: dados bancários do beneficiário NÃO são logados em plaintext.
 */
@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  /**
   * Executa cash-out (PIX ou TED).
   *
   * @param dto    - Dados da transferência
   * @param userId - ID do usuário que solicita o saque
   * @returns TransferResult com transferId, status e ETA
   * @throws BadRequestException se amount <= 0
   */
  async transfer(dto: TransferDto, userId: number): Promise<TransferResult> {
    if (dto.amount <= 0) {
      throw new BadRequestException('amount must be greater than 0');
    }

    // TODO: integrar com EFI Bank (PIX) ou parceiro TED quando pronto
    // Por ora: mock com logging

    const transferId = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // ETA: PIX ~1min, TED ~24h
    const estimatedArrival =
      dto.method === 'PIX'
        ? new Date(Date.now() + 60 * 1000).toISOString()
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    this.logger.log(
      `[TRANSFER MOCK] user=${userId} method=${dto.method} ` +
        `amount=${dto.amount} to ${dto.destinationHolderName} ` +
        `(bank=${dto.destinationBankCode}) transferId=${transferId}`,
    );

    return {
      transferId,
      status: 'PROCESSING',
      estimatedArrival,
    };
  }
}
