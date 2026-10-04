import { describe, expect, it } from "vitest";
import {
  computeFaceQuality,
  GOOD_FACE_BRIGHTNESS_MIN,
  GOOD_FACE_UNIFORMITY_MIN,
} from "./quality";

/** Gera luminância WxH com padrão de xadrez para ter nitidez/contraste altos. */
function checkerboard(w: number, h: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      out.push((x + y) % 2 === 0 ? hi : lo);
    }
  }
  return out;
}

describe("computeFaceQuality", () => {
  it("retorna null para região pequena demais", () => {
    expect(computeFaceQuality([1, 2, 3], 1, 1)).toBeNull();
  });

  it("aprova frame bem iluminado, nítido e uniforme", () => {
    const lum = checkerboard(16, 16, 90, 170); // brilho ~130, alto contraste/nitidez
    const q = computeFaceQuality(lum, 16, 16);
    expect(q).not.toBeNull();
    expect(q!.isGood).toBe(true);
    expect(q!.uniformity).toBeGreaterThanOrEqual(GOOD_FACE_UNIFORMITY_MIN);
  });

  it("reprova frame muito escuro", () => {
    const lum = checkerboard(16, 16, 2, 10); // brilho ~6 < 28
    const q = computeFaceQuality(lum, 16, 16);
    expect(q!.brightness).toBeLessThan(GOOD_FACE_BRIGHTNESS_MIN);
    expect(q!.isGood).toBe(false);
  });

  it("reprova frame liso (baixo contraste/nitidez), independente do brilho", () => {
    const lum = new Array(16 * 16).fill(130); // cinza uniforme
    const q = computeFaceQuality(lum, 16, 16);
    expect(q!.isGood).toBe(false);
    expect(q!.sharpness).toBeCloseTo(0, 6);
  });

  it("detecta iluminação lateral (uniformidade baixa) e reprova", () => {
    // Metade esquerda escura, metade direita clara → sombra lateral.
    const w = 16;
    const h = 16;
    const lum: number[] = [];
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const base = x < w / 2 ? 20 : 200;
        lum.push(base + ((x + y) % 2 === 0 ? 8 : 0)); // um pouco de textura
      }
    }
    const q = computeFaceQuality(lum, w, h);
    expect(q!.uniformity).toBeLessThan(GOOD_FACE_UNIFORMITY_MIN);
    expect(q!.isGood).toBe(false);
  });

  it("é invariante a tom de pele: pele escura bem iluminada e com textura passa", () => {
    // Pele escura porém com contraste relativo e uniformidade adequados.
    const lum = checkerboard(16, 16, 45, 78); // brilho ~61, coef. variação > 0.12
    const q = computeFaceQuality(lum, 16, 16);
    expect(q!.brightness).toBeGreaterThanOrEqual(GOOD_FACE_BRIGHTNESS_MIN);
    expect(q!.isGood).toBe(true);
  });
});
