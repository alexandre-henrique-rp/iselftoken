/**
 * @description Calcula parcelamento com juros compostos.
 * Formula: M = P × (1 + i)^n, parcela = M / n
 *
 * @param principal Valor total (ex: 1000.00)
 * @param n Numero de parcelas (1..18)
 * @param rate Taxa de juros mensal (ex: 0.0299 = 2.99%)
 * @returns Snapshot congelado no momento da criacao do Payment
 */
import { Injectable, BadRequestException, Logger } from '@nestjs/common';

export interface InstallmentSnapshot {
  principal: number;
  installments: number;
  interestRate: number;
  totalWithInterest: number;
  installmentAmount: number;
  totalInterest: number;
  configVersion?: number;
}

@Injectable()
export class InstallmentCalculatorService {
  private readonly logger = new Logger(InstallmentCalculatorService.name);

  calculateInstallments(
    principal: number,
    n: number,
    rate: number,
  ): InstallmentSnapshot {
    if (n < 1) {
      throw new BadRequestException('installments must be >= 1');
    }
    if (n > 18) {
      throw new BadRequestException('installments must be <= 18');
    }
    if (principal <= 0) {
      throw new BadRequestException('principal must be > 0');
    }
    if (rate < 0) {
      throw new BadRequestException('rate must be >= 0');
    }

    if (n === 1) {
      return {
        principal,
        installments: 1,
        interestRate: rate,
        totalWithInterest: this.round(principal),
        installmentAmount: this.round(principal),
        totalInterest: 0,
      };
    }

    // Juros compostos: M = P × (1 + i)^n
    const totalWithInterest = this.round(principal * Math.pow(1 + rate, n));
    const installmentAmount = this.round(totalWithInterest / n);
    const totalInterest = this.round(totalWithInterest - principal);

    return {
      principal,
      installments: n,
      interestRate: rate,
      totalWithInterest,
      installmentAmount,
      totalInterest,
    };
  }

  /**
   * Arredonda para 2 casas decimais (round half-up).
   */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
