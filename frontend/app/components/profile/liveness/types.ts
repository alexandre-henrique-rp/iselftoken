/**
 * Tipos compartilhados do fluxo de liveness (prova de vida biométrica).
 *
 * Fase 0 do planejamento (docs/planejamento-liveness-biometria-2026.md):
 * extração de tipos e lógica pura para módulos testáveis, sem mudar comportamento.
 */

export type Instruction =
  | "look_up"
  | "look_down"
  | "look_left"
  | "look_right"
  | "blink"
  | "open_mouth"
  | "smile";

export interface Point {
  x: number;
  y: number;
}

export type LandmarkGroupId = "left_eye" | "right_eye" | "nose" | "mouth";

export interface LandmarkFrame {
  left_eye: Point[];
  right_eye: Point[];
  nose: Point[];
  mouth: Point[];
}

export interface MovementSample {
  timestamp: number;
  left_eye: number;
  right_eye: number;
  nose: number;
  mouth: number;
  yaw: number;
  pitch: number;
}

export interface FaceQuality {
  brightness: number;
  contrast: number;
  sharpness: number;
  /** Uniformidade da iluminação (0..1). 1 = luz homogênea, 0 = sombra lateral forte. */
  uniformity: number;
  isGood: boolean;
}

export interface LivenessResult {
  videoBlob: Blob;
  mimeType: string;
  durationMs: number;
  instructions: { id: Instruction; satisfied: boolean }[];
  blinkCount: number;
  hasGlasses: boolean | null;
  maxYawDeg: number;
  maxPitchDeg: number;
  landmarkMovementScore: number;
  avgRelativeMovement: number;
  /** Tempo de resposta (ms) por desafio concluído — sinal DF-CAPTCHA de "tempo". */
  challengeResponseMs?: { id: Instruction; ms: number }[];
  /** Sinais anti-injeção (câmera virtual). Auditoria — não bloqueia no MVP. */
  injectionSuspicious?: boolean;
  injectionReasons?: string[];
  rejectionReasons: string[];
}
