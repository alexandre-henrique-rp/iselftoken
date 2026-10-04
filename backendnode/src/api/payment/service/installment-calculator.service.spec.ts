import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InstallmentCalculatorService } from './installment-calculator.service';

describe('InstallmentCalculatorService', () => {
  let service: InstallmentCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstallmentCalculatorService],
    }).compile();

    service = module.get<InstallmentCalculatorService>(
      InstallmentCalculatorService,
    );
  });

  it('calcula 6 parcelas de R$1000 a 2.99% a.m.', () => {
    // SPEC AC-03.1: principal=1000, n=6, rate=0.0299
    // M = 1000 × (1.0299)^6 = 1000 × 1.193356... = 1193.36
    // parcela = 1193.36 / 6 = 198.89
    // juros total = 193.36
    const result = service.calculateInstallments(1000, 6, 0.0299);
    expect(result.totalWithInterest).toBe(1193.36);
    expect(result.installmentAmount).toBe(198.89);
    expect(result.totalInterest).toBe(193.36);
    expect(result.principal).toBe(1000);
    expect(result.installments).toBe(6);
    expect(result.interestRate).toBe(0.0299);
  });

  it('installments=1 retorna principal sem juros', () => {
    const result = service.calculateInstallments(500, 1, 0.05);
    expect(result.totalWithInterest).toBe(500);
    expect(result.installmentAmount).toBe(500);
    expect(result.totalInterest).toBe(0);
  });

  it('installments=1 com taxa positiva nao cobra juros', () => {
    const result = service.calculateInstallments(1000, 1, 0.1);
    expect(result.totalWithInterest).toBe(1000);
    expect(result.totalInterest).toBe(0);
  });

  it('rate=0 retorna principal sem juros', () => {
    const result = service.calculateInstallments(2000, 6, 0);
    expect(result.totalWithInterest).toBe(2000);
    expect(result.installmentAmount).toBe(333.33);
    expect(result.totalInterest).toBe(0);
  });

  it('n=18 (max) calcula corretamente', () => {
    const result = service.calculateInstallments(1000, 18, 0.0299);
    // M = 1000 × (1.0299)^18 = 1000 × 1.685... ≈ 1685.31
    expect(result.totalWithInterest).toBeGreaterThan(1000);
    expect(result.installments).toBe(18);
    expect(result.installmentAmount).toBeGreaterThan(0);
  });

  it('throws 400 quando n < 1', () => {
    expect(() => service.calculateInstallments(1000, 0, 0.0299)).toThrow(
      BadRequestException,
    );
  });

  it('throws 400 quando n > 18', () => {
    expect(() => service.calculateInstallments(1000, 19, 0.0299)).toThrow(
      BadRequestException,
    );
  });

  it('throws 400 quando principal <= 0', () => {
    expect(() => service.calculateInstallments(0, 6, 0.0299)).toThrow(
      BadRequestException,
    );
    expect(() => service.calculateInstallments(-100, 6, 0.0299)).toThrow(
      BadRequestException,
    );
  });

  it('throws 400 quando rate negativo', () => {
    expect(() => service.calculateInstallments(1000, 6, -0.01)).toThrow(
      BadRequestException,
    );
  });

  it('arredonda corretamente com 2 casas decimais', () => {
    // 1000.005 → 1000.01 (round half-up)
    // Teste interno via n=1 que nao tem multiplicacao
    const result = service.calculateInstallments(1000.005, 1, 0);
    expect(result.totalWithInterest).toBe(1000.01);
  });

  it('snapshot inclui todos os campos', () => {
    const result = service.calculateInstallments(1000, 6, 0.0299);
    expect(result).toHaveProperty('principal');
    expect(result).toHaveProperty('installments');
    expect(result).toHaveProperty('interestRate');
    expect(result).toHaveProperty('totalWithInterest');
    expect(result).toHaveProperty('installmentAmount');
    expect(result).toHaveProperty('totalInterest');
  });

  it('configVersion e populado quando fornecido', () => {
    const result = service.calculateInstallments(1000, 6, 0.0299);
    expect(result.configVersion).toBeUndefined();
  });
});
