/**
 * Testes para banking-schema.ts — validação de CPF/CNPJ no campo documentoTitular.
 * Cobre CPF, CNPJ numérico legado e CNPJ alfanumérico (IN RFB 2.229/2024).
 */
import { describe, it, expect } from "vitest";
import { bankingSchema } from "~/lib/banking-schema";
import {
  CNPJ_ALFANUMERICO_MASKED,
  CNPJ_LEGADO_MASKED,
} from "./fixtures/cnpj-alfanumerico-valid";

describe("bankingSchema — documentoTitular", () => {
  it("deve aceitar CPF válido (11 dígitos)", () => {
    const result = bankingSchema.safeParse({
      titular: "João Silva",
      documentoTitular: "123.456.789-00",
      banco: "Banco do Brasil",
      tipoConta: "corrente",
      agencia: "1234",
      conta: "56789",
      digito: "0",
      chavePix: "",
    });
    expect(result.success).toBe(true);
  });

  it("deve aceitar CNPJ numérico legado válido", () => {
    const result = bankingSchema.safeParse({
      titular: "Empresa Legado SA",
      documentoTitular: CNPJ_LEGADO_MASKED[0],
      banco: "Banco do Brasil",
      tipoConta: "corrente",
      agencia: "1234",
      conta: "56789",
      digito: "0",
      chavePix: "",
    });
    expect(result.success).toBe(true);
  });

  it("deve aceitar cada CNPJ alfanumérico mascarado da fixture", () => {
    CNPJ_ALFANUMERICO_MASKED.forEach((cnpj) => {
      const result = bankingSchema.safeParse({
        titular: "Startup Alpha SA",
        documentoTitular: cnpj,
        banco: "Nubank",
        tipoConta: "corrente",
        agencia: "0001",
        conta: "1234567",
        digito: "1",
        chavePix: "",
      });
      expect(result.success).toBe(true);
    });
  });

  it("deve aceitar documento com minúsculas (normalizado para maiúsculas)", () => {
    const result = bankingSchema.safeParse({
      titular: "Empresa Lower SA",
      documentoTitular: "ab.cd1.234/5678-00", // minúsculas
      banco: "Inter",
      tipoConta: "poupanca",
      agencia: "1",
      conta: "12345",
      digito: "X",
      chavePix: "",
    });
    expect(result.success).toBe(true);
  });

  it("deve rejeitar documento com 12 caracteres alfanuméricos (inválido)", () => {
    const result = bankingSchema.safeParse({
      titular: "Empresa Curta",
      documentoTitular: "AB12C3DE45F6", // 12 chars
      banco: "Banco",
      tipoConta: "corrente",
      agencia: "1",
      conta: "1",
      digito: "1",
      chavePix: "",
    });
    expect(result.success).toBe(false);
  });

  it("deve rejeitar documento com 13 caracteres alfanuméricos (inválido)", () => {
    const result = bankingSchema.safeParse({
      titular: "Empresa Incompleta",
      documentoTitular: "AB12C3DE45F60", // 13 chars
      banco: "Banco",
      tipoConta: "corrente",
      agencia: "1",
      conta: "1",
      digito: "1",
      chavePix: "",
    });
    expect(result.success).toBe(false);
  });
});
