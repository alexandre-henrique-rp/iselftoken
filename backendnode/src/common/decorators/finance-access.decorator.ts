import { SetMetadata } from '@nestjs/common';

export type FinanceAccessMode = 'read' | 'write';
export const FINANCE_ACCESS_KEY = 'financeAccess';

/**
 * Declara o nível de acesso requerido por uma rota do painel financeiro.
 *
 * - `read`: aceita `ADMIN`, `FINANCEIRO`, `COMPLIANCE`.
 * - `write`: aceita apenas `ADMIN` e `FINANCEIRO` (compliance não atua).
 *
 * Aplicado em conjunto com `FinanceRoleGuard`. Default quando não declarado
 * é `read` (mais conservador — protege com leitura mas não permite alterar).
 */
export const FinanceAccess = (mode: FinanceAccessMode) =>
  SetMetadata(FINANCE_ACCESS_KEY, mode);
