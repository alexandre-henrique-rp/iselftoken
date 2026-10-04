/**
 * Specs do SlaCalculatorService (FIN-10).
 *
 * Cobertura:
 * - addBusinessDays pulando sabado/domingo
 * - addBusinessDays pulando Natal (25/12) e Ano novo (01/01)
 * - businessDaysBetween contando dias uteis
 * - Edge: start = sexta (nao conta o proprio start)
 */
import { SlaCalculatorService } from './sla-calculator.service';

describe('SlaCalculatorService', () => {
  let service: SlaCalculatorService;

  beforeEach(() => {
    service = new SlaCalculatorService();
  });

  // Helper para montar datas locais (mesmo fuso do runtime).
  const d = (s: string): Date => new Date(`${s}T12:00:00`);

  describe('addBusinessDays', () => {
    it('pula sabado e domingo: segunda -> sexta (add 5 dias)', () => {
      // segunda 2026-02-02 + 5 uteis -> sexta 2026-02-09
      const start = d('2026-02-02');
      const result = service.addBusinessDays(start, 5);
      expect(d('2026-02-09').getTime()).toBe(result.getTime());
    });

    it('pula o Natal (25/12): quinta 2026-12-24 + 5 uteis -> segunda 2027-01-04 (pula 25/12 + 01/01 + fds)', () => {
      // 24/12 (qui) + 1=25 sex (Natal, skip), 26 sab, 27 dom, 28 seg=1, 29 ter=2, 30 qua=3, 31 qui=4,
      // 01/01 sex (Ano novo, skip), 02 sab, 03 dom, 04 seg=5
      const start = d('2026-12-24');
      const result = service.addBusinessDays(start, 5);
      expect(d('2027-01-04').getTime()).toBe(result.getTime());
    });

    it('pula o Ano novo (01/01) e Tiradentes (21/04) em sequencia', () => {
      // 2026-04-15 (qua) + 1=16 qui, 2=17 sex, 18 sab, 19 dom, 20 seg=3, 21 ter (Tiradentes, skip),
      // 22 qua=4, 23 qui=5
      const start = d('2026-04-15');
      const result = service.addBusinessDays(start, 5);
      expect(d('2026-04-23').getTime()).toBe(result.getTime());
    });

    it('nao conta o proprio start: sexta + 1 util -> segunda', () => {
      // 2026-02-06 (sex) + 1 util -> 2026-02-09 (seg)
      const start = d('2026-02-06');
      const result = service.addBusinessDays(start, 1);
      expect(d('2026-02-09').getTime()).toBe(result.getTime());
    });

    it('add 0 dias retorna a propria data (sem avanco)', () => {
      // Comportamento documentado: addBusinessDays(start, 0) NAO avanca (loop while nao executa).
      // Util para casos triviais.
      const start = d('2026-02-07'); // sabado
      const result = service.addBusinessDays(start, 0);
      expect(d('2026-02-07').getTime()).toBe(result.getTime());
    });

    it('Páscoa move uteis corretamente: terça após Páscoa + 5 uteis', () => {
      // Pascoa 2026 = 2026-04-05 (domingo). Util inicio = 2026-04-07 (ter).
      // + 1=08 qua, 2=09 qui, 3=10 sex, 4=13 seg, 5=14 ter
      const start = d('2026-04-07');
      const result = service.addBusinessDays(start, 5);
      expect(d('2026-04-14').getTime()).toBe(result.getTime());
    });
  });

  describe('businessDaysBetween', () => {
    it('conta dias uteis positivos entre duas datas (excluindo extremidades)', () => {
      // 2026-02-02 (seg) -> 2026-02-09 (seg): 4 uteis (3,4,5,6 — 7=sab, 8=dom, 9=end exclusive)
      const start = d('2026-02-02');
      const end = d('2026-02-09');
      expect(service.businessDaysBetween(start, end)).toBe(4);
    });

    it('retorna 0 se start >= end', () => {
      const start = d('2026-02-09');
      const end = d('2026-02-02');
      expect(service.businessDaysBetween(start, end)).toBe(0);
    });

    it('pula Natal no meio do intervalo', () => {
      // 2026-12-24 (qui) -> 2026-12-31 (qui): 3 uteis (28 seg, 29 ter, 30 qua — 25=Natal, 26=sab, 27=dom, 31=end exclusive)
      const start = d('2026-12-24');
      const end = d('2026-12-31');
      expect(service.businessDaysBetween(start, end)).toBe(3);
    });
  });

  describe('isWeekend / isHoliday', () => {
    it('identifica sabado e domingo como fim de semana', () => {
      expect(service.isWeekend(d('2026-02-07'))).toBe(true);
      expect(service.isWeekend(d('2026-02-08'))).toBe(true);
      expect(service.isWeekend(d('2026-02-09'))).toBe(false);
    });

    it('identifica 25/12 como feriado', () => {
      expect(service.isHoliday(d('2026-12-25'))).toBe(true);
    });

    it('aceita holidays customizadas via construtor', () => {
      const custom = new SlaCalculatorService([d('2026-08-15')]);
      expect(custom.isHoliday(d('2026-08-15'))).toBe(true);
    });
  });
});
