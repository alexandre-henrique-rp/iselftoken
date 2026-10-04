import { describe, expect, it } from "vitest";
import { getBlendshape, yawPitchRollFromMatrix } from "./pose";

// Matriz identidade (coluna-major 4x4) → sem rotação.
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

describe("yawPitchRollFromMatrix", () => {
  it("retorna 0/0/0 para a matriz identidade", () => {
    const { yaw, pitch, roll } = yawPitchRollFromMatrix(IDENTITY);
    expect(yaw).toBeCloseTo(0, 5);
    expect(pitch).toBeCloseTo(0, 5);
    expect(roll).toBeCloseTo(0, 5);
  });

  it("detecta yaw positivo (cabeça girada) via r20 negativo", () => {
    // r20 = m[2]. Um valor negativo em r20 gera yaw > 0.
    const m = [...IDENTITY];
    m[2] = -0.5; // sin(yaw)≈0.5
    m[0] = Math.cos(Math.asin(0.5));
    const { yaw } = yawPitchRollFromMatrix(m);
    expect(yaw).toBeGreaterThan(0);
  });

  it("detecta roll a partir de r10", () => {
    const m = [...IDENTITY];
    m[1] = 0.7071; // r10
    m[0] = 0.7071; // r00 → atan2(0.7071,0.7071) = 45°
    const { roll } = yawPitchRollFromMatrix(m);
    expect(roll).toBeCloseTo(45, 0);
  });

  it("é resiliente a matriz com zeros (não lança)", () => {
    expect(() => yawPitchRollFromMatrix(new Array(16).fill(0))).not.toThrow();
  });
});

describe("getBlendshape", () => {
  const shapes = [
    {
      categories: [
        { categoryName: "eyeBlinkLeft", score: 0.42 },
        { categoryName: "eyeBlinkRight", score: 0.31 },
      ],
    },
  ];

  it("retorna o score do blendshape existente", () => {
    expect(getBlendshape(shapes, "eyeBlinkLeft")).toBe(0.42);
    expect(getBlendshape(shapes, "eyeBlinkRight")).toBe(0.31);
  });

  it("retorna 0 para blendshape ausente", () => {
    expect(getBlendshape(shapes, "jawOpen")).toBe(0);
  });

  it("retorna 0 para entrada vazia/nula", () => {
    expect(getBlendshape(null, "eyeBlinkLeft")).toBe(0);
    expect(getBlendshape([], "eyeBlinkLeft")).toBe(0);
    expect(getBlendshape([{}], "eyeBlinkLeft")).toBe(0);
  });
});
