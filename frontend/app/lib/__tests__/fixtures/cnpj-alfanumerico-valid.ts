/**
 * Fixtures de CNPJs alfanuméricos válidos gerados pelo Simulador oficial da RFB.
 *
 * DVs calculados conforme algoritmo oficial IN RFB 2.229/2024
 * (Manual de Cálculo do DV do CNPJ Alfanumérico, RFB/serpro, junho 2026).
 * computeDv("12ABC34501DE") === "35" (exemplo validado pelo manual).
 *
 * @see https://www.gov.br/pt-br/servicos/simulador-cnpj-alfanumerico
 * @see .harness/RAG/law/cnpj-alfanumerico-in-rfb-2229-2024.md
 *
 * LGPD-safe: CNPJs gerados pelo Simulador oficial para fins de teste — não são
 * CNPJs reais de empresas.
 */

/**
 * CNPJs alfanuméricos no formato raw (14 chars, sem máscara).
 * Radical (12 chars) do Simulador + DV calculado pelo algoritmo oficial.
 */
export const CNPJ_ALFANUMERICO_RAW: readonly string[] = [
  // DVs calculados: computeDv("AB12C3DE45F6") = "59"
  "AB12C3DE45F659",
  // DVs calculados: computeDv("12AB3CDE45F6") = "80"
  "12AB3CDE45F680",
  // DVs calculados: computeDv("ABCD12345678") = "80"
  "ABCD1234567880",
] as const;

/**
 * CNPJs alfanuméricos mascarados (máscara canônica XX.XXX.XXX/XXXX-YY).
 */
export const CNPJ_ALFANUMERICO_MASKED: readonly string[] = [
  "AB.12C.3DE/45F6-59",
  "12.AB3.CDE/45F6-80",
  "AB.CD1.234/5678-80",
] as const;

/**
 * CNPJs numéricos legados (para teste de compatibilidade reversa).
 * Formato: 14 dígitos + máscara 00.000.000/0000-00.
 * DVs verificados: computeDv("123456780001") = "95"; computeDv("000000000001") = "91"
 */
export const CNPJ_LEGADO: readonly string[] = [
  "12345678000195", // caso clássico
  "00000000000191", // edge case
] as const;

export const CNPJ_LEGADO_MASKED: readonly string[] = [
  "12.345.678/0001-95",
  "00.000.000/0001-91",
] as const;
