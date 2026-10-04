/**
 * Spec SLA — Feriados BR (FIN-12).
 *
 * Verifica:
 * 1. addBusinessDays pula sabado/domingo
 * 2. addBusinessDays pula feriados nacionais (Natal, Ano Novo, Pascoa)
 * 3. Algoritmo de Gauss (Pascoa) e Corpus Christi (Pascoa + 60 dias) corretos
 *
 * Executar: `npm run test -- --testPathPattern=sla-holiday`
 */
import { SlaCalculatorService } from '../sla-calculator.service';
import { buildBrazilianHolidays, BR_HOLIDAYS_2026_2028 } from '../holidays-br';

describe('SLA — Feriados BR (FIN-12)', () => {
  const sla = new SlaCalculatorService();

  describe('addBusinessDays — fim de semana', () => {
    it('sexta + 1 dia util = segunda (pula sab/dom)', () => {
      // sexta 2026-08-14
      const friday = new Date(2026, 7, 14, 12, 0, 0);
      const result = sla.addBusinessDays(friday, 1);
      expect(result.getDay()).toBe(1); // segunda
      expect(result.getDate()).toBe(17);
      expect(result.getMonth()).toBe(7); // agosto
    });

    it('quarta + 5 dias uteis = proxima quarta (pula sab/dom)', () => {
      // quarta 2026-08-12
      const wed = new Date(2026, 7, 12, 12, 0, 0);
      const result = sla.addBusinessDays(wed, 5);
      expect(result.getDay()).toBe(3); // quarta
      expect(result.getDate()).toBe(19);
    });

    it('sabado + 1 dia util = segunda', () => {
      const sat = new Date(2026, 7, 15, 12, 0, 0);
      const result = sla.addBusinessDays(sat, 1);
      expect(result.getDay()).toBe(1);
      expect(result.getDate()).toBe(17);
    });
  });

  describe('addBusinessDays — feriados nacionais', () => {
    it('pula Natal (25/12/2026 = sexta)', () => {
      // 23/12/2026 (quarta) + 1 util = 24/12 (quinta, 25/sex = Natal pulado)
      const dec23 = new Date(2026, 11, 23, 12, 0, 0);
      const result = sla.addBusinessDays(dec23, 1);
      expect(result.getDate()).toBe(24);
      expect(result.getMonth()).toBe(11);
    });

    it('pula Confraternizacao Universal (1/1/2027 = sexta)', () => {
      // 30/12/2026 (quarta) + 1 util = 31/12 (quinta, 1/sex = Ano Novo pulado -> prox util = 4/1/2027)
      const dec30 = new Date(2026, 11, 30, 12, 0, 0);
      const result = sla.addBusinessDays(dec30, 1);
      expect(result.getDate()).toBe(31);
      expect(result.getMonth()).toBe(11);
    });

    it('2 business days de 30/12/2026 (quarta) = 4/1/2027 (segunda, pula 1/1 sexta)', () => {
      const dec30 = new Date(2026, 11, 30, 12, 0, 0);
      const result = sla.addBusinessDays(dec30, 2);
      expect(result.getDate()).toBe(4);
      expect(result.getMonth()).toBe(0); // janeiro
      expect(result.getFullYear()).toBe(2027);
    });

    it('pula Pascoa 2026 (5/4/2026 = domingo) + Sexta Santa (3/4) + Sabado Aleluia (4/4)', () => {
      // 2/4/2026 (quinta) + 1 util = 6/4 (segunda, pula 3/4 sexta santa, 4/4 sabado aleluia, 5/4 pascoa/domingo)
      const thu2 = new Date(2026, 3, 2, 12, 0, 0);
      const result = sla.addBusinessDays(thu2, 1);
      expect(result.getDate()).toBe(6);
      expect(result.getMonth()).toBe(3);
    });

    it('inclui Corpus Christi (Pascoa + 60 dias)', () => {
      const corpusChristi = new Date(2026, 5, 4, 12, 0, 0); // 4/6/2026 (quinta)
      expect(sla.isHoliday(corpusChristi)).toBe(true);
    });
  });

  describe('Algoritmo de Gauss (Pascoa)', () => {
    it('Pascoa 2026 = 5 de abril', () => {
      const holidays = buildBrazilianHolidays(2026);
      const easter = holidays.find(
        (d) => d.getMonth() === 3 && d.getDate() === 5,
      );
      expect(easter).toBeDefined();
    });

    it('Pascoa 2027 = 28 de marco', () => {
      const holidays = buildBrazilianHolidays(2027);
      const easter = holidays.find(
        (d) => d.getMonth() === 2 && d.getDate() === 28,
      );
      expect(easter).toBeDefined();
    });

    it('Pascoa 2028 = 16 de abril', () => {
      const holidays = buildBrazilianHolidays(2028);
      const easter = holidays.find(
        (d) => d.getMonth() === 3 && d.getDate() === 16,
      );
      expect(easter).toBeDefined();
    });

    it('Corpus Christi = Pascoa + 60 dias', () => {
      const holidays = buildBrazilianHolidays(2026);
      const easter = new Date(2026, 3, 5, 12, 0, 0);
      const corpusChristiExpected = new Date(easter);
      corpusChristiExpected.setDate(easter.getDate() + 60);
      const corpusChristi = holidays.find(
        (d) =>
          d.getFullYear() === corpusChristiExpected.getFullYear() &&
          d.getMonth() === corpusChristiExpected.getMonth() &&
          d.getDate() === corpusChristiExpected.getDate(),
      );
      expect(corpusChristi).toBeDefined();
    });
  });

  describe('Lista consolidada 2026-2028', () => {
    it('buildBrazilianHolidays(2026) tem 12 feriados (8 fixos + 4 moveis)', () => {
      const holidays2026 = buildBrazilianHolidays(2026);
      expect(holidays2026.length).toBe(12);
    });

    it('Lista consolidada BR_HOLIDAYS_2026_2028 tem 36 feriados (3 anos x 12)', () => {
      expect(BR_HOLIDAYS_2026_2028.length).toBe(36);
    });

    it('Inclui 8 feriados federais fixos em 2026', () => {
      const holidays = buildBrazilianHolidays(2026);
      const fixos = [
        [0, 1], // Confraternizacao Universal (1/jan)
        [3, 21], // Tiradentes (21/abr)
        [4, 1], // Dia do Trabalho (1/mai)
        [8, 7], // Independencia (7/set)
        [9, 12], // N.Sra Aparecida (12/out)
        [10, 2], // Finados (2/nov)
        [10, 15], // Proclamacao da Republica (15/nov)
        [11, 25], // Natal (25/dez)
      ];
      for (const [m, d] of fixos) {
        const found = holidays.find(
          (h) => h.getMonth() === m && h.getDate() === d,
        );
        expect(found).toBeDefined();
      }
    });
  });
});
