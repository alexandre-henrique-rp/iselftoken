import type { UserData } from "~/types/auth";

/**
 * Campos do perfil do usuário que a EFI exige em cobranças de cartão one-step.
 *
 * Sem eles, a API da EFI retorna 3500010 `property_does_not_exists` (culpa
 * o primeiro campo que valida quando QUALQUER obrigatório do nó
 * `payment.credit_card` está faltando).
 *
 * Lista completa (ver backend `payment.service.ts`):
 *   - customer.cpf        → User.reg_documento
 *   - customer.birth      → User.data_nascimento
 *   - billing_address     → User.endereco / numero / bairro / cidade / uf / cep
 */
export const CARD_PAYMENT_REQUIRED_PROFILE_FIELDS = [
  "reg_documento",
  "data_nascimento",
  "endereco",
  "numero",
  "bairro",
  "cidade",
  "uf",
  "cep",
] as const;

/**
 * Verifica se o usuário tem TODOS os campos de perfil obrigatórios para
 * pagar com cartão de crédito (EFI one-step).
 *
 * @returns `null` se completo, ou array com nomes dos campos faltantes.
 */
export function getMissingProfileFieldsForCardPayment(
  user: UserData | null | undefined,
): string[] {
  if (!user) return [...CARD_PAYMENT_REQUIRED_PROFILE_FIELDS];

  const missing: string[] = [];
  for (const field of CARD_PAYMENT_REQUIRED_PROFILE_FIELDS) {
    const value = (user as unknown as Record<string, unknown>)[field];
    if (value == null || String(value).trim() === "") {
      missing.push(field);
    }
  }
  return missing;
}

/**
 * Versão boolean: `true` se o usuário pode pagar com cartão agora.
 */
export function isProfileCompleteForCardPayment(
  user: UserData | null | undefined,
): boolean {
  return getMissingProfileFieldsForCardPayment(user).length === 0;
}

/**
 * Labels PT-BR para exibir ao usuário quais campos faltam.
 */
export const PROFILE_FIELD_LABELS: Record<
  (typeof CARD_PAYMENT_REQUIRED_PROFILE_FIELDS)[number],
  string
> = {
  reg_documento: "CPF/CNPJ",
  data_nascimento: "Data de nascimento",
  endereco: "Endereço (rua)",
  numero: "Número",
  bairro: "Bairro",
  cidade: "Cidade",
  uf: "UF (estado)",
  cep: "CEP",
};
