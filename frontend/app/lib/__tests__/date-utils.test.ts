/**
 * Testes do formatDateOnlyBR — Sprint S36.
 *
 * Garante que a formatacao de datas no frontend bate com o que o backend
 * armazena em UTC midnight (defesa contra inconsistencias founder/admin).
 */
import { describe, expect, it } from "vitest";
import { formatDateOnlyBR } from "../date-utils";

describe("formatDateOnlyBR", () => {
  it("retorna em-dash quando valor e null", () => {
    expect(formatDateOnlyBR(null)).toBe("—");
  });

  it("retorna em-dash quando valor e undefined", () => {
    expect(formatDateOnlyBR(undefined)).toBe("—");
  });

  it("retorna em-dash quando valor e string vazia", () => {
    expect(formatDateOnlyBR("")).toBe("—");
  });

  it("formata YYYY-MM-DD em pt-BR com UTC", () => {
    expect(formatDateOnlyBR("2026-10-15")).toBe("15/10/2026");
  });

  it("ignora timestamp e usa apenas YYYY-MM-DD (consistencia com UTC midnight do backend)", () => {
    // Backend armazena em UTC midnight (00:00:00.000Z), mas defensivamente
    // aceitamos qualquer string ISO e extraimos apenas o prefixo YYYY-MM-DD.
    expect(formatDateOnlyBR("2026-10-15T00:00:00.000Z")).toBe("15/10/2026");
    expect(formatDateOnlyBR("2026-10-15T23:59:59.999Z")).toBe("15/10/2026");
    expect(formatDateOnlyBR("2026-10-15T12:34:56-03:00")).toBe("15/10/2026");
  });

  it("retorna em-dash para string invalida", () => {
    expect(formatDateOnlyBR("invalid-date")).toBe("—");
    expect(formatDateOnlyBR("2026/10/15")).toBe("—"); // formato errado
  });

  it("lida com meses/dias com zero a esquerda", () => {
    expect(formatDateOnlyBR("2026-01-05")).toBe("05/01/2026");
    expect(formatDateOnlyBR("2026-12-31")).toBe("31/12/2026");
  });
});