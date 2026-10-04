import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Converte um caractere CNPJ alfanumérico em valor numérico para cálculo do DV.
 *
 * @param ch - Caractere único (0-9, A-Z)
 * @returns Valor de 0 a 42 conforme tabela RFB
 *
 * @example
 * charValue('1') // 1
 * charValue('A') // 17
 * charValue('Z') // 42
 */
export function charValue(ch: string): number {
  return ch.charCodeAt(0) - 48;
}

/**
 * Pesos cíclicos para cálculo do primeiro dígito verificador (12 chars do radical).
 */
const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

/**
 * Pesos cíclicos para cálculo do segundo dígito verificador (radical + DV1 = 13 chars).
 */
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] as const;

/**
 * Calcula os dois dígitos verificadores de um CNPJ alfanumérico de 12 caracteres.
 *
 * @param radical12 - String com exatamente 12 caracteres (radical do CNPJ)
 * @returns String com 2 caracteres DV (ex: "35")
 * @throws Error se radical não tiver exatamente 12 caracteres
 *
 * @example
 * computeCnpjDv('12ABC34501DE') // "35"
 * computeCnpjDv('000000000000') // "00"
 * computeCnpjDv('000000000001') // "91"
 */
export function computeCnpjDv(radical12: string): string {
  if (radical12.length !== 12) {
    throw new Error(
      `Radical do CNPJ deve ter 12 caracteres, recebeu ${radical12.length}`,
    );
  }

  // --- DV1 ---
  let soma1 = 0;
  for (let i = 0; i < 12; i++) {
    soma1 += charValue(radical12[i]) * PESOS_DV1[i];
  }
  const resto1 = soma1 % 11;
  const dv1 = resto1 <= 1 ? 0 : 11 - resto1;

  // --- DV2 ---
  const radicalComDv1 = radical12 + dv1.toString();
  let soma2 = 0;
  for (let i = 0; i < 13; i++) {
    soma2 += charValue(radicalComDv1[i]) * PESOS_DV2[i];
  }
  const resto2 = soma2 % 11;
  const dv2 = resto2 <= 1 ? 0 : 11 - resto2;

  return dv1.toString() + dv2.toString();
}

export interface ValidateCnpjOptions {
  /**
   * Se `false`, rejeita CNPJs que contenham letras (alfanuméricos).
   * Útil para manter regressão de quem já usava só numérico.
   * @default true
   */
  alphanumeric?: boolean;
}

/**
 * Valida um CNPJ (numérico ou alfanumérico) conforme algoritmo oficial RFB.
 *
 * @param value - CNPJ com ou sem máscara
 * @param options - Opções de validação
 * @returns true se CNPJ é válido, false caso contrário
 *
 * @example
 * validateCnpj('12.345.678/0001-95')         // true (numérico válido)
 * validateCnpj('12.ABC.345/01DE-35')         // true (alfanumérico válido)
 * validateCnpj('12.ABC.345/01DE-99')         // false (DV errado)
 * validateCnpj('12.ABC.345/01DE-35', { alphanumeric: false }) // false (rejeita alfa)
 */
export function validateCnpj(
  value: string,
  options?: ValidateCnpjOptions,
): boolean {
  if (!value) return false;

  // Normaliza: uppercase e remove tudo que não é letra ou dígito
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (normalized.length !== 14) return false;

  // Se a opção exige numérico puro, rejeita qualquer letra
  if (options?.alphanumeric === false && /[A-Z]/.test(normalized)) {
    return false;
  }

  const radical12 = normalized.slice(0, 12);
  const dvRecebido = normalized.slice(12, 14);
  const dvCalculado = computeCnpjDv(radical12);

  return dvRecebido === dvCalculado;
}

/**
 * Options para o decorator @IsCnpj
 */
export interface IsCnpjOptions {
  /**
   * Se `false`, rejeita CNPJs alfanuméricos (só aceita numérico).
   * @default true
   */
  alphanumeric?: boolean;
  /**
   * Mensagem de erro customizada.
   * @default "CNPJ inválido: verifique formato XX.XXX.XXX/XXXX-YY e dígito verificador"
   */
  message?: string;
}

/**
 * Decorator class-validator que valida CNPJ (numérico ou alfanumérico).
 *
 * Aplica validação do dígito verificador conforme IN RFB 2.229/2024.
 *
 * @param options - Opções de validação (@see IsCnpjOptions)
 *
 * @example
 * class MeuDto {
 *   @IsCnpj()
 *   cnpj: string;
 *
 *   @IsCnpj({ alphanumeric: false })
 *   cnpjNumerico: string;
 * }
 */
export function IsCnpj(options?: IsCnpjOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCnpj',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message:
          options?.message ??
          'CNPJ inválido: verifique formato XX.XXX.XXX/XXXX-YY e dígito verificador',
      },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          return validateCnpj(value, {
            alphanumeric: options?.alphanumeric,
          });
        },
      },
    });
  };
}

/**
 * Options para o decorator @IsCpfOrCnpj
 */
export interface IsCpfOrCnpjOptions {
  /**
   * Mensagem de erro customizada.
   */
  message?: string;
}

/**
 * Decorator que aceita CPF (11 dígitos) ou CNPJ (14 dígitos, numérico ou alfanumérico).
 *
 * Para CPF não é feito cálculo de DV (validação de formato apenas).
 * Para CNPJ é feito cálculo completo do dígito verificador.
 *
 * @param options - Opções de validação
 *
 * @example
 * class MeuDto {
 *   @IsCpfOrCnpj()
 *   documento: string;
 * }
 */
export function IsCpfOrCnpj(options?: IsCpfOrCnpjOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isCpfOrCnpj',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: options?.message ?? 'CPF/CNPJ inválido',
      },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;

          const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const isCpf = normalized.length === 11;
          const isCnpj = normalized.length === 14;

          // CPF: só verifica tamanho (DV de CPF é diferente)
          if (isCpf) return true;

          // CNPJ: valida DV
          if (isCnpj) {
            const hasLetters = /[A-Z]/.test(normalized);
            return validateCnpj(value, { alphanumeric: hasLetters });
          }

          return false;
        },
      },
    });
  };
}
