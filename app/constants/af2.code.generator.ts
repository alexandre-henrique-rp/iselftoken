/**
 * @name af2CodeGenerator
 * @description Gera um código numérico aleatório de 6 dígitos.
 *
 * @returns {string} Código numérico com 6 dígitos.
 *
 * @example
 * // Exemplo de uso
 * const code = af2CodeGenerator();
 *
 * Fluxo de execução:
 * 1. Gera um número aleatório entre 0 e 999999
 * 2. Preenche com zeros à esquerda para garantir 6 dígitos
 * 3. Retorna o código como string
 */
export const af2CodeGenerator = (): string => {
  // Gera um número aleatório entre 0 e 999999
  const randomNumber = Math.floor(Math.random() * 1_000_000);

  // Garante 6 dígitos, incluindo zeros à esquerda
  return String(randomNumber).padStart(6, "0");
};
