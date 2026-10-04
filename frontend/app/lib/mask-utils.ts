/**
 * Utilitário para criar e aplicar máscaras em campos de formulário.
 * Utiliza a biblioteca 'remask' para a lógica de máscara (exceto CNPJ alfanumérico).
 *
 * @see https://github.com/brunobertolini/remask
 */
import { mask, unMask } from 'remask'
import type { ChangeEvent } from 'react'

/**
 * Padrões de máscara usando remask.
 * CNPJ usa token 'A' (alfanumérico maiúsculo) para o radical e '9' (dígitos) para o DV.
 * A máscara de telefone aceita os formatos (99) 9999-9999 e (99) 9 9999-9999.
 */
export const MASK_PATTERNS = {
  CPF: '999.999.999-99',
  CNPJ: 'AA.AAA.AAA/AAAA-99',
  PHONE: ['(99) 9999-9999', '(99) 9 9999-9999'],
  CEP: '99999-999',
  RG: '99.999.999-9',
  CNH: '99999999999',
}

/**
 * Remove qualquer caractere que não seja letra ou dígito e converte para maiúsculo.
 * Usado para documentos alfanuméricos (passaporte, DNI etc).
 */
export const unmaskAlphanumeric = (value: string | undefined | null): string => {
  if (!value) return ''
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

/**
 * Aplica máscara de RG usando remask.
 */
export function applyRgMask(value: string): string {
  return mask(unMask(value), MASK_PATTERNS.RG)
}

/**
 * Remove a máscara de um valor (retorna apenas números).
 * @param value O valor com máscara.
 * @returns O valor sem máscara (apenas dígitos).
 */
export const unmaskValue = (value: string | undefined | null): string => {
  if (!value) return ''
  return unMask(value)
}

/**
 * Máscara progressiva manual para CNPJ alfanumérico.
 * Preserva letras maiúsculas e dígitos no radical; DV é sempre numérico.
 * Idempotente: chamar 2x com mesmo valor produz mesma string.
 *
 * @param value - String brut a ser mascarada (pode conter máscara parcial ou não).
 * @returns Valor mascarado no formato XX.XXX.XXX/XXXX-YY.
 * @example
 * applyCnpjMask('AB12C3') → 'AB.12C.3'
 * applyCnpjMask('AB12C3DE45F6') → 'AB.12C.3DE/45F6-'
 * applyCnpjMask('ab12c3de45f678') → 'AB.12C.3DE/45F6-78'
 */
export function applyCnpjMask(value: string): string {
  // Normaliza para maiúsculas e remove apenas caracteres de máscara (.,/, -)
  const raw = value.toUpperCase().replace(/[.\-/]/g, '');
  const chars = raw.slice(0, 14);

  if (chars.length <= 2) return chars;
  if (chars.length <= 5) return `${chars.slice(0, 2)}.${chars.slice(2)}`;
  if (chars.length <= 8) return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5)}`;
  if (chars.length <= 12) return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5, 8)}/${chars.slice(8)}`;
  // 12-14: último trecho inclui o DV (2 dígitos numéricos)
  return `${chars.slice(0, 2)}.${chars.slice(2, 5)}.${chars.slice(5, 8)}/${chars.slice(8, 12)}-${chars.slice(12)}`;
}

/**
 * Aplica máscara de CPF usando remask.
 * @param value O valor a ser mascarado.
 * @returns O valor com a máscara de CPF.
 */
export function applyCpfMask(value: string): string {
  return mask(unMask(value), MASK_PATTERNS.CPF)
}

/**
 * Aplica máscara de CNPJ **numérico** (14 dígitos) usando remask.
 *
 * Diferente de `applyCnpjMask` (que suporta o novo formato alfanumérico
 * introduzido em 2026): aqui só aceitamos dígitos. Útil para campos que
 * serão enviados a gateways/APIs que ainda não suportam letras no CNPJ
 * (ex.: tokenização de cartão EFI — `holderDocument`).
 */
export function applyCnpjNumericMask(value: string): string {
  return mask(unMask(value), '99.999.999/9999-99')
}

