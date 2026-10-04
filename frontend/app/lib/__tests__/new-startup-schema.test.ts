/**
 * Testes para new-startup-schema.ts — validação Zod de CNPJ alfanumérico.
 * Cobre regex alfanumérico + validator com DV real (IN RFB 2.229/2024).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeDv, newStartupSchema } from "~/lib/new-startup-schema";
import {
  CNPJ_ALFANUMERICO_INVALID_MASKED,
  CNPJ_LEGADO_INVALID_MASKED,
} from "./fixtures/cnpj-alfanumerico-invalid";
import {
  CNPJ_ALFANUMERICO_MASKED,
  CNPJ_LEGADO_MASKED,
} from "./fixtures/cnpj-alfanumerico-valid";

describe("computeDv (helper)", () => {
  it("retorna DVs do exemplo do manual oficial", () => {
    expect(computeDv("12ABC34501DE")).toBe("35");
  });

  it("lança erro para radical de tamanho diferente de 12", () => {
    expect(() => computeDv("1234")).toThrow();
    expect(() => computeDv("ABCDEFGHIJKLABCDEF")).toThrow(); // 18 chars
    expect(() => computeDv("ABC")).toThrow(); // 3 chars
  });

  it("produz DV com resto <= 1 como 0", () => {
    // Radical "000000000000": soma=0, resto=0, DV=0
    expect(computeDv("000000000000")).toBe("00");
  });

  it("calcula DV correto para radical com letras intercaladas", () => {
    // computeDv("AB12C3DE45F6") = "59" — validado algorithmicamente
    expect(computeDv("AB12C3DE45F6")).toBe("59");
  });

  it("calcula DV correto para CNPJ numérico legado", () => {
    // computeDv("123456780001") = "95"
    expect(computeDv("123456780001")).toBe("95");
  });
});

describe("newStartupSchema — cnpj", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  // ── CNPJ alfanumérico com DV válido ───────────────────────────────────────

  describe("CNPJ alfanumérico — aceita com DV válido (algoritmo RFB)", () => {
    it.each(CNPJ_ALFANUMERICO_MASKED)("aceita CNPJ válido %s", (cnpj) => {
      const result = newStartupSchema.safeParse({
        razaoSocial: "Startup Alpha S.A.",
        nomeFantasia: "Alpha",
        cnpj,
        dataAbertura: "01/01/2026",
        paisIso3: "BRA",
        areaAtuacao: "fintech",
        estagio: "mvp",
        descricao: "Descrição longa o suficiente para passar",
        logoUrl: "https://exemplo.com/logo.png",
        pitchDeckUrl: "",
        videoPitch: "",
        website: "",
        linkedin: "",
        titular: "Maria Costa",
        banco: "Nubank",
        agencia: "0001",
        conta: "1234567",
        digito: "1",
        metaCaptacao: 500000,
        equityOferecido: 8,
        wantsFastTrackReview: false,
      });
      expect(result.success).toBe(true);
    });

    it("não emite console.warn para CNPJ alfanumérico com DV válido", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = newStartupSchema.safeParse({
        razaoSocial: "Startup Warn SA",
        nomeFantasia: "Warn",
        cnpj: CNPJ_ALFANUMERICO_MASKED[0],
        dataAbertura: "01/01/2026",
        paisIso3: "BRA",
        areaAtuacao: "fintech",
        estagio: "mvp",
        descricao: "Descrição para passar no min 10 chars",
        logoUrl: "https://exemplo.com/logo.png",
        pitchDeckUrl: "",
        videoPitch: "",
        website: "",
        linkedin: "",
        titular: "Ana",
        banco: "Banco",
        agencia: "1",
        conta: "1",
        digito: "1",
metaCaptacao: 500000,
        equityOferecido: 8,
        wantsFastTrackReview: false,
      });
      expect(result.success).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  // ── CNPJ alfanumérico com DV inválido ────────────────────────────────────

  describe("CNPJ alfanumérico — rejeita com DV inválido", () => {
    it.each(CNPJ_ALFANUMERICO_INVALID_MASKED)(
      "rejeita CNPJ com DV errado: %s",
      (cnpj) => {
        const result = newStartupSchema.safeParse({
          razaoSocial: "Startup Inválida SA",
          nomeFantasia: "Inv",
          cnpj,
          dataAbertura: "01/01/2026",
          paisIso3: "BRA",
          areaAtuacao: "fintech",
          estagio: "mvp",
          descricao: "Descrição para passar no min 10 chars",
          logoUrl: "https://exemplo.com/logo.png",
          pitchDeckUrl: "",
          videoPitch: "",
          website: "",
          linkedin: "",
          titular: "João Silva",
          banco: "Banco",
          agencia: "1",
          conta: "1",
          digito: "1",
          metaCaptacao: 500000,
          equityOferecido: 1,
          wantsFastTrackReview: false,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          const msg = result.error.issues[0]?.message ?? "";
          expect(msg).toMatch(/verificador|formato/i);
        }
      },
    );
  });

  // ── CNPJ numérico legado ──────────────────────────────────────────────────

  describe("CNPJ numérico legado — regressão S01", () => {
    it("aceita CNPJ numérico 14 dígitos válido", () => {
      const result = newStartupSchema.safeParse({
        razaoSocial: "Empresa Teste SA",
        nomeFantasia: "Teste",
        cnpj: CNPJ_LEGADO_MASKED[0],
        dataAbertura: "01/01/2020",
        paisIso3: "BRA",
        areaAtuacao: "tecnologia_saas",
        estagio: "operacao",
        descricao: "Descrição longa o suficiente para passar",
        logoUrl: "https://exemplo.com/logo.png",
        pitchDeckUrl: "",
        videoPitch: "",
        website: "",
        linkedin: "",
        titular: "João Silva",
        banco: "Banco do Brasil",
        agencia: "1234",
        conta: "56789",
        digito: "0",
        metaCaptacao: 500000,
        equityOferecido: 10,
        wantsFastTrackReview: false,
      });
      expect(result.success).toBe(true);
    });

    it("rejeita CNPJ numérico com DV errado", () => {
      const result = newStartupSchema.safeParse({
        razaoSocial: "Empresa Inválida SA",
        nomeFantasia: "Inv",
        cnpj: CNPJ_LEGADO_INVALID_MASKED[0],
        dataAbertura: "01/01/2020",
        paisIso3: "BRA",
        areaAtuacao: "tecnologia_saas",
        estagio: "operacao",
        descricao: "Descrição longa o suficiente para passar",
        logoUrl: "https://exemplo.com/logo.png",
        pitchDeckUrl: "",
        videoPitch: "",
        website: "",
        linkedin: "",
        titular: "João Silva",
        banco: "Banco",
        agencia: "1",
        conta: "1",
        digito: "1",
        metaCaptacao: 500000,
        equityOferecido: 10,
        wantsFastTrackReview: false,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Casos de formato ─────────────────────────────────────────────────────

  describe("CNPJ — validação de formato (regex)", () => {
    it("deve rejeitar CNPJ com comprimento curto", () => {
      const result = newStartupSchema.safeParse({
        razaoSocial: "Empresa Curta",
        nomeFantasia: "EC",
        cnpj: "12.345.678/0001-9", // 13 dígitos (falta 1)
        dataAbertura: "01/01/2020",
        paisIso3: "BRA",
        areaAtuacao: "tecnologia_saas",
        estagio: "operacao",
        descricao: "Descrição curta que não passa",
        logoUrl: "https://exemplo.com/logo.png",
        pitchDeckUrl: "",
        videoPitch: "",
        website: "",
        linkedin: "",
        titular: "João Silva",
        banco: "Banco",
        agencia: "1",
        conta: "1",
        digito: "1",
        metaCaptacao: 500000,
        equityOferecido: 10,
        wantsFastTrackReview: false,
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar CNPJ alfanumérico com minúsculas", () => {
      // Regex exige maiúsculas; minúsculas devem falhar no formato
      const result = newStartupSchema.safeParse({
        razaoSocial: "Empresa Lower",
        nomeFantasia: "Lower",
        cnpj: "ab.12c.3de/45f6-00", // minúsculas
        dataAbertura: "01/01/2020",
        paisIso3: "BRA",
        areaAtuacao: "tecnologia_saas",
        estagio: "operacao",
        descricao: "Descrição de teste com tamanho suficiente",
        logoUrl: "https://exemplo.com/logo.png",
        pitchDeckUrl: "",
        videoPitch: "",
        website: "",
        linkedin: "",
        titular: "João Silva",
        banco: "Banco",
        agencia: "1",
        conta: "1",
        digito: "1",
        metaCaptacao: 500000,
        equityOferecido: 10,
        wantsFastTrackReview: false,
      });
      expect(result.success).toBe(false);
    });

    it("deve rejeitar CNPJ com DV numérico em formato alfanumérico", () => {
      // Regex exige DV como \d{2} — aceita alfanumérico no DV? Não, só aceita dígitos
      const result = newStartupSchema.safeParse({
        razaoSocial: "Empresa DV Letra",
        nomeFantasia: "DVLetra",
        cnpj: "AB.12C.3DE/45F6-A5", // DV com letra (inválido)
        dataAbertura: "01/01/2020",
        paisIso3: "BRA",
        areaAtuacao: "tecnologia_saas",
        estagio: "operacao",
        descricao: "Descrição de teste com tamanho suficiente",
        logoUrl: "https://exemplo.com/logo.png",
        pitchDeckUrl: "",
        videoPitch: "",
        website: "",
        linkedin: "",
        titular: "João Silva",
        banco: "Banco",
        agencia: "1",
        conta: "1",
        digito: "1",
        metaCaptacao: 500000,
        equityOferecido: 10,
        wantsFastTrackReview: false,
      });
      expect(result.success).toBe(false);
    });
  });
});
