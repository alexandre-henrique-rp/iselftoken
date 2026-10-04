/**
 * AllocationConverterService (FIN-10).
 *
 * Converte `allocationPercents` (JSON { categoria: % }) em `allocationValues`
 * (JSON { categoria: R$ }) com precisao Decimal(15,2).
 *
 * Usado por FIN-10 InstallmentRequestService ao RE-SUBMETER (atualiza
 * allocationValues quando o fundador corrige pedido) e exposto para FIN-09
 * usar no momento da aprovacao (FIN-09 ja calcula localmente, mas isso aqui
 * e a implementacao canonica).
 *
 * Regras:
 * - Soma de allocationPercents deve ser exatamente 100% (tolerancia 0.01).
 * - Cada categoria em [0, 100].
 * - valorParcela > 0.
 * - A ultima categoria (reservaCaixa) absorve o residual de centavos para
 *   garantir que `sum(allocationValues) == valorParcela`.
 *
 * Implementacao:
 * - Usa Prisma.Decimal (mesmo tipo do schema.prisma) para precisao.
 * - Arredondamento bankers (Decimal.ROUND_HALF_EVEN) — equivalente ao MySQL DECIMAL.
 *
 * Referencia: CASE.md §[Repasse] Alocacao por PORCENTAGEM.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export const ALLOCATION_CATEGORIES = [
  'marketing',
  'desenvolvimento',
  'infraestrutura',
  'pessoal',
  'juridico',
  'operacional',
  'reservaCaixa',
] as const;

export type AllocationCategory = (typeof ALLOCATION_CATEGORIES)[number];
export type AllocationPercents = Record<AllocationCategory, number>;
export type AllocationValues = Record<AllocationCategory, Prisma.Decimal>;

const TOLERANCE = 0.01;

@Injectable()
export class AllocationConverterService {
  /**
   * Soma todas as 7 categorias; retorna true se |sum - 100| < 0.01.
   */
  validatePercentsSum(percents: AllocationPercents): boolean {
    const sum = ALLOCATION_CATEGORIES.reduce(
      (acc, cat) => acc + (Number(percents[cat]) || 0),
      0,
    );
    return Math.abs(sum - 100) < TOLERANCE;
  }

  /**
   * Converte percentuais em valores (R$) com precisao Decimal(15,2).
   *
   * Estrategia: calcula valor para cada categoria exceto a ultima.
   * A ultima (reservaCaixa) absorve o residual para garantir
   * `sum(values) == valorParcela` exato.
   *
   * @param percents Mapa { categoria: 0..100 } (soma = 100%).
   * @param valorParcela Valor total da parcela (Decimal ou number).
   * @returns Mapa { categoria: Decimal } com soma total = valorParcela.
   */
  percentsToValues(
    percents: AllocationPercents,
    valorParcela: Prisma.Decimal | number,
  ): AllocationValues {
    const total = new Prisma.Decimal(valorParcela);
    const result: Partial<AllocationValues> = {};

    // Calcula 6 primeiras categories; gera valor arredondado em 2 casas.
    const intermediate: AllocationCategory[] = [
      'marketing',
      'desenvolvimento',
      'infraestrutura',
      'pessoal',
      'juridico',
      'operacional',
    ];

    let somaParcial = new Prisma.Decimal(0);
    for (const cat of intermediate) {
      const pct = new Prisma.Decimal(percents[cat] || 0);
      const valor = total
        .mul(pct)
        .div(100)
        .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);
      result[cat] = valor;
      somaParcial = somaParcial.plus(valor);
    }

    // reservaCaixa absorve o residual (garante soma exata).
    const residual = total.minus(somaParcial);
    result.reservaCaixa = residual.toDecimalPlaces(
      2,
      Prisma.Decimal.ROUND_HALF_EVEN,
    );

    return result as AllocationValues;
  }
}
