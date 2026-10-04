/**
 * Detecção de injeção de vídeo / câmera virtual (Fase 4 — anti-IA).
 *
 * Injeção de vídeo (virtual camera) bypassa a câmera física e injeta um stream
 * sintético. No browser não há acesso a IMU/profundidade confiável, mas dá para
 * inspecionar os metadados do MediaStreamTrack: câmeras virtuais costumam ter
 * label reveladora (OBS, "virtual", "cam" de software), framerate perfeitamente
 * inteiro/alto, ou faltar deviceId/capabilities reais.
 *
 * IMPORTANTE (MVP fintech): estes sinais são HEURÍSTICOS e servem para
 * auditoria do Compliance — NÃO bloqueiam o usuário automaticamente, para não
 * gerar falsos positivos (ex.: drivers de câmera legítimos com nomes atípicos).
 *
 * A análise é PURA (recebe settings/capabilities/label já extraídos), testável
 * sem `navigator.mediaDevices`.
 */

export type InjectionSignalReason =
  | "virtual_label"
  | "missing_device_id"
  | "suspicious_framerate";

export interface InjectionAnalysisInput {
  label?: string | null;
  deviceId?: string | null;
  frameRate?: number | null;
}

export interface InjectionAnalysis {
  /** Suspeita de câmera virtual/injeção. */
  suspicious: boolean;
  reasons: InjectionSignalReason[];
  /** Label normalizada (minúscula) — útil para telemetria/auditoria. */
  normalizedLabel: string | null;
}

// Palavras que aparecem em labels de câmeras virtuais/softwares de captura.
const VIRTUAL_LABEL_PATTERNS = [
  "obs",
  "virtual",
  "manycam",
  "xsplit",
  "snap camera",
  "snapcamera",
  "droidcam",
  "ndi",
  "vcam",
  "avatarify",
  "e2esoft",
  "splitcam",
];

/** Núcleo puro de análise de injeção. */
export function analyzeInjection(
  input: InjectionAnalysisInput,
): InjectionAnalysis {
  const reasons: InjectionSignalReason[] = [];
  const normalizedLabel = input.label
    ? input.label.trim().toLowerCase()
    : null;

  if (
    normalizedLabel &&
    VIRTUAL_LABEL_PATTERNS.some((p) => normalizedLabel.includes(p))
  ) {
    reasons.push("virtual_label");
  }

  // Câmera física real quase sempre expõe um deviceId após permissão concedida.
  if (input.deviceId === "" || input.deviceId === null) {
    reasons.push("missing_device_id");
  }

  // Framerate perfeitamente inteiro e alto (>= 60) é atípico para webcams
  // comuns e comum em pipelines sintéticos. Sinal fraco (só levanta suspeita
  // quando somado a outro).
  if (
    typeof input.frameRate === "number" &&
    input.frameRate >= 60 &&
    Number.isInteger(input.frameRate)
  ) {
    reasons.push("suspicious_framerate");
  }

  // Regra de decisão conservadora: label virtual é forte por si só; os demais
  // sinais só marcam suspeita quando combinados (evita falso positivo).
  const suspicious =
    reasons.includes("virtual_label") ||
    reasons.filter((r) => r !== "virtual_label").length >= 2;

  return { suspicious, reasons, normalizedLabel };
}

/**
 * Extrai a análise de um MediaStreamTrack real. Depende da Web API (não testado
 * diretamente; a lógica está coberta por `analyzeInjection`).
 */
export function analyzeVideoTrack(
  track: MediaStreamTrack | null | undefined,
): InjectionAnalysis {
  if (!track) {
    return { suspicious: false, reasons: [], normalizedLabel: null };
  }
  const settings =
    typeof track.getSettings === "function" ? track.getSettings() : {};
  return analyzeInjection({
    label: track.label ?? null,
    deviceId: (settings as MediaTrackSettings).deviceId ?? null,
    frameRate: (settings as MediaTrackSettings).frameRate ?? null,
  });
}
