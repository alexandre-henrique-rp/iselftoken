import { describe, expect, it } from "vitest";
import {
  analyzeBandRegions,
  darkBandDepth,
  DARK_BAND_MIN_DROP,
  hasDarkBand,
  rowMeansFromRGBA,
} from "./glasses-detector";

describe("darkBandDepth / hasDarkBand", () => {
  it("faixa escura no meio (armação) → profundidade alta", () => {
    // pele clara em cima/baixo, linha escura no meio (barra da armação).
    const rows = [180, 178, 182, 60, 55, 62, 179, 181, 180];
    const depth = darkBandDepth(rows);
    expect(depth).toBeGreaterThan(DARK_BAND_MIN_DROP);
    expect(hasDarkBand(rows)).toBe(true);
  });

  it("pele uniforme (sem óculos) → sem faixa", () => {
    const rows = [175, 176, 174, 177, 175, 176, 174, 175, 176];
    expect(darkBandDepth(rows)).toBeLessThan(DARK_BAND_MIN_DROP);
    expect(hasDarkBand(rows)).toBe(false);
  });

  it("é invariante a tom de pele (pele escura, mesma queda relativa)", () => {
    // Pele escura (~90) com barra ainda mais escura (~40): queda ~50 > 22.
    const rows = [92, 90, 91, 40, 38, 42, 90, 91, 92];
    expect(hasDarkBand(rows)).toBe(true);
  });

  it("gradiente suave (sombra), sem vale nítido → sem faixa", () => {
    // Queda topo→base pequena e sem VALE central destacado (depth < 14).
    const rows = [150, 147, 144, 141, 139, 141, 144, 147, 150];
    expect(hasDarkBand(rows)).toBe(false);
  });

  it("poucas linhas → 0", () => {
    expect(darkBandDepth([100, 50])).toBe(0);
  });
});

describe("analyzeBandRegions", () => {
  it("1+ região com faixa → óculos (mínimo atual = 1)", () => {
    expect(analyzeBandRegions([true, false, false])).toBe(true);
    expect(analyzeBandRegions([false, true, false])).toBe(true);
    expect(analyzeBandRegions([true, true, false])).toBe(true);
  });

  it("nenhuma região → não", () => {
    expect(analyzeBandRegions([false, false, false])).toBe(false);
  });
});

/** Monta RGBA a partir de linhas de luminância uniformes por linha. */
function rgbaFromRows(rows: number[], w: number): Uint8ClampedArray {
  const h = rows.length;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = rows[y];
      data[i + 3] = 255;
    }
  }
  return data;
}

describe("rowMeansFromRGBA", () => {
  it("recupera a luminância média por linha", () => {
    const rows = [180, 60, 179];
    const means = rowMeansFromRGBA(rgbaFromRows(rows, 5), 5, 3);
    expect(means).toHaveLength(3);
    means.forEach((m, i) => expect(m).toBeCloseTo(rows[i], 0));
  });

  it("integra com hasDarkBand no fluxo completo", () => {
    const rows = [185, 183, 50, 48, 184, 186];
    const means = rowMeansFromRGBA(rgbaFromRows(rows, 8), 8, rows.length);
    expect(hasDarkBand(means)).toBe(true);
  });
});
