/**
 * Hook customizado para máscara de telefone brasileiro
 * Aplica máscara (XX) XXXXX-XXXX de forma fluida
 */

import { useCallback } from 'react';

export const useTelefoneMask = () => {
  /**
   * Aplica máscara de telefone brasileiro
   * @param value Valor bruto do input
   * @returns Valor com máscara aplicada
   */
  const applyMask = useCallback((value: string): string => {
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '');
    
    // Limita a 11 dígitos (com 9º dígito)
    const limitedNumbers = numbers.slice(0, 11);
    
    // Aplica máscara progressiva
    if (limitedNumbers.length === 0) {
      return '';
    }
    
    if (limitedNumbers.length <= 2) {
      return limitedNumbers;
    }
    
    if (limitedNumbers.length <= 7) {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2)}`;
    }
    
    // Verifica se é telefone com 9º dígito
    if (limitedNumbers.length === 11) {
      return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 7)}-${limitedNumbers.slice(7, 11)}`;
    }
    
    // Formato antigo (8 dígitos)
    return `(${limitedNumbers.slice(0, 2)}) ${limitedNumbers.slice(2, 6)}-${limitedNumbers.slice(6, 10)}`;
  }, []);

  /**
   * Remove máscara para obter apenas números
   * @param maskedValue Valor com máscara
   * @returns Apenas números
   */
  const removeMask = useCallback((maskedValue: string): string => {
    return maskedValue.replace(/\D/g, '');
  }, []);

  /**
   * Valida se o telefone está completo
   * @param maskedValue Valor com máscara
   * @returns true se completo, false se incompleto
   */
  const isComplete = useCallback((maskedValue: string): boolean => {
    const numbers = removeMask(maskedValue);
    return numbers.length === 10 || numbers.length === 11;
  }, [removeMask]);

  /**
   * Obtém apenas o DDD do telefone
   * @param maskedValue Valor com máscara
   * @returns DDD extraído
   */
  const getDDD = useCallback((maskedValue: string): string => {
    const numbers = removeMask(maskedValue);
    return numbers.slice(0, 2);
  }, [removeMask]);

  /**
   * Obtém apenas o número do telefone (sem DDD)
   * @param maskedValue Valor com máscara
   * @returns Número do telefone
   */
  const getNumber = useCallback((maskedValue: string): string => {
    const numbers = removeMask(maskedValue);
    return numbers.slice(2);
  }, [removeMask]);

  return {
    applyMask,
    removeMask,
    isComplete,
    getDDD,
    getNumber,
  };
};