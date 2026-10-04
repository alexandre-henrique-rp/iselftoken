const brlCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const brlCurrencyWithCents = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

export function getOnlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formats a raw string input as Brazilian Real currency.
 * Supports very high values (billions) via Intl.NumberFormat.
 * Limits integer part to 12 digits (R$ 999.999.999.999,99).
 */
export function formatCurrencyInput(value: string): string {
  const digits = getOnlyDigits(value).slice(0, 12);
  if (!digits) return "";
  const amount = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function parseCurrencyInputToNumber(value: string): number {
  const cleaned = value.trim().replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;

  // Em pt-BR, a vírgula é o separador decimal. Sem vírgula, um ponto seguido
  // de três dígitos é tratado como separador de milhar (ex.: 100.000).
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\.(?=\d{3}(?:\.|$))/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

/**
 * Formata apenas o conteúdo numérico, sem o prefixo `R$`, para inputs que já
 * exibem a moeda em um elemento separado.
 */
export function formatCurrencyAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyBRL(amount: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

/**
 * BRL sem centavos (`R$ 1.500`) — usado em KPIs/grandes valores onde a fração
 * de centavos polui a leitura. Aceita null/undefined retornando `"—"`.
 */
export function formatBRLCompact(value: number | null | undefined): string {
  if (value == null) return "—";
  return brlCurrency.format(value);
}

/**
 * Mesma formatação de `formatBRLCompact` mas com **centavos** (2 casas decimais).
 * Usado em superfícies onde o founder espera ver o valor exato do pagamento
 * (ex.: R$ 500.000,00 em vez de R$ 500.000). Não usar em KPIs compactos que
 * mostram ordem de grandeza — ali `formatBRLCompact` continua sendo o
 * preferido para não poluir o layout.
 */
export function formatBRLCompactWithCents(
  value: number | null | undefined,
): string {
  if (value == null) return "—";
  return brlCurrencyWithCents.format(value);
}

/**
 * Número inteiro grande com separador pt-BR: `1.234.567`.
 */
export function formatInt(value: number | null | undefined): string {
  if (value == null) return "—";
  return integerFormatter.format(value);
}
