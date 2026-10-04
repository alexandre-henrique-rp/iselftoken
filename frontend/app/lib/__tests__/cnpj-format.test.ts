/**
 * Testes para getAlphanumeric, getOnlyDigits, formatCnpj e isCnpjComplete (cnpj-format.ts).
 * Cobre tanto CNPJ numérico legado quanto alfanumérico novo (IN RFB 2.229/2024).
 */
import { describe, it, expect } from "vitest";
import {
  getAlphanumeric,
  getOnlyDigits,
  formatCnpj,
  isCnpjComplete,
} from "~/lib/cnpj-format";
import {
  CNPJ_ALFANUMERICO_RAW,
  CNPJ_ALFANUMERICO_MASKED,
  CNPJ_LEGADO,
  CNPJ_LEGADO_MASKED,
} from "./fixtures/cnpj-alfanumerico-valid";

describe("getOnlyDigits", () => {
  it("deve remover máscara e retornar apenas dígitos", () => {
    expect(getOnlyDigits("12.345.678/0001-90")).toBe("12345678000190");
  });

  it("deve ignorar letras em CNPJ alfanumérico", () => {
    // getOnlyDigits é deprecated e strippa letras (comportamento legacy)
    expect(getOnlyDigits("AB12C3DE45F678")).toBe("12345678");
  });

  it("deve retornar string vazia para entrada vazia", () => {
    expect(getOnlyDigits("")).toBe("");
  });
});

describe("getAlphanumeric", () => {
  it("deve retornar CNPJ legado mascarado normalizado", () => {
    expect(getAlphanumeric("12.345.678/0001-90")).toBe("12345678000190");
  });

  it("deve retornar CNPJ alfanumérico mascarado normalizado", () => {
    expect(getAlphanumeric("AB.12C.3DE/45F6-00")).toBe("AB12C3DE45F600");
  });

  it("deve converter minúsculas para maiúsculas", () => {
    expect(getAlphanumeric("ab12c3de45f600")).toBe("AB12C3DE45F600");
  });

  it("deve retornar string vazia para entrada vazia", () => {
    expect(getAlphanumeric("")).toBe("");
  });

  it("deve truncar para 14 caracteres", () => {
    expect(getAlphanumeric("AB12C3DE45F600XXXX")).toBe("AB12C3DE45F600");
  });
});

describe("formatCnpj", () => {
  it("deve formatar CNPJ numérico legado (14 dígitos)", () => {
    expect(formatCnpj("12345678000190")).toBe("12.345.678/0001-90");
  });

  it("deve formatar CNPJ alfanumérico raw", () => {
    expect(formatCnpj("AB12C3DE45F600")).toBe("AB.12C.3DE/45F6-00");
  });

  it("formatCnpj preserva letras no radical", () => {
    // Caso específico: letras intercaladas no radical alfanumérico
    expect(formatCnpj("12ABC34501DE35")).toBe("12.ABC.345/01DE-35");
  });

  it("deve formatar corretamente cada CNPJ alfanumérico raw da fixture", () => {
    CNPJ_ALFANUMERICO_RAW.forEach((raw, i) => {
      expect(formatCnpj(raw)).toBe(CNPJ_ALFANUMERICO_MASKED[i]);
    });
  });

  it("deve formatar corretamente cada CNPJ legado raw da fixture", () => {
    CNPJ_LEGADO.forEach((raw, i) => {
      expect(formatCnpj(raw)).toBe(CNPJ_LEGADO_MASKED[i]);
    });
  });

  it("deve formatar entrada parcial progressivamente", () => {
    expect(formatCnpj("AB")).toBe("AB");
    expect(formatCnpj("AB12")).toBe("AB.12");
    expect(formatCnpj("AB12C")).toBe("AB.12C");
    expect(formatCnpj("AB12C3DE")).toBe("AB.12C.3DE");
    expect(formatCnpj("AB12C3DE45F")).toBe("AB.12C.3DE/45F");
    expect(formatCnpj("AB12C3DE45F6")).toBe("AB.12C.3DE/45F6");
    expect(formatCnpj("AB12C3DE45F60")).toBe("AB.12C.3DE/45F6-0");
    expect(formatCnpj("AB12C3DE45F600")).toBe("AB.12C.3DE/45F6-00");
  });

  it("deve retornar string vazia para entrada vazia", () => {
    expect(formatCnpj("")).toBe("");
  });
});

describe("isCnpjComplete", () => {
  it("deve retornar true para CNPJ numérico completo", () => {
    expect(isCnpjComplete("12.345.678/0001-90")).toBe(true);
    expect(isCnpjComplete("12345678000190")).toBe(true);
  });

  it("deve retornar true para CNPJ alfanumérico completo", () => {
    expect(isCnpjComplete("AB.12C.3DE/45F6-00")).toBe(true);
    expect(isCnpjComplete("AB12C3DE45F600")).toBe(true);
  });

  it("deve retornar false para entrada parcial", () => {
    expect(isCnpjComplete("AB.12C")).toBe(false);
    expect(isCnpjComplete("AB12C3DE45F6")).toBe(false);
  });

  it("deve retornar false para string vazia", () => {
    expect(isCnpjComplete("")).toBe(false);
  });
});
