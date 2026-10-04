/**
 * SlaCalculatorService (FIN-10).
 *
 * Utilitario para calculo de prazos em dias UTEIS (seg-sex, exceto feriados
 * nacionais BR). Usado em InstallmentRequest.tsLimitePagamento =
 * submittedAt + 5 dias uteis (SLA financeiro).
 *
 * Algoritmo:
 *   let result = new Date(start);
 *   let added = 0;
 *   while (added < n) {
 *     result.setDate(result.getDate() + 1);
 *     if (!isWeekend && !isHoliday) added++;
 *   }
 *
 * Holidays default: src/common/sla/holidays-br.ts (BR 2026-2028).
 * Override via construtor (SystemConfig.feriadosBrasileiros no futuro).
 *
 * Referencia: CASE.md §[Repasse] BUSINESS DAYS.
 */
import { Inject, Injectable, Optional } from '@nestjs/common';
import { BR_HOLIDAYS_2026_2028 } from './holidays-br';

export const SLA_HOLIDAYS_TOKEN = 'SLA_HOLIDAYS';

@Injectable()
export class SlaCalculatorService {
  private readonly holidays: Date[];

  constructor(@Optional() @Inject(SLA_HOLIDAYS_TOKEN) holidays?: Date[]) {
    this.holidays =
      holidays && holidays.length > 0 ? holidays : BR_HOLIDAYS_2026_2028;
  }

  /**
   * Soma `n` dias UTEIS a partir de `start` (nao conta `start`).
   * Exemplo: start=sex, n=1 -> prox util = segunda.
   *          start=sex, n=5 -> quinta da semana seguinte (pula sab/dom).
   *
   * @param start Data de partida (qualquer dia).
   * @param n Numero de dias uteis a adicionar (>= 0).
   * @returns Nova Date correspondente ao n-esimo dia util.
   */
  addBusinessDays(start: Date, n: number): Date {
    if (n < 0) {
      throw new Error(`n deve ser >= 0 (recebido: ${n})`);
    }
    const result = new Date(start);
    let added = 0;
    while (added < n) {
      result.setDate(result.getDate() + 1);
      if (!this.isWeekend(result) && !this.isHoliday(result)) {
        added++;
      }
    }
    return result;
  }

  /**
   * Conta dias uteis entre duas datas (excluindo extremidades).
   * Se start >= end, retorna 0.
   *
   * @param start Data inicial.
   * @param end Data final.
   * @returns Numero de dias uteis.
   */
  businessDaysBetween(start: Date, end: Date): number {
    if (start >= end) return 0;
    let count = 0;
    const cursor = new Date(start);
    // Avanca 1 dia (nao conta start)
    cursor.setDate(cursor.getDate() + 1);
    while (cursor < end) {
      if (!this.isWeekend(cursor) && !this.isHoliday(cursor)) {
        count++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return count;
  }

  /**
   * @returns true se `d` for sabado (6) ou domingo (0).
   */
  isWeekend(d: Date): boolean {
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  /**
   * @returns true se alguma data em `this.holidays` for o mesmo dia (YYYY-MM-DD) que `d`.
   */
  isHoliday(d: Date): boolean {
    return this.holidays.some((h) => this.sameDay(h, d));
  }

  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
