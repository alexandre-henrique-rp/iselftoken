/**
 * Testes para card-payment-profile.ts — verificação de completude do
 * perfil para pagamento com cartão (EFI one-step).
 *
 * A EFI exige: cpf, birth (YYYY-MM-DD) e billing_address (street, number,
 * neighborhood, zipcode, city, state). Sem esses campos, retorna 3500010
 * "payment_token não existe" (culpa o primeiro campo que valida quando
 * qualquer obrigatório do nó payment.credit_card falha).
 */
import type { UserData } from "~/types/auth";
import { describe, expect, it } from "vitest";
import {
  CARD_PAYMENT_REQUIRED_PROFILE_FIELDS,
  getMissingProfileFieldsForCardPayment,
  isProfileCompleteForCardPayment,
  PROFILE_FIELD_LABELS,
} from "~/lib/card-payment-profile";

const completeUser: UserData = {
  id: 1,
  publicId: "u-1",
  email: "test@test.com",
  nome: "Test",
  role: "USER",
  telefone: "11999998888",
  data_nascimento: "1990-01-01",
  genero: "HOMEM",
  endereco: "Rua A",
  numero: "123",
  complemento: "",
  bairro: "Centro",
  cidade: "São Paulo",
  uf: "SP",
  cep: "01000000",
  pais: "BR",
  tipo_documento: "CPF",
  reg_documento: "94271564656",
  isActive: true,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("isProfileCompleteForCardPayment", () => {
  it("returns true when all required fields are filled", () => {
    expect(isProfileCompleteForCardPayment(completeUser)).toBe(true);
  });

  it("returns false when user is null", () => {
    expect(isProfileCompleteForCardPayment(null)).toBe(false);
    expect(isProfileCompleteForCardPayment(undefined)).toBe(false);
  });

  it("returns false when data_nascimento is missing", () => {
    expect(
      isProfileCompleteForCardPayment({ ...completeUser, data_nascimento: "" }),
    ).toBe(false);
  });

  it("returns false when endereco is missing", () => {
    expect(
      isProfileCompleteForCardPayment({ ...completeUser, endereco: "" }),
    ).toBe(false);
  });

  it("returns false when cep is missing", () => {
    expect(isProfileCompleteForCardPayment({ ...completeUser, cep: "" })).toBe(
      false,
    );
  });

  it("treats whitespace-only strings as missing", () => {
    expect(
      isProfileCompleteForCardPayment({
        ...completeUser,
        endereco: "   ",
      }),
    ).toBe(false);
  });
});

describe("getMissingProfileFieldsForCardPayment", () => {
  it("returns empty array when profile is complete", () => {
    expect(getMissingProfileFieldsForCardPayment(completeUser)).toEqual([]);
  });

  it("returns the missing field name", () => {
    const { data_nascimento, ...without } = completeUser;
    void data_nascimento;
    const result = getMissingProfileFieldsForCardPayment(
      without as unknown as UserData,
    );
    expect(result).toContain("data_nascimento");
  });

  it("returns all required field names when user is null", () => {
    const result = getMissingProfileFieldsForCardPayment(null);
    expect(result).toEqual([...CARD_PAYMENT_REQUIRED_PROFILE_FIELDS]);
  });

  it("returns multiple missing fields", () => {
    const result = getMissingProfileFieldsForCardPayment({
      ...completeUser,
      data_nascimento: "",
      endereco: "",
      reg_documento: "",
    });
    expect(result).toContain("data_nascimento");
    expect(result).toContain("endereco");
    expect(result).toContain("reg_documento");
  });
});

describe("PROFILE_FIELD_LABELS", () => {
  it("has a label for every required field", () => {
    for (const field of CARD_PAYMENT_REQUIRED_PROFILE_FIELDS) {
      expect(PROFILE_FIELD_LABELS[field]).toBeTruthy();
    }
  });

  it("uses PT-BR labels", () => {
    expect(PROFILE_FIELD_LABELS.data_nascimento).toBe("Data de nascimento");
    expect(PROFILE_FIELD_LABELS.cep).toBe("CEP");
  });
});
