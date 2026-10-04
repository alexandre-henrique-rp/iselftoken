/**
 * Catálogo de desafios ativos de prova de vida (Fase 3 — anti-deepfake).
 *
 * Baseado no princípio do DF-CAPTCHA (Frankovits/Mirsky, BGU): pipelines de
 * deepfake em tempo real são treinados para tarefas estreitas (rosto frontal
 * falando). Desafios aleatórios que são triviais para humanos mas fora do
 * "envelope operacional" do deepfake forçam artefatos detectáveis.
 *
 * A detecção por desafio é PURA (recebe pose + blendshapes já lidos), o que a
 * torna testável sem câmera. Blendshapes seguem os nomes ARKit-style do
 * MediaPipe FaceLandmarker (jawOpen, mouthSmileLeft/Right, cheekPuff, ...).
 */
import type { Instruction } from "./types";

export interface ChallengeSignals {
  /** Variação de pose em relação à pose neutra (graus). */
  deltaYaw: number;
  deltaPitch: number;
  /** Contagem de piscadas acumulada. */
  blinkCount: number;
  /** Leitor de blendshape por nome (0..1). */
  blendshape: (name: string) => number;
}

// Limiares de detecção por desafio (documentados para calibração).
export const CHALLENGE_THRESHOLDS = {
  poseDeltaDeg: 8,
  jawOpen: 0.4,
  smile: 0.5,
} as const;

/**
 * Avalia se o desafio `id` foi satisfeito no frame corrente.
 * Função pura — sem efeitos colaterais.
 */
export function isChallengeSatisfied(
  id: Instruction,
  s: ChallengeSignals,
): boolean {
  const T = CHALLENGE_THRESHOLDS;
  switch (id) {
    case "look_up":
      return s.deltaPitch < -T.poseDeltaDeg;
    case "look_down":
      return s.deltaPitch > T.poseDeltaDeg;
    case "look_left":
      return s.deltaYaw > T.poseDeltaDeg;
    case "look_right":
      return s.deltaYaw < -T.poseDeltaDeg;
    case "blink":
      return s.blinkCount >= 2;
    case "open_mouth":
      return s.blendshape("jawOpen") > T.jawOpen;
    case "smile":
      return (
        (s.blendshape("mouthSmileLeft") + s.blendshape("mouthSmileRight")) / 2 >
        T.smile
      );
    default:
      return false;
  }
}

/**
 * Sorteia `count` desafios distintos de um pool. Recebe `rng` injetável para
 * ser determinístico em testes (default: Math.random).
 */
export function pickChallenges(
  pool: readonly Instruction[],
  count: number,
  rng: () => number = Math.random,
): Instruction[] {
  const copy = [...pool];
  const result: Instruction[] = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

/** Pool completo de desafios disponíveis. */
export const CHALLENGE_POOL: readonly Instruction[] = [
  "look_up",
  "look_down",
  "look_left",
  "look_right",
  "blink",
  "open_mouth",
  "smile",
];
