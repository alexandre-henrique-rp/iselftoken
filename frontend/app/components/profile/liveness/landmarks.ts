/**
 * Constantes de índices de landmarks do MediaPipe FaceLandmarker (478 pontos)
 * e utilitário de extração dos grupos usados no rastreamento de movimento.
 */
import type { LandmarkFrame, Point } from "./types";

// Left eye: upper/lower lid + corners
export const LANDMARKS_LEFT_EYE = [159, 145, 153, 160, 144, 133] as const;
// Right eye: upper/lower lid + corners
export const LANDMARKS_RIGHT_EYE = [386, 374, 373, 385, 380, 362] as const;
// Nose: tip, bridge, base, left/right ala
export const LANDMARKS_NOSE = [1, 6, 2, 98, 327] as const;
// Mouth: upper lip, lower lip, corners, center top/bottom
export const LANDMARKS_MOUTH = [13, 14, 61, 291, 0, 17] as const;

// Âncoras para detecção geométrica de óculos (mapa canônico do FaceMesh):
// sobrancelhas (linha superior da armação passa logo abaixo) e ponte do nariz
// (barra central da armação). Usados para amostrar exatamente onde a armação
// aparece, em vez de recortar retângulos genéricos.
export const LANDMARK_BROW_LEFT = 105; // sobrancelha esquerda (centro)
export const LANDMARK_BROW_RIGHT = 334; // sobrancelha direita (centro)
export const LANDMARK_EYE_LEFT_CENTER = 159; // pálpebra superior esq.
export const LANDMARK_EYE_RIGHT_CENTER = 386; // pálpebra superior dir.
export const LANDMARK_NOSE_BRIDGE_TOP = 168; // topo da ponte do nariz
export const LANDMARK_BETWEEN_EYES = 6; // entre os olhos (glabela)

export const ALL_LANDMARK_GROUPS = [
  {
    id: "left_eye" as const,
    indices: [...LANDMARKS_LEFT_EYE],
    color: "#22d3ee",
  },
  {
    id: "right_eye" as const,
    indices: [...LANDMARKS_RIGHT_EYE],
    color: "#22d3ee",
  },
  { id: "nose" as const, indices: [...LANDMARKS_NOSE], color: "#facc15" },
  { id: "mouth" as const, indices: [...LANDMARKS_MOUTH], color: "#f472b6" },
];

/**
 * Extrai os grupos de landmarks (olhos/nariz/boca) do array de 478 pontos.
 * Retorna null se o array não tiver a densidade mínima esperada.
 */
export function extractLandmarkGroups(
  allPoints: Point[],
): LandmarkFrame | null {
  if (allPoints.length < 468) return null;
  const pick = (indices: readonly number[]) =>
    indices.map((i) => allPoints[i] ?? { x: 0, y: 0 });
  return {
    left_eye: pick(LANDMARKS_LEFT_EYE),
    right_eye: pick(LANDMARKS_RIGHT_EYE),
    nose: pick(LANDMARKS_NOSE),
    mouth: pick(LANDMARKS_MOUTH),
  };
}
