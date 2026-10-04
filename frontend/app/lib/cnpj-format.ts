/**
 * Normaliza string para [A-Z0-9]{0,14}, removendo máscara e forçando uppercase.
 *
 * @param value - String de CNPJ (mascarada ou não).
 * @returns String apenas com letras maiúsculas e dígitos, sem máscara.
 * @example
 * getAlphanumeric('AB.12C.3DE/45F6-78') → 'AB12C3DE45F678'
 * getAlphanumeric('ab12c3de45f678') → 'AB12C3DE45F678'
 */
export function getAlphanumeric(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 14);
}

/**
 * @deprecated Usar getAlphanumeric para CNPJ novo; manter para backend legado
 * que ainda exige apenas dígitos numéricos.
 */
export function getOnlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formata uma string de CNPJ com pontos, barra e hífen.
 * Suporta tanto CNPJ numérico legado quanto alfanumérico novo.
 * Funciona de forma progressiva com entradas parciais.
 *
 * @param value - String de CNPJ (mascarada ou não).
 * @returns CNPJ formatado no padrão XX.XXX.XXX/XXXX-YY.
 * @example
 * formatCnpj('AB12C3DE45F678') → 'AB.12C.3DE/45F6-78'
 * formatCnpj('12345678000190') → '12.345.678/0001-90'
 * formatCnpj('AB12C') → 'AB.12C.'
 */
export function formatCnpj(value: string): string {
  const chars = getAlphanumeric(value);
  if (chars.length === 0) return "";

  if (chars.length <= 2) return chars;
  if (chars.length <= 5) return `${chars.slice(0, 2)}.${chars.slice(2)}`;
  if (chars.length <= 8) return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5)}`;
  if (chars.length <= 12) return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5, 8)}/${chars.slice(8)}`;
  return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5, 8)}/${chars.slice(8, 12)}-${chars.slice(12, 14)}`;
}

/**
 * Verifica se o CNPJ tem exatamente 14 caracteres alfanuméricos (desconsiderando máscara).
 * Aceita tanto CNPJ numérico quanto alfanumérico.
 *
 * @param value - String de CNPJ (mascarada ou não).
 * @returns true se o CNPJ tem 14 caracteres alfanuméricos completos.
 * @example
 * isCnpjComplete('AB.12C.3DE/45F6-78') → true
 * isCnpjComplete('12.345.678/0001-90') → true
 * isCnpjComplete('AB12C') → false
 */
export function isCnpjComplete(value: string): boolean {
  return getAlphanumeric(value).length === 14;
}
