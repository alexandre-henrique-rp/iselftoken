import { Injectable, Logger } from '@nestjs/common';
import { EfiSplitRequest, EfiSplitResponse } from '../entities/efi.types';
import { EfiBaseClient } from '../efi-base.client';

/**
 * Adapter 5: EFI Split Configuration
 *
 * Responsibilities:
 * - Manage PIX split configurations
 * - Create/update split rules for marketplace payments
 *
 * API Docs: https://api-pix-h.gerencianet.com.br/doc/v2/split
 */
@Injectable()
export class EfiSplitAdapter {
  private readonly logger = new Logger(EfiSplitAdapter.name);

  constructor(private readonly baseClient: EfiBaseClient) {}

  /**
   * Creates a new split configuration.
   *
   * @param config Split configuration with recipients
   */
  async createSplit(config: {
    name: string;
    granularity: 'TOTAL' | 'TRANSAÇÃO';
    recipients: Array<{
      cnpj: string;
      value?: string;
      percentage?: number;
    }>;
  }): Promise<EfiSplitResponse> {
    if (this.baseClient.isMock) {
      return this.mockSplitResponse();
    }

    const request: EfiSplitRequest = {
      granularidade: config.granularity,
      retencoes: config.recipients.map((r) => ({
        cnpj: r.cnpj,
        valor: r.value ?? '0',
        percentual: r.percentage,
      })),
    };

    const response = await this.baseClient.request<EfiSplitResponse>(
      '/v2/gn/split/config',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );

    this.logger.log(`Created split config ${response.id}: ${response.nome}`);
    return response;
  }

  /**
   * Gets a split configuration by ID.
   */
  async getSplit(splitId: number): Promise<EfiSplitResponse> {
    if (this.baseClient.isMock) {
      return this.mockSplitResponse();
    }

    return this.baseClient.request<EfiSplitResponse>(
      `/v2/gn/split/config/${splitId}`,
    );
  }

  /**
   * Updates a split configuration.
   */
  async updateSplit(
    splitId: number,
    config: Partial<EfiSplitRequest>,
  ): Promise<EfiSplitResponse> {
    if (this.baseClient.isMock) {
      return this.mockSplitResponse();
    }

    return this.baseClient.request<EfiSplitResponse>(
      `/v2/gn/split/config/${splitId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(config),
      },
    );
  }

  /**
   * Lists all split configurations.
   */
  async listSplits(): Promise<{
    configuracoes: EfiSplitResponse[];
  }> {
    if (this.baseClient.isMock) {
      return {
        configuracoes: [this.mockSplitResponse()],
      };
    }

    return this.baseClient.request<{ configuracoes: EfiSplitResponse[] }>(
      '/v2/gn/split/config',
    );
  }

  /**
   * Calculates split amounts for a given total.
   * Useful for preview before creating a split config.
   */
  calculateSplit(
    totalAmount: number,
    recipients: Array<{
      cnpj: string;
      percentage: number;
    }>,
  ): Array<{
    cnpj: string;
    amount: number;
    percentage: number;
  }> {
    return recipients.map((r) => ({
      cnpj: r.cnpj,
      percentage: r.percentage,
      amount: Math.round(totalAmount * (r.percentage / 100) * 100) / 100,
    }));
  }

  private mockSplitResponse(): EfiSplitResponse {
    return {
      id: Math.floor(Math.random() * 10000),
      nome: 'Split Configuration (Mock)',
      granularidade: 'TRANSAÇÃO',
      retencoes: [
        {
          cnpj: '12345678000199',
          valor: 9500,
          tipo: 'PORCENTAGEM',
          percentual: 95,
        },
        {
          cnpj: '98765432000188',
          valor: 500,
          tipo: 'PORCENTAGEM',
          percentual: 5,
        },
      ],
      criacao: new Date().toISOString(),
      atualizar: false,
    };
  }
}
