import { describe, expect, it } from "vitest";
import {
  computeFaceBox,
  evaluatePositioning,
  FACE_WIDTH_MAX,
  FACE_WIDTH_MIN,
  hasEssentialFeatures,
  positioningMessage,
} from "./positioning";
import {
  LANDMARKS_LEFT_EYE,
  LANDMARKS_MOUTH,
  LANDMARKS_NOSE,
  LANDMARKS_RIGHT_EYE,
} from "./landmarks";
import type { Point } from "./types";

describe("computeFaceBox", () => {
  it("retorna null para lista vazia", () => {
    expect(computeFaceBox([])).toBeNull();
  });

  it("calcula centro e dimensões", () => {
    const pts: Point[] = [
      { x: 0.4, y: 0.4 },
      { x: 0.6, y: 0.8 },
    ];
    const box = computeFaceBox(pts)!;
    expect(box.cx).toBeCloseTo(0.5, 6);
    expect(box.cy).toBeCloseTo(0.6, 6);
    expect(box.width).toBeCloseTo(0.2, 6);
    expect(box.height).toBeCloseTo(0.4, 6);
  });
});

/** Gera um conjunto de 468 pontos com traços essenciais bem posicionados. */
function makeValidFace(): Point[] {
  const pts: Point[] = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }));
  const spread = (indices: readonly number[], baseY: number) => {
    indices.forEach((idx, k) => {
      pts[idx] = { x: 0.45 + k * 0.01, y: baseY + k * 0.002 };
    });
  };
  spread(LANDMARKS_LEFT_EYE, 0.4);
  spread(LANDMARKS_RIGHT_EYE, 0.4);
  spread(LANDMARKS_NOSE, 0.55);
  spread(LANDMARKS_MOUTH, 0.68);
  // Amplia a bbox para ~0.4 de largura (distância adequada), usando índices
  // que NÃO pertencem aos grupos essenciais para não quebrar a ordem anatômica.
  pts[200] = { x: 0.3, y: 0.3 };
  pts[201] = { x: 0.7, y: 0.8 };
  return pts;
}

describe("hasEssentialFeatures", () => {
  it("aceita rosto com olhos>nariz>boca e traços dispersos", () => {
    expect(hasEssentialFeatures(makeValidFace())).toBe(true);
  });

  it("rejeita array insuficiente", () => {
    expect(hasEssentialFeatures([{ x: 0.5, y: 0.5 }])).toBe(false);
  });

  it("rejeita quando um grupo está colapsado (oclusão)", () => {
    const pts = makeValidFace();
    // Colapsa a boca num único ponto → oclusão.
    LANDMARKS_MOUTH.forEach((idx) => {
      pts[idx] = { x: 0.5, y: 0.68 };
    });
    expect(hasEssentialFeatures(pts)).toBe(false);
  });

  it("rejeita ordem anatômica invertida (boca acima dos olhos)", () => {
    const pts = makeValidFace();
    LANDMARKS_MOUTH.forEach((idx, k) => {
      pts[idx] = { x: 0.45 + k * 0.01, y: 0.1 + k * 0.002 }; // boca no topo
    });
    expect(hasEssentialFeatures(pts)).toBe(false);
  });
});

describe("evaluatePositioning", () => {
  const goodBox = { cx: 0.5, cy: 0.5, width: 0.4, height: 0.5 };
  const frontalPose = { yaw: 3, pitch: -2 };

  it("aprova quando tudo está ok", () => {
    const r = evaluatePositioning({
      faceCount: 1,
      box: goodBox,
      pose: frontalPose,
      hasFeatures: true,
    });
    expect(r.ready).toBe(true);
    expect(r.reason).toBe("ok");
  });

  it("rejeita quando não há face", () => {
    const r = evaluatePositioning({
      faceCount: 0,
      box: null,
      pose: null,
      hasFeatures: false,
    });
    expect(r.ready).toBe(false);
    expect(r.reason).toBe("no_face");
  });

  it("rejeita múltiplas faces", () => {
    const r = evaluatePositioning({
      faceCount: 2,
      box: goodBox,
      pose: frontalPose,
      hasFeatures: true,
    });
    expect(r.reason).toBe("multiple_faces");
  });

  it("rejeita oclusão", () => {
    const r = evaluatePositioning({
      faceCount: 1,
      box: goodBox,
      pose: frontalPose,
      hasFeatures: false,
    });
    expect(r.reason).toBe("occluded");
  });

  it("detecta rosto muito longe", () => {
    const r = evaluatePositioning({
      faceCount: 1,
      box: { ...goodBox, width: FACE_WIDTH_MIN - 0.05 },
      pose: frontalPose,
      hasFeatures: true,
    });
    expect(r.reason).toBe("too_far");
    expect(r.ready).toBe(false);
  });

  it("detecta rosto muito perto", () => {
    const r = evaluatePositioning({
      faceCount: 1,
      box: { ...goodBox, width: FACE_WIDTH_MAX + 0.05 },
      pose: frontalPose,
      hasFeatures: true,
    });
    expect(r.reason).toBe("too_close");
  });

  it("detecta rosto descentralizado", () => {
    const r = evaluatePositioning({
      faceCount: 1,
      box: { ...goodBox, cx: 0.8 },
      pose: frontalPose,
      hasFeatures: true,
    });
    expect(r.reason).toBe("off_center");
  });

  it("detecta rosto não frontal e ainda calcula nearCenter", () => {
    const r = evaluatePositioning({
      faceCount: 1,
      box: goodBox,
      pose: { yaw: 15, pitch: 0 }, // > frontal(12), < nearCenter(18)
      hasFeatures: true,
    });
    expect(r.reason).toBe("not_frontal");
    expect(r.frontal).toBe(false);
    expect(r.nearCenter).toBe(true);
  });
});

describe("positioningMessage", () => {
  it("mapeia cada motivo para uma mensagem PT-BR", () => {
    expect(positioningMessage("multiple_faces")).toMatch(/rosto/i);
    expect(positioningMessage("too_far")).toMatch(/aproxime/i);
    expect(positioningMessage("too_close")).toMatch(/afaste/i);
    expect(positioningMessage("occluded")).toMatch(/cobert/i);
    expect(positioningMessage("not_frontal")).toMatch(/câmera/i);
  });
});
