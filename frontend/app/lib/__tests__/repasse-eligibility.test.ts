import { describe, it, expect } from "vitest";
import {
  CAN_OPEN_DETAIL_KINDS,
  CAN_REQUEST_KINDS,
  eligibilityBadgeClass,
  getInstallmentEligibility,
} from "../repasse-eligibility";
import type { Installment } from "~/types/repasse";

function makeInst(overrides: Partial<Installment> = {}): Installment {
  return {
    id: 1,
    repasseId: 1,
    numero: 1,
    valor: "100.00",
    scheduledDate: "2026-07-01T10:00:00.000Z",
    paidAt: null,
    status: "AWAITING_REQUEST",
    request: null,
    ...overrides,
  };
}

const NOW = new Date("2026-06-15T10:00:00.000Z");

describe("getInstallmentEligibility", () => {
  describe("status COMPLETED", () => {
    it("retorna completed", () => {
      const inst = makeInst({ id: 1, numero: 1, status: "COMPLETED" });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("completed");
    });
  });

  describe("status REQUESTED/PROCESSING", () => {
    it("REQUESTED → awaiting-financeiro", () => {
      const inst = makeInst({ id: 1, numero: 1, status: "REQUESTED" });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("awaiting-financeiro");
    });

    it("PROCESSING → awaiting-financeiro", () => {
      const inst = makeInst({ id: 1, numero: 1, status: "PROCESSING" });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("awaiting-financeiro");
    });
  });

  describe("status REJECTED", () => {
    it("retorna rejected (permite resubmit)", () => {
      const inst = makeInst({ id: 1, numero: 1, status: "REJECTED" });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("rejected");
    });
  });

  describe("status AWAITING_REQUEST — regra sequencial", () => {
    it("parcela #1 sem prev → ready", () => {
      const inst = makeInst({ id: 1, numero: 1, scheduledDate: "2026-06-22T10:00:00.000Z" });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("ready");
    });

    it("parcela #2 com prev COMPLETED + janela aberta → ready", () => {
      const prev = makeInst({ id: 1, numero: 1, status: "COMPLETED" });
      const inst2 = makeInst({ id: 2, numero: 2, scheduledDate: "2026-06-22T10:00:00.000Z" });
      const result = getInstallmentEligibility({
        installment: inst2,
        allInstallments: [prev, inst2],
        now: NOW,
      });
      expect(result.kind).toBe("ready");
    });

    it("parcela #2 com prev NAO COMPLETED → awaiting-prev", () => {
      const prev = makeInst({ id: 1, numero: 1, status: "AWAITING_REQUEST" });
      const inst2 = makeInst({ id: 2, numero: 2, scheduledDate: "2026-06-22T10:00:00.000Z" });
      const result = getInstallmentEligibility({
        installment: inst2,
        allInstallments: [prev, inst2],
        now: NOW,
      });
      expect(result.kind).toBe("awaiting-prev");
      if (result.kind === "awaiting-prev") {
        expect(result.prevNumero).toBe(1);
      }
    });

    it("parcela #2 sem prev (lista vazia) → awaiting-prev", () => {
      const inst2 = makeInst({ id: 2, numero: 2, scheduledDate: "2026-06-22T10:00:00.000Z" });
      const result = getInstallmentEligibility({
        installment: inst2,
        allInstallments: [inst2],
        now: NOW,
      });
      expect(result.kind).toBe("awaiting-prev");
    });
  });

  describe("status AWAITING_REQUEST — regra de janela", () => {
    it("scheduledDate no futuro distante → awaiting-window", () => {
      // scheduledDate = 2026-08-15 (2 meses no futuro)
      // earliest = 2026-08-05 (10 dias antes)
      // now = 2026-06-15 → 51 dias de espera
      const inst = makeInst({ id: 1, numero: 1, scheduledDate: "2026-08-15T10:00:00.000Z" });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("awaiting-window");
      if (result.kind === "awaiting-window") {
        expect(result.daysRemaining).toBe(51);
      }
    });

    it("scheduledDate 10 dias no futuro → awaiting-window (1 dia restante)", () => {
      // scheduledDate = 2026-06-25 (10 dias no futuro)
      // earliest = 2026-06-15 (10 dias antes) → exatamente igual a now
      // Math.ceil(now - earliest) / 1 dia = 0 (não é strictly <)
      // Como now >= earliest, deve ser 'ready'
      // Para testar awaiting-window: scheduledDate = 2026-07-01 (16 dias no futuro)
      // earliest = 2026-06-21 (10 dias antes) → 6 dias no futuro
      const inst = makeInst({ id: 1, numero: 1, scheduledDate: "2026-07-01T10:00:00.000Z" });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("awaiting-window");
      if (result.kind === "awaiting-window") {
        expect(result.daysRemaining).toBe(6);
      }
    });

    it("scheduledDate hoje → ready (dentro da janela)", () => {
      // scheduledDate = hoje, earliest = hoje - 10d, agora estamos em 'hoje'
      // Com now = 2026-06-15 e scheduledDate = 2026-06-15,
      // earliest = 2026-06-05, now >= earliest → ready
      const inst = makeInst({ id: 1, numero: 1, scheduledDate: "2026-06-15T10:00:00.000Z" });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("ready");
    });

    it("scheduledDate sem valor → no-date", () => {
      const inst = makeInst({ id: 1, numero: 1, scheduledDate: null });
      const result = getInstallmentEligibility({
        installment: inst,
        allInstallments: [inst],
        now: NOW,
      });
      expect(result.kind).toBe("no-date");
    });
  });
});

describe("constants de visibilidade", () => {
  it("CAN_REQUEST_KINDS contém apenas 'ready'", () => {
    expect(CAN_REQUEST_KINDS).toEqual(["ready"]);
  });

  it("CAN_OPEN_DETAIL_KINDS contém todos os kinds", () => {
    expect(CAN_OPEN_DETAIL_KINDS.length).toBeGreaterThanOrEqual(7);
    expect(CAN_OPEN_DETAIL_KINDS).toContain("ready");
    expect(CAN_OPEN_DETAIL_KINDS).toContain("rejected");
    expect(CAN_OPEN_DETAIL_KINDS).toContain("completed");
  });
});

describe("eligibilityBadgeClass", () => {
  it("retorna classes para todos os kinds", () => {
    const kinds: Array<
      ReturnType<typeof getInstallmentEligibility>["kind"]
    > = [
      "ready",
      "awaiting-prev",
      "awaiting-window",
      "awaiting-financeiro",
      "completed",
      "rejected",
      "no-date",
    ];
    for (const kind of kinds) {
      const cls = eligibilityBadgeClass(kind);
      expect(cls).toContain("border-");
    }
  });
});