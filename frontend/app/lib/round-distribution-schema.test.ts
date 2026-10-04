import { describe, it, expect } from "vitest";
import {
  MAX_FUNDADOR_PERCENTUAL,
  roundDistributionSchema,
} from "./round-distribution-schema";

describe("roundDistributionSchema", () => {
  // CASE.md [Captação] Alocação de Recursos: FUNDADOR <= 20%.
  const validInput = {
    recursosFundador: 20,
    recursosDesenvolvimento: 30,
    recursosComercial: 20,
    recursosMarketing: 10,
    recursosNuvem: 8,
    recursosJuridico: 7,
    recursosCaixa: 5,
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // 6 cenários obrigatórios
  // ─────────────────────────────────────────────────────────────────────────────

  it("1️⃣ aceita quando soma é exatamente 100", () => {
    const result = roundDistributionSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("2️⃣ rejeita quando soma é 99.96 (7 campos × ~14.28)", () => {
    const result = roundDistributionSchema.safeParse({
      recursosFundador: 14.28,
      recursosDesenvolvimento: 14.28,
      recursosComercial: 14.28,
      recursosMarketing: 14.28,
      recursosNuvem: 14.28,
      recursosJuridico: 14.28,
      recursosCaixa: 14.28,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/soma/i);
    expect(result.error?.issues[0].message).toMatch(/100/);
  });

  it("3️⃣ rejeita quando soma é 100.03 (7 campos × ~14.29)", () => {
    const result = roundDistributionSchema.safeParse({
      recursosFundador: 14.29,
      recursosDesenvolvimento: 14.29,
      recursosComercial: 14.29,
      recursosMarketing: 14.29,
      recursosNuvem: 14.29,
      recursosJuridico: 14.29,
      recursosCaixa: 14.29,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/soma/i);
    expect(result.error?.issues[0].message).toMatch(/100/);
  });

  it("4️⃣ rejeita quando soma é 0 (todos os campos = 0)", () => {
    const result = roundDistributionSchema.safeParse({
      recursosFundador: 0,
      recursosDesenvolvimento: 0,
      recursosComercial: 0,
      recursosMarketing: 0,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/soma/i);
    expect(result.error?.issues[0].message).toMatch(/0/);
  });

  it("5️⃣ rejeita campo negativo (recursosFundador = -5)", () => {
    const result = roundDistributionSchema.safeParse({
      ...validInput,
      recursosFundador: -5,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("recursosFundador");
  });

  it("6️⃣ rejeita campo > 100 (recursosMarketing = 150)", () => {
    const result = roundDistributionSchema.safeParse({
      ...validInput,
      recursosMarketing: 150,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("recursosMarketing");
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Bônus
  // ─────────────────────────────────────────────────────────────────────────────

  it("7️⃣ rejeita soma = 99 (sem decimais)", () => {
    // Antes da regra do cap, usava FUNDADOR=99 — agora FUNDADOR está capado
    // em 20% e a checagem do cap ocorre ANTES da soma. Usamos RESERVA_CAIXA
    // para isolar o teste à regra de soma=100.
    const input = {
      recursosFundador: 0,
      recursosDesenvolvimento: 0,
      recursosComercial: 0,
      recursosMarketing: 0,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 99,
    };
    const result = roundDistributionSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/soma/i);
    expect(result.error?.issues[0].message).toMatch(/100/);
  });

  it("8️⃣ rejeita soma = 101 (50+51 sem ultrapassar max de campo)", () => {
    // Antes usava FUNDADOR=50 — agora cap FUNDADOR é 20. Usamos DESENV=50 +
    // MARKETING=51 para isolar a regra de soma=100.
    const input = {
      recursosFundador: 0,
      recursosDesenvolvimento: 50,
      recursosComercial: 0,
      recursosMarketing: 51,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 0,
    };
    const result = roundDistributionSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/soma/i);
    expect(result.error?.issues[0].message).toMatch(/100/);
  });

  it("9️⃣ aceita apenas 1 campo = 100 e os demais = 0 (campo ≠ FUNDADOR)", () => {
    // Caso legado: um campo = 100 e os demais = 0. Era FUNDADOR no schema
    // antigo, mas hoje FUNDADOR é capado em 20% — então usamos RESERVA_CAIXA.
    const result = roundDistributionSchema.safeParse({
      recursosFundador: 0,
      recursosDesenvolvimento: 0,
      recursosComercial: 0,
      recursosMarketing: 0,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 100,
    });
    expect(result.success).toBe(true);
  });

  it("🔟 rejeita quando um campo está ausente", () => {
    const { recursosCaixa: _caixa, ...withoutCaixa } = validInput;
    const result = roundDistributionSchema.safeParse(withoutCaixa);
    expect(result.success).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CASE.md [Captação] Alocação de Recursos — cap FUNDADOR <= 20%
  // ─────────────────────────────────────────────────────────────────────────────

  it("1️⃣1️⃣ aceita FUNDADOR exatamente no limite (20%)", () => {
    const result = roundDistributionSchema.safeParse({
      recursosFundador: MAX_FUNDADOR_PERCENTUAL,
      recursosDesenvolvimento: 80,
      recursosComercial: 0,
      recursosMarketing: 0,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 0,
    });
    expect(result.success).toBe(true);
  });

  it("1️⃣2️⃣ rejeita FUNDADOR acima do limite (21%) com mensagem amigável", () => {
    const result = roundDistributionSchema.safeParse({
      recursosFundador: 21,
      recursosDesenvolvimento: 79,
      recursosComercial: 0,
      recursosMarketing: 0,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("recursosFundador");
    expect(result.error?.issues[0].message).toMatch(/20%/);
    expect(result.error?.issues[0].message).toMatch(/Fundador/i);
  });

  it("1️⃣3️⃣ rejeita FUNDADOR = 100% (legacy — antes da regra de cap)", () => {
    const result = roundDistributionSchema.safeParse({
      recursosFundador: 100,
      recursosDesenvolvimento: 0,
      recursosComercial: 0,
      recursosMarketing: 0,
      recursosNuvem: 0,
      recursosJuridico: 0,
      recursosCaixa: 0,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("recursosFundador");
  });
});
