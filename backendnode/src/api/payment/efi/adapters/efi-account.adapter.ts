import { Injectable, Logger } from '@nestjs/common';
import {
  EfiAccountHolder,
  EfiAccountOpeningRequest,
  EfiAccountOpeningResponse,
} from '../entities/efi.types';
import { EfiBaseClient } from '../efi-base.client';

/**
 * Adapter 6: EFI Account Opening
 *
 * Responsibilities:
 * - Initiate digital account opening (open account)
 * - Track application status
 * - Handle approval/rejection notifications
 *
 * API Docs: https://api-pix-h.gerencianet.com.br/doc/v2/accounts
 */
@Injectable()
export class EfiAccountAdapter {
  private readonly logger = new Logger(EfiAccountAdapter.name);

  constructor(private readonly baseClient: EfiBaseClient) {}

  /**
   * Initiates a digital account opening request.
   *
   * @param holder Account holder information
   * @param bank Bank details for the account
   */
  async openAccount(params: {
    holder: EfiAccountHolder;
    bank: {
      bankCode: string;
      agency: string;
      account: string;
      accountType: 'checking' | 'savings';
    };
  }): Promise<EfiAccountOpeningResponse> {
    const { holder, bank } = params;

    if (this.baseClient.isMock) {
      return this.mockAccountOpeningResponse();
    }

    const request: EfiAccountOpeningRequest = {
      titular: holder,
      banco: bank.bankCode,
      agencia: bank.agency,
      conta: bank.account,
      tipoConta: bank.accountType,
    };

    const response = await this.baseClient.request<EfiAccountOpeningResponse>(
      '/v2/accounts',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );

    this.logger.log(`Account opening initiated: ${response.id}`);
    return response;
  }

  /**
   * Gets the status of an account opening request.
   */
  async getAccountStatus(
    registrationId: string,
  ): Promise<EfiAccountOpeningResponse> {
    if (this.baseClient.isMock) {
      return this.mockAccountOpeningResponse();
    }

    return this.baseClient.request<EfiAccountOpeningResponse>(
      `/v2/accounts/${registrationId}`,
    );
  }

  /**
   * Cancels a pending account opening request.
   */
  async cancelAccountOpening(
    registrationId: string,
  ): Promise<EfiAccountOpeningResponse> {
    if (this.baseClient.isMock) {
      return {
        ...this.mockAccountOpeningResponse(),
        status: 'CANCELLED',
      };
    }

    return this.baseClient.request<EfiAccountOpeningResponse>(
      `/v2/accounts/${registrationId}`,
      {
        method: 'DELETE',
      },
    );
  }

  /**
   * Validates holder data before submission.
   */
  validateHolder(holder: EfiAccountHolder): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!holder.nome || holder.nome.length < 2) {
      errors.push('Nome is required (min 2 chars)');
    }

    if (!holder.email || !holder.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!holder.phone || holder.phone.length < 10) {
      errors.push('Valid phone is required');
    }

    if (!holder.cpfCnpj) {
      errors.push('CPF/CNPJ is required');
    } else if (holder.tipo === 'PF' && !holder.cpfCnpj.match(/^\d{11}$/)) {
      errors.push('CPF must be 11 digits');
    } else if (holder.tipo === 'PJ' && !holder.cpfCnpj.match(/^\d{14}$/)) {
      errors.push('CNPJ must be 14 digits');
    }

    if (holder.tipo === 'PF') {
      if (!holder.cnh) {
        errors.push('CNH is required for PF');
      }
      if (!holder.birthDate) {
        errors.push('Birth date is required for PF');
      }
    }

    if (holder.tipo === 'PJ') {
      if (!holder.companyName) {
        errors.push('Company name is required for PJ');
      }
      if (!holder.foundingDate) {
        errors.push('Founding date is required for PJ');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private mockAccountOpeningResponse(): EfiAccountOpeningResponse {
    return {
      id: `reg_${Date.now()}`,
      status: 'PENDING',
      criadoEm: new Date().toISOString(),
    };
  }
}
