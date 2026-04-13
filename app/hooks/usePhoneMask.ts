/**
 * Hook customizado para máscara de telefone brasileiro
 * Formata automaticamente durante a digitação: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * Segue princípios de Clean Architecture e reutilização
 */

import { useCallback } from 'react'

/**
 * Aplica máscara de telefone brasileiro
 * @param value - Valor bruto do telefone
 * @returns Telefone formatado
 */
export const formatPhone = (value: string): string => {
  // Remove todos os caracteres não numéricos
  const cleaned = value.replace(/\D/g, '')
  
  // Limita a 11 dígitos (máximo para telefone brasileiro)
  const limited = cleaned.slice(0, 11)
  
  // Aplica máscara conforme o tamanho
  if (limited.length <= 2) {
    return limited
  }
  
  if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
  }
  
  if (limited.length <= 10) {
    // Formato antigo: (XX) XXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`
  }
  
  // Formato novo: (XX) XXXXX-XXXX
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
}

/**
 * Remove máscara do telefone (deixa apenas números)
 * @param value - Telefone formatado
 * @returns Telefone apenas com números
 */
export const unformatPhone = (value: string): string => {
  return value.replace(/\D/g, '')
}

/**
 * Valida se o telefone está no formato brasileiro correto
 * @param value - Telefone formatado
 * @returns true se válido, false caso contrário
 */
export const validatePhone = (value: string): boolean => {
  const cleaned = unformatPhone(value)
  
  // Verifica se tem 10 ou 11 dígitos
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return false
  }
  
  // Verifica se o DDI é válido (começa com 11 a 99 para celular, 10 a 99 para fixo)
  const ddd = cleaned.slice(0, 2)
  const dddNum = parseInt(ddd)
  
  if (dddNum < 11 || dddNum > 99) {
    return false
  }
  
  // Para celular (11 dígitos), o primeiro dígito após o DDD deve ser 9
  if (cleaned.length === 11 && cleaned[2] !== '9') {
    return false
  }
  
  return true
}

/**
 * Hook para gerenciar máscara de telefone
 * @returns Objeto com funções para manipular telefone
 */
export const usePhoneMask = () => {
  const handlePhoneChange = useCallback((value: string) => {
    return formatPhone(value)
  }, [])

  const isValidPhone = useCallback((value: string) => {
    return validatePhone(value)
  }, [])

  const getCleanPhone = useCallback((value: string) => {
    return unformatPhone(value)
  }, [])

  return {
    handlePhoneChange,
    isValidPhone,
    getCleanPhone,
    formatPhone,
    unformatPhone,
    validatePhone
  }
}

export default usePhoneMask
