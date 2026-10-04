import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  RepasseSlaCountdown,
  businessDaysBetween,
} from "../repasse-sla-countdown";

function dayOffsetMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

describe("RepasseSlaCountdown", () => {
  // Mock global Date.now para determinismo
  const realNow = Date.now;

  describe("businessDaysBetween (helper)", () => {
    it("retorna 0 quando datas sao identicas", () => {
      const ref = new Date("2026-08-10T12:00:00Z").getTime();
      expect(businessDaysBetween(ref, ref)).toBe(0);
    });

    it("conta dias uteis pulando fds", () => {
      // terca -> terca proxima = 5 dias uteis (inclui skip fim-de-semana)
      const tue = new Date("2026-08-11T12:00:00Z").getTime(); // terca
      const tueNext = new Date("2026-08-18T12:00:00Z").getTime(); // terca
      expect(businessDaysBetween(tue, tueNext)).toBe(5);
    });

    it("retorna negativo quando `to` esta antes de `from`", () => {
      const fri = new Date("2026-08-14T12:00:00Z").getTime();
      const mon = new Date("2026-08-10T12:00:00Z").getTime();
      const result = businessDaysBetween(fri, mon);
      expect(result).toBeLessThan(0);
      expect(result).toBe(-4);
    });
  });

  describe("renderizacao por cor (data relativa)", () => {
    it("mostra mais de 2 dias restantes (tom success/verde) quando ha 3 dias uteis pela frente", () => {
      // 0 dias uteis passados => 5 restantes > 2 -> verde
      const now = new Date("2026-08-17T12:00:00Z").getTime();
      const submitted = now - dayOffsetMs(0);
      Date.now = () => now;
      try {
        render(<RepasseSlaCountdown submittedAt={new Date(submitted).toISOString()} />);
        const el = screen.getByTestId("sla-countdown");
        expect(el).toHaveAttribute("data-tone", "success");
        expect(el.textContent).toMatch(/5 dias uteis restantes/i);
      } finally {
        Date.now = realNow;
      }
    });

    it("mostra amarelo quando ha 1 dia util restante", () => {
      // 4 dias uteis passados => 1 restante -> amarelo
      const now = new Date("2026-08-20T12:00:00Z").getTime(); // quinta
      // submitted foi numa sexta anterior que da exatamente 4 dias uteis (pula sab/dom)
      const submitted = new Date("2026-08-14T12:00:00Z"); // sexta anterior
      Date.now = () => now;
      try {
        render(<RepasseSlaCountdown submittedAt={submitted.toISOString()} />);
        const el = screen.getByTestId("sla-countdown");
        expect(el).toHaveAttribute("data-tone", "warning");
        expect(el.textContent).toMatch(/1 dia util restante/i);
      } finally {
        Date.now = realNow;
      }
    });

    it("mostra vermelho quando atrasado", () => {
      // submitted ha > 5 dias uteis -> overdue
      const now = new Date("2026-08-25T12:00:00Z").getTime(); // terca
      // Aug 11 (Tue) -> Aug 25 (Tue): 10 business days (weekend dedup)
      const submitted = new Date("2026-08-11T12:00:00Z"); // terca anterior
      Date.now = () => now;
      try {
        render(<RepasseSlaCountdown submittedAt={submitted.toISOString()} />);
        const el = screen.getByTestId("sla-countdown");
        expect(el).toHaveAttribute("data-tone", "danger");
        // elapsed=10, overdue = 10-5 = 5
        expect(el.getAttribute("data-overdue")).toBe("5");
        expect(el.textContent).toMatch(/ATRASADO em 5 dias uteis/i);
      } finally {
        Date.now = realNow;
      }
    });
  });

  it("lida com data invalida de submittedAt sem quebrar", () => {
    Date.now = () => new Date("2026-08-10T12:00:00Z").getTime();
    try {
      render(<RepasseSlaCountdown submittedAt="data-invalida" />);
      expect(screen.getByTestId("sla-countdown").textContent).toMatch(/data invalida/i);
    } finally {
      Date.now = realNow;
    }
  });
});
