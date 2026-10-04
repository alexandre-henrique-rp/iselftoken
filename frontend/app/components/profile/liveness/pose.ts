/**
 * Cálculo de pose da cabeça (yaw/pitch/roll) e leitura de blendshapes,
 * a partir da saída do MediaPipe FaceLandmarker.
 */

/**
 * Decompõe a matriz de rotação (coluna-major, 4x4) em yaw/pitch/roll (graus).
 *
 * O FaceLandmarker entrega uma matriz coluna-major. Estes eixos preservam a
 * semântica usada nas instruções: yaw = esquerda/direita, pitch = cima/baixo
 * e roll = inclinação lateral.
 */
export function yawPitchRollFromMatrix(m: number[]): {
  yaw: number;
  pitch: number;
  roll: number;
} {
  // Column-major: m[col*4 + row]
  const r00 = m[0];
  const r10 = m[1];
  const r20 = m[2];
  const r21 = m[6];
  const r22 = m[10];
  const yaw = Math.atan2(-r20, Math.sqrt(r00 * r00 + r10 * r10));
  const pitch = Math.atan2(r21, r22);
  const roll = Math.atan2(r10, r00);
  const toDeg = (r: number) => (r * 180) / Math.PI;
  return { yaw: toDeg(yaw), pitch: toDeg(pitch), roll: toDeg(roll) };
}

/**
 * Lê o score (0..1) de um blendshape específico da saída do FaceLandmarker.
 * Retorna 0 quando ausente.
 */
export function getBlendshape(blendshapes: any, name: string): number {
  if (!blendshapes?.[0]?.categories) return 0;
  const entry = blendshapes[0].categories.find(
    (c: any) => c.categoryName === name,
  );
  return entry?.score ?? 0;
}
