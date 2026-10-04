/**
 * Feriados nacionais brasileiros 2026-2028.
 *
 * Lista DEFAULT carregada pelo SlaCalculatorService. Pode ser sobrescrita
 * via injeção de dependencia (SystemConfig.feriadosBrasileiros no futuro).
 *
 * Inclui:
 * - Feriados federais fixos (Lei 662/1949 + 10.607/2002)
 * - Pascoa e Corpus Christi (calculados pelo algoritmo de Gauss inline)
 * - Sexta-feira Santa e Sabado de Aleluia (derivados da Pascoa)
 *
 * Nao inclui feriados estaduais/municipais (escopo desta sprint).
 * Anos bissextos e Carnaval foram intencionalmente omitidos (Carnaval e
 * facultativo; tratado como dia util).
 */
function easterSunday(year: number): Date {
  // Algoritmo de Gauss (Calendario Gregoriano). Valido para qualquer ano.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function ymd(year: number, month1to12: number, day: number): Date {
  // Constroi em horario LOCAL (meio-dia) para evitar problemas de TZ
  // quando o servico compara com getDate()/getMonth()/getFullYear().
  return new Date(year, month1to12 - 1, day, 12, 0, 0, 0);
}

export function buildBrazilianHolidays(year: number): Date[] {
  const easter = easterSunday(year);
  const corpusChristi = addDays(easter, 60); // 60 dias apos a Pascoa
  return [
    ymd(year, 1, 1), // Confraternizacao Universal
    ymd(year, 4, 21), // Tiradentes
    ymd(year, 5, 1), // Dia do Trabalho
    ymd(year, 9, 7), // Independencia
    ymd(year, 10, 12), // Nossa Senhora Aparecida
    ymd(year, 11, 2), // Finados
    ymd(year, 11, 15), // Proclamacao da Republica
    ymd(year, 12, 25), // Natal
    easter, // Pascoa
    addDays(easter, -2), // Sexta-feira Santa
    addDays(easter, -1), // Sabado de Aleluia
    corpusChristi,
  ];
}

/**
 * Lista consolidada 2026-2028. Pode ser sobrescrita via env FERiadosBrasileiros_Override
 * (JSON array de strings ISO) ou via injecao de dependencia no SlaCalculatorService.
 */
export const BR_HOLIDAYS_2026_2028: Date[] = [
  ...buildBrazilianHolidays(2026),
  ...buildBrazilianHolidays(2027),
  ...buildBrazilianHolidays(2028),
];
