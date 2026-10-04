import { describe, expect, it } from "vitest";
import { formatDateOnlyBR } from "./date-utils";

describe("formatDateOnlyBR", () => {
  it("preserva a data-calendário de scheduledDate em UTC", () => {
    expect(formatDateOnlyBR("2026-10-30T00:00:00.000Z")).toBe("30/10/2026");
  });

  it("retorna placeholder para data ausente ou inválida", () => {
    expect(formatDateOnlyBR(null)).toBe("—");
    expect(formatDateOnlyBR("not-a-date")).toBe("—");
  });
});
