/**
 * Helpers para construir descrições de notificações com múltiplas linhas.
 *
 * Regra (CASE.md [Notificacoes] — central de notificacoes):
 *  - Toda notificação pode conter múltiplas linhas separadas por `\n\n`.
 *  - O frontend renderiza `<p className="whitespace-pre-wrap ...">` (vê
 *    `notification-card.tsx`), então as quebras são preservadas na UI.
 *  - Esse helper padroniza a junção para evitar concatenações manuais que
 *    podem produzir `\n` vs `\n\n` de forma inconsistente.
 */

/**
 * Junta várias linhas em uma única descrição multi-linha.
 *
 *  - Filtra `null`, `undefined` e string vazia (não imprime linha em branco).
 *  - Junta com `\n\n` (duas quebras) — gera parágrafos visualmente distintos
 *    no frontend.
 *  - Faz `trim()` no resultado para evitar whitespace nas pontas.
 *
 * @example
 *   buildMultilineDescription(
 *     'Pagamento da taxa de reserva confirmado.',
 *     'Sua startup Foo já pode seguir para a próxima fase.',
 *   )
 *   // => 'Pagamento da taxa de reserva confirmado.\n\nSua startup Foo já pode seguir para a próxima fase.'
 */
export const buildMultilineDescription = (
  ...lines: Array<string | null | undefined>
): string =>
  lines
    .filter((l): l is string => typeof l === 'string' && l.trim().length > 0)
    .map((l) => l.trim())
    .join('\n\n');