/**
 * Aplica máscara de CPF ou CNPJ **automaticamente** conforme a quantidade
 * de dígitos digitados. Suporta apenas dígitos (sem alfanumérico).
 *
 * Comportamento:
 * - Até 11 dígitos → aplica máscara de CPF (`999.999.999-99`)
 * - 12 a 14 dígitos → aplica máscara de CNPJ numérico (`99.999.999/9999-99`)
 * - Acima de 14 dígitos → trunca para 14
 *
 * O valor retornado é a string **mascarada** (apenas para exibição).
 * Para enviar ao backend, use `unMask()` ou `unmaskValue()` para remover
 * os caracteres de formatação.
 *
 * @param value String bruta (pode conter máscara parcial ou só dígitos).
 * @returns String mascarada no formato CPF ou CNPJ conforme o tamanho.
 *
 * @example
 * applyCpfCnpjMask('94271564656')   // '942.715.646-56'
 * applyCpfCnpjMask('9427156465')    // '942.715.646-5'  (em digitação)
 * applyCpfCnpjMask('12345678000199') // '12.345.678/0001-99'
 */
export function applyCpfCnpjMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return mask(digits, MASK_PATTERNS.CPF);
  }
  return mask(digits, '99.999.999/9999-99');
}

/**
 * Aplica máscara de telefone usando remask.
 * @param value O valor a ser mascarado.
 * @returns O valor com a máscara de telefone.
 */
export function applyPhoneMask(value: string): string {
  return mask(unMask(value), MASK_PATTERNS.PHONE)
}

/**
 * Aplica máscara de CEP usando remask.
 * @param value O valor a ser mascarado.
 * @returns O valor com a máscara de CEP.
 */
export function applyCepMask(value: string): string {
  return mask(unMask(value), MASK_PATTERNS.CEP)
}

/**
 * Função genérica para criar um handler de máscara para eventos de input.
 * @param pattern O padrão de máscara (string ou array de strings).
 * @returns Um handler de evento `onChange` para o input.
 */
function createMaskHandler(
  pattern: string | string[]
): (e: ChangeEvent<HTMLInputElement>) => void {
  return (e: ChangeEvent<HTMLInputElement>) => {
    e.target.value = mask(unMask(e.target.value), pattern)
  }
}

/**
 * Handlers específicos para cada tipo de máscara, prontos para serem usados em `onChange`.
 * CNPJ usa handler customizado por causa do suporte a letras (token A).
 */
export const cpfMaskHandler = createMaskHandler(MASK_PATTERNS.CPF)
export const cnpjMaskHandler = (e: ChangeEvent<HTMLInputElement>) => {
  e.target.value = applyCnpjMask(e.target.value);
};
export const phoneMaskHandler = createMaskHandler(MASK_PATTERNS.PHONE)
export const cepMaskHandler = createMaskHandler(MASK_PATTERNS.CEP)

/**
 * Handler para inputs que devem aceitar APENAS dígitos numéricos (0-9).
 *
 * Usado em campos bancários (agência, conta) onde o schema Zod ja exige
 * `^[0-9]+$` mas o input HTML é `type="text"` (e portanto aceita letras).
 * Filtrar no `onChange` evita que o usuario digite caracteres invalidos
 * e garante feedback imediato antes da validacao de formulario.
 *
 * Preserva o cursor (mantem posicao razoavel quando ha remocao de chars).
 *
 * @example
 * <input type="text" {...register("agencia")} onChange={digitsOnlyHandler} />
 */
export const digitsOnlyHandler = (e: ChangeEvent<HTMLInputElement>) => {
  const raw = e.target.value.replace(/\D/g, '');
  if (raw !== e.target.value) {
    e.target.value = raw;
  }
};

/**
 * Versao parametrizada com maxLength opcional para impedir que mais
 * caracteres que o permitido sejam digitados.
 *
 * @example
 * <input type="text" maxLength={10}
 *   onChange={digitsOnlyHandlerWithMax(10)}
 * />
 */
export const digitsOnlyHandlerWithMax = (maxLength?: number) =>
  (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const next = typeof maxLength === 'number' ? raw.slice(0, maxLength) : raw;
    if (next !== e.target.value) {
      e.target.value = next;
    }
  };
