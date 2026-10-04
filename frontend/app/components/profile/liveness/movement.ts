/**
 * Métricas de movimento de landmarks entre frames, usadas como sinal
 * anti-estático (prova de que há uma face viva se movendo).
 */
import type { Point } from "./types";

/** Distância euclidiana média entre dois grupos de landmarks (coords normalizadas). */
export function meanDelta(a: Point[], b: Point[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const dx = a[i].x - b[i].x;
    const dy = a[i].y - b[i].y;
    sum += Math.sqrt(dx * dx + dy * dy);
  }
  return sum / a.length;
}

/** Deslocamento do centroide de um conjunto de pontos (magnitude). */
export function centroidShift(pts: Point[]): number {
  if (pts.length < 10) return 0;
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  return Math.sqrt((sx / pts.length) ** 2 + (sy / pts.length) ** 2);
}
