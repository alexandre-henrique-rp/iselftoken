import { describe, expect, it } from "vitest";
import { centroidShift, meanDelta } from "./movement";
import type { Point } from "./types";

describe("meanDelta", () => {
  it("retorna 0 quando os pontos são idênticos", () => {
    const a: Point[] = [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.4 },
    ];
    expect(meanDelta(a, a)).toBe(0);
  });

  it("calcula a distância euclidiana média", () => {
    const a: Point[] = [{ x: 0, y: 0 }];
    const b: Point[] = [{ x: 3, y: 4 }]; // dist = 5
    expect(meanDelta(a, b)).toBeCloseTo(5, 6);
  });

  it("média sobre múltiplos pontos", () => {
    const a: Point[] = [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ];
    const b: Point[] = [
      { x: 3, y: 4 }, // 5
      { x: 0, y: 0 }, // 0
    ];
    expect(meanDelta(a, b)).toBeCloseTo(2.5, 6);
  });

  it("retorna 0 para arrays de tamanhos diferentes ou vazios", () => {
    expect(meanDelta([{ x: 0, y: 0 }], [])).toBe(0);
    expect(meanDelta([], [])).toBe(0);
  });
});

describe("centroidShift", () => {
  it("retorna 0 com menos de 10 pontos", () => {
    const pts: Point[] = Array.from({ length: 5 }, () => ({ x: 0.5, y: 0.5 }));
    expect(centroidShift(pts)).toBe(0);
  });

  it("calcula a magnitude do centroide com >= 10 pontos", () => {
    const pts: Point[] = Array.from({ length: 10 }, () => ({ x: 0.3, y: 0.4 }));
    // centroide = (0.3,0.4) → magnitude = 0.5
    expect(centroidShift(pts)).toBeCloseTo(0.5, 6);
  });
});
