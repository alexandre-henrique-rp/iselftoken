/**
 * Avaliação de posicionamento facial (Fase 1 do planejamento).
 *
 * Funções puras e testáveis que decidem se o rosto está pronto para iniciar a
 * gravação: enquadramento (centro), distância (via bbox), frontalidade (pose),
 * presença de uma única face e ausência de oclusão dos traços essenciais.
 *
 * Todas operam sobre coordenadas normalizadas (0..1) do MediaPipe FaceLandmarker.
 */
import {
  LANDMARKS_LEFT_EYE,
  LANDMARKS_MOUTH,
  LANDMARKS_NOSE,
  LANDMARKS_RIGHT_EYE,
} from "./landmarks";
import type { Point } from "./types";

export interface FaceBox {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export type PositioningReason =
  | "ok"
  | "no_face"
  | "multiple_faces"
  | "too_far"
  | "too_close"
  | "off_center"
  | "not_frontal"
  | "occluded";

export interface PositioningResult {
  ready: boolean;
  reason: PositioningReason;
  centered: boolean;
  frontal: boolean;
  /** Frontalidade relaxada para o "voltar ao centro" durante a gravação. */
  nearCenter: boolean;
  distanceOk: boolean;
}

// Limiares de enquadramento (coordenadas normalizadas).
export const CENTER_TOLERANCE_X = 0.12;
export const CENTER_TOLERANCE_Y = 0.15;
// Distância: largura do rosto como fração do frame.
export const FACE_WIDTH_MIN = 0.2; // < isso → muito longe
export const FACE_WIDTH_MAX = 0.75; // > isso → muito perto
// Pose (graus).
export const FRONTAL_YAW_MAX = 12;
export const FRONTAL_PITCH_MAX = 12;
export const NEAR_CENTER_YAW_MAX = 18;
export const NEAR_CENTER_PITCH_MAX = 18;

/** Calcula a bounding box (centro + dimensões) do rosto a partir dos pontos. */
export function computeFaceBox(points: Point[]): FaceBox | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    sumX += p.x;
    sumY += p.y;
  }
  return {
    cx: sumX / points.length,
    cy: sumY / points.length,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Verifica se os traços essenciais (2 olhos, nariz, boca) estão presentes e em
 * posições plausíveis. Detecta oclusão grosseira (mão/máscara/boné) por
 * landmarks colapsados ou fora da ordem anatômica esperada.
 */
export function hasEssentialFeatures(points: Point[]): boolean {
  if (points.length < 468) return false;
  const at = (i: number): Point | null => points[i] ?? null;

  const groups = [
    LANDMARKS_LEFT_EYE,
    LANDMARKS_RIGHT_EYE,
    LANDMARKS_NOSE,
    LANDMARKS_MOUTH,
  ];
  for (const g of groups) {
    // Todos os pontos do grupo precisam existir e ter alguma dispersão
    // (landmarks colapsados num ponto indicam perda de rastreamento/oclusão).
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const idx of g) {
      const p = at(idx);
      if (!p) return false;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    if (maxX - minX < 1e-4 && maxY - minY < 1e-4) return false;
  }

  // Ordem anatômica vertical básica: olhos acima do nariz, nariz acima da boca.
  const eyeY =
    (points[LANDMARKS_LEFT_EYE[0]].y + points[LANDMARKS_RIGHT_EYE[0]].y) / 2;
  const noseY = points[LANDMARKS_NOSE[0]].y;
  const mouthY = points[LANDMARKS_MOUTH[0]].y;
  return eyeY < noseY && noseY < mouthY;
}

/**
 * Decisão pura de posicionamento. `faceCount` vem do detector (numFaces>1),
 * `box` e `pose` do frame corrente.
 */
export function evaluatePositioning(params: {
  faceCount: number;
  box: FaceBox | null;
  pose: { yaw: number; pitch: number } | null;
  hasFeatures: boolean;
}): PositioningResult {
  const { faceCount, box, pose, hasFeatures } = params;

  const notReady = (reason: PositioningReason): PositioningResult => ({
    ready: false,
    reason,
    centered: false,
    frontal: false,
    nearCenter: false,
    distanceOk: false,
  });

  if (faceCount === 0 || !box || !pose) return notReady("no_face");
  if (faceCount > 1) return notReady("multiple_faces");
  if (!hasFeatures) return notReady("occluded");

  const distanceOk =
    box.width >= FACE_WIDTH_MIN && box.width <= FACE_WIDTH_MAX;
  const centered =
    Math.abs(box.cx - 0.5) < CENTER_TOLERANCE_X &&
    Math.abs(box.cy - 0.5) < CENTER_TOLERANCE_Y;
  const frontal =
    Math.abs(pose.yaw) < FRONTAL_YAW_MAX &&
    Math.abs(pose.pitch) < FRONTAL_PITCH_MAX;
  const nearCenter =
    Math.abs(pose.yaw) < NEAR_CENTER_YAW_MAX &&
    Math.abs(pose.pitch) < NEAR_CENTER_PITCH_MAX;

  let reason: PositioningReason = "ok";
  if (!distanceOk) {
    reason = box.width < FACE_WIDTH_MIN ? "too_far" : "too_close";
  } else if (!centered) {
    reason = "off_center";
  } else if (!frontal) {
    reason = "not_frontal";
  }

  return {
    ready: distanceOk && centered && frontal,
    reason,
    centered,
    frontal,
    nearCenter,
    distanceOk,
  };
}

/** Mensagem de feedback (PT-BR) para cada motivo de posicionamento. */
export function positioningMessage(reason: PositioningReason): string {
  switch (reason) {
    case "multiple_faces":
      return "Mais de um rosto detectado — fique sozinho no enquadramento";
    case "too_far":
      return "Aproxime-se da câmera";
    case "too_close":
      return "Afaste-se um pouco da câmera";
    case "off_center":
      return "Posicione o rosto no centro";
    case "not_frontal":
      return "Olhe diretamente para a câmera";
    case "occluded":
      return "Rosto parcialmente coberto — remova máscara, mão ou boné";
    case "no_face":
      return "Posicione o rosto no centro";
    case "ok":
    default:
      return "Posicione o rosto no centro";
  }
}
