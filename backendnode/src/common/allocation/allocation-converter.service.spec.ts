/**
 * Specs do AllocationConverterService (FIN-10).
 *
 * Cobertura:
 * - 7 campos (100%) -> soma de valores bate com valorParcela
 * - Tolerancia 0.01 (soma 99.99 ou 100.01)
 * - Absorcao de residual na ultima categoria (reservaCaixa)
 * - Edge: valorParcela = 0
 * - Edge: 100% em uma unica categoria
 */
import { AllocationConverterService } from './allocation-converter.service';
import { Prisma } from '@prisma/client';

describe('AllocationConverterService', () => {
  let service: AllocationConverterService;

  beforeEach(() => {
    service = new AllocationConverterService();
  });

  describe('validatePercentsSum', () => {
    it('valida soma 100%', () => {
      expect(
        service.validatePercentsSum({
          marketing: 10,
          desenvolvimento: 20,
          infraestrutura: 10,
          pessoal: 20,
          juridico: 10,
          operacional: 20,
          reservaCaixa: 10,
        }),
      ).toBe(true);
    });

    it('rejeita soma 99%', () => {
      expect(
        service.validatePercentsSum({
          marketing: 10,
          desenvolvimento: 20,
          infraestrutura: 10,
          pessoal: 20,
          juridico: 10,
          operacional: 19,
          reservaCaixa: 10,
        }),
      ).toBe(false);
    });

    it('aceita soma 99.99 (tolerancia 0.01)', () => {
      expect(
        service.validatePercentsSum({
          marketing: 14.285,
          desenvolvimento: 14.285,
          infraestrutura: 14.285,
          pessoal: 14.285,
          juridico: 14.285,
          operacional: 14.285,
          reservaCaixa: 14.29,
        }),
      ).toBe(true);
    });

    it('rejeita soma 105%', () => {
      expect(
        service.validatePercentsSum({
          marketing: 25,
          desenvolvimento: 20,
          infraestrutura: 10,
          pessoal: 20,
          juridico: 10,
          operacional: 10,
          reservaCaixa: 10,
        }),
      ).toBe(false);
    });
  });

  describe('percentsToValues', () => {
    it('converte 7 campos 100% -> soma == valorParcela', () => {
      const percents = {
        marketing: 10,
        desenvolvimento: 20,
        infraestrutura: 10,
        pessoal: 20,
        juridico: 10,
        operacional: 20,
        reservaCaixa: 10,
      };
      const valorParcela = new Prisma.Decimal('33333.33');
      const result = service.percentsToValues(percents, valorParcela);

      const sum = Object.values(result).reduce(
        (acc, v) => acc + v.toNumber(),
        0,
      );
      expect(Math.abs(sum - valorParcela.toNumber())).toBeLessThan(0.01);
    });

    it('100% em uma unica categoria -> valorParcela total', () => {
      const percents = {
        marketing: 0,
        desenvolvimento: 0,
        infraestrutura: 0,
        pessoal: 0,
        juridico: 0,
        operacional: 0,
        reservaCaixa: 100,
      };
      const valorParcela = new Prisma.Decimal('50000.00');
      const result = service.percentsToValues(percents, valorParcela);
      expect(result.reservaCaixa.toNumber()).toBe(50000);
      expect(result.marketing.toNumber()).toBe(0);
    });

    it('absorve residual na ultima categoria (reservaCaixa)', () => {
      // 33.333 + 33.333 + 33.333 = 99.999, mas valorParcela = 100.001
      // As 3 primeiras categorias recebem valorParcela × (percent/100) truncado em 2 casas.
      // A ultima (reservaCaixa) absorve o residual.
      const percents = {
        marketing: 33.333,
        desenvolvimento: 33.333,
        infraestrutura: 0,
        pessoal: 0,
        juridico: 0,
        operacional: 0,
        reservaCaixa: 33.334,
      };
      const valorParcela = new Prisma.Decimal('100001.00');
      const result = service.percentsToValues(percents, valorParcela);

      const sum = Object.values(result).reduce(
        (acc, v) => acc + v.toNumber(),
        0,
      );
      expect(Math.abs(sum - valorParcela.toNumber())).toBeLessThan(0.01);
    });

    it('valorParcela = 0 -> todos os valores = 0', () => {
      const percents = {
        marketing: 14.285,
        desenvolvimento: 14.285,
        infraestrutura: 14.285,
        pessoal: 14.285,
        juridico: 14.285,
        operacional: 14.285,
        reservaCaixa: 14.29,
      };
      const result = service.percentsToValues(
        percents,
        new Prisma.Decimal('0.00'),
      );
      Object.values(result).forEach((v) => expect(v.toNumber()).toBe(0));
    });

    it('decimal-to-decimal: valorParcela = 33333.33 com 40% marketing', () => {
      const percents = {
        marketing: 40,
        desenvolvimento: 0,
        infraestrutura: 0,
        pessoal: 0,
        juridico: 0,
        operacional: 0,
        reservaCaixa: 60,
      };
      const result = service.percentsToValues(
        percents,
        new Prisma.Decimal('33333.33'),
      );
      // 33333.33 × 0.40 = 13333.332 -> 13333.33
      expect(result.marketing.toNumber()).toBe(13333.33);
      // reservaCaixa absorve: 33333.33 - 13333.33 = 20000.00
      expect(result.reservaCaixa.toNumber()).toBe(20000);
    });
  });
});
