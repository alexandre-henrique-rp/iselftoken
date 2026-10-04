/**
 * Fixtures de CNPJs alfanuméricos INVÁLIDOS — DV propositalmente incorreto.
 *
 * Cada entrada tem radical válido (12 chars) com dígitos verificadores
 * que NÃO batem com o algoritmo IN RFB 2.229/2024 §4.1-4.5.
 * Os DVs errados são derivados de radicais válidos mas com DV alterado
 * (ex: radical "12ABC34501DE" → DV correto "35", aqui usado "99").
 *
 * @see .harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md
 *
 * LGPD-safe: radicais gerados algorithmicamente para fins de teste —
 * não são CNPJs reais de empresas.
 */

/**
 * CNPJs alfanuméricos no formato raw (14 chars, sem máscara).
 * Radical válido (12 chars) + DV propositalmente errado (2 dígitos alterados).
 *
 * Casos:
 *  - "12ABC34501DE99" → DV deveria ser "35", tem "99" (manual example com DV trocado)
 *  - "AB12C3DE45F600" → DV deveria ser "59", tem "00" (fixture válida com DV zerado)
 *  - "12AB3CDE45F699" → DV deveria ser "80", tem "99" (fixture válida com DV trocado)
 */
export const CNPJ_ALFANUMERICO_INVALID: readonly string[] = [
  "12ABC34501DE99", // DV deveria ser 35 (exemplo do manual)
  "AB12C3DE45F600", // DV deveria ser 59, tem 00
  "12AB3CDE45F699", // DV deveria ser 80, tem 99
] as const;

/**
 * CNPJs alfanuméricos mascarados (máscara canônica XX.XXX.XXX/XXXX-YY).
 */
export const CNPJ_ALFANUMERICO_INVALID_MASKED: readonly string[] = [
  "12.ABC.345/01DE-99",
  "AB.12C.3DE/45F6-00",
  "12.AB3.CDE/45F6-99",
] as const;

/**
 * CNPJs numéricos LEGACY com DV propositalmente errado
 * (regressão: garante que o validador rejeita numéricos com DV incorreto).
 *
 * "12345678000195" → DV correto; aqui com DV "00"
 * "00000000000191" → DV correto; aqui com DV "00"
 */
export const CNPJ_LEGADO_INVALID: readonly string[] = [
  "12345678000100", // DV deveria ser 95
  "00000000000100", // DV deveria ser 91
] as const;

export const CNPJ_LEGADO_INVALID_MASKED: readonly string[] = [
  "12.345.678/0001-00",
  "00.000.000/0001-00",
] as const;
