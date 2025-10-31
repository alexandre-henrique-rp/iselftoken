/**
 * Utilitário para criar e aplicar máscaras em campos de formulário.
 * Utiliza a biblioteca 'remask' para a lógica de máscara.
 *
 * @see https://github.com/brunobertolini/remask
 */
import { mask, unMask } from 'remask'
import type { ChangeEvent } from 'react'

/**
 * Padrões de máscara usando remask.
 * A máscara de telefone aceita os formatos (99) 9999-9999 e (99) 9 9999-9999.
 */
export const MASK_PATTERNS = {
  CPF: '999.999.999-99',
  CNPJ: '99.999.999/9999-99',
  PHONE: ['(99) 9999-9999', '(99) 9 9999-9999'],
  CEP: '99999-999',
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
 * Aplica máscara de CPF usando remask.
 * @param value O valor a ser mascarado.
 * @returns O valor com a máscara de CPF.
 */
export function applyCpfMask(value: string): string {
  return mask(unMask(value), MASK_PATTERNS.CPF)
}

/**
 * Aplica máscara de CNPJ usando remask.
 * @param value O valor a ser mascarado.
 * @returns O valor com a máscara de CNPJ.
 */
export function applyCnpjMask(value: string): string {
  return mask(unMask(value), MASK_PATTERNS.CNPJ)
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
 */
export const cpfMaskHandler = createMaskHandler(MASK_PATTERNS.CPF)
export const cnpjMaskHandler = createMaskHandler(MASK_PATTERNS.CNPJ)
export const phoneMaskHandler = createMaskHandler(MASK_PATTERNS.PHONE)
export const cepMaskHandler = createMaskHandler(MASK_PATTERNS.CEP)
