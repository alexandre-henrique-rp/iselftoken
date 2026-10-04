import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  CheckCircle2,
  Eye,
  Loader2,
  RotateCcw,
  Smile,
  X,
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "~/lib/utils";
import { extractLandmarkGroups } from "./liveness/landmarks";
import { getBlendshape, yawPitchRollFromMatrix } from "./liveness/pose";
import { meanDelta } from "./liveness/movement";
import { drawLivenessDebugOverlay } from "./liveness/debug-overlay";
import {
  computeFaceBox,
  evaluatePositioning,
  hasEssentialFeatures,
  positioningMessage,
  type PositioningReason,
} from "./liveness/positioning";
import {
  CHALLENGE_POOL,
  isChallengeSatisfied,
  pickChallenges,
} from "./liveness/challenges";
import {
  analyzeVideoTrack,
  type InjectionAnalysis,
} from "./liveness/injection-guard";
import {
  GOOD_FACE_BRIGHTNESS_MIN,
  GOOD_FACE_UNIFORMITY_MIN,
  inspectFaceFrame,
} from "./liveness/quality";
import {
  type InstructionDef,
  LivenessErrorPanel,
  LivenessFailedPanel,
  LivenessIntroPanel,
  LivenessReviewMetrics,
} from "./liveness/liveness-panels";
import type {
  FaceQuality,
  Instruction,
  LandmarkFrame,
  LivenessResult,
  MovementSample,
  Point,
} from "./liveness/types";

const INSTRUCTION_POOL: InstructionDef[] = [
  { id: "look_up", label: "Olhe para cima", Icon: ArrowUp },
  { id: "look_down", label: "Olhe para baixo", Icon: ArrowDown },
  { id: "look_left", label: "Olhe para o lado esquerdo", Icon: ArrowLeft },
  { id: "look_right", label: "Olhe para o lado direito", Icon: ArrowRight },
  { id: "blink", label: "Pisque os olhos 2 vezes", Icon: Eye },
  { id: "open_mouth", label: "Abra bem a boca", Icon: Smile },
  { id: "smile", label: "Sorria para a câmera", Icon: Smile },
];

/** Estado inicial de satisfação de todos os desafios do catálogo. */
function emptySatisfied(): Record<Instruction, boolean> {
  return {
    look_up: false,
    look_down: false,
    look_left: false,
    look_right: false,
    blink: false,
    open_mouth: false,
    smile: false,
  };
}

const CENTER_HOLD_MS = 2000;
const MAX_RECORDING_MS = 18_000;
const GLASSES_SAMPLE_INTERVAL_MS = 250;
const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;

const MOVEMENT_HISTORY_MAX = 60;

type Phase =
  | "intro"
  | "loading"
  | "positioning"
  | "countdown"
  | "recording"
  | "review"
  | "failed"
  | "error";

async function createFaceLandmarker(): Promise<any> {
  const { FilesetResolver, FaceLandmarker } =
    await import("@mediapipe/tasks-vision");
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm",
  );
  const options = {
    runningMode: "VIDEO" as const,
    // Detecta até 2 faces para poder rejeitar quando há mais de uma pessoa.
    numFaces: 2,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
  };

  try {
    return await FaceLandmarker.createFromOptions(filesetResolver, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "GPU" },
    });
  } catch {
    return FaceLandmarker.createFromOptions(filesetResolver, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "CPU" },
    });
  }
}

// Re-exporta o tipo do resultado a partir do módulo de tipos, preservando o
// import público usado por profile-documents.tsx.
export type { LivenessResult } from "./liveness/types";

interface LivenessModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (result: LivenessResult) => void;
}

function pickTwoInstructions(): InstructionDef[] {
  // DF-CAPTCHA: sorteia 2 desafios do catálogo ampliado (inclui gestos que
  // quebram deepfakes em tempo real: abrir boca, sorrir, encher bochechas).
  const byId = new Map(INSTRUCTION_POOL.map((d) => [d.id, d]));
  return pickChallenges(CHALLENGE_POOL, 2)
    .map((id) => byId.get(id))
    .filter((d): d is InstructionDef => Boolean(d));
}

function pickMimeType(): string {
  // Prefer MP4 for the best backend compatibility, fall back to WebM otherwise.
  // The stream has no audio track, so avoid opus codec specs.
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const type of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }
  return "";
}

export function LivenessModal({
  open,
  onClose,
  onComplete,
}: LivenessModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const centeredSinceRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number>(0);
  const blinkStateRef = useRef<{ closed: boolean; count: number }>({
    closed: false,
    count: 0,
  });
  const metricsRef = useRef({
    maxYaw: 0,
    maxPitch: 0,
    minYaw: 0,
    minPitch: 0,
  });
  const neutralPoseRef = useRef<{ yaw: number; pitch: number } | null>(null);
  const satisfiedRef = useRef<Record<Instruction, boolean>>(emptySatisfied());
  const recenterSinceRef = useRef<number | null>(null);
  // DF-CAPTCHA: instante em que o desafio corrente começou a ser exigido, e
  // tempos de resposta (ms) por desafio concluído.
  const challengeStartRef = useRef<number | null>(null);
  const challengeResponseMsRef = useRef<{ id: Instruction; ms: number }[]>([]);
  // Fase 4: análise anti-injeção do track de vídeo (heurística de câmera virtual).
  const injectionRef = useRef<InjectionAnalysis | null>(null);
  const instructionsRef = useRef<InstructionDef[]>([]);
  const currentInstructionIdxRef = useRef(0);
  const lastGlassesCheckAtRef = useRef(0);
  const glassesSamplesRef = useRef<boolean[]>([]);
  const glassesRef = useRef<boolean | null>(null);
  const qualityRef = useRef<FaceQuality | null>(null);
  const phaseRef = useRef<Phase>("intro");
  const startRecordingRef = useRef<(() => void) | null>(null);
  // Landmark tracking refs
  const prevLandmarksRef = useRef<LandmarkFrame | null>(null);
  const movementHistoryRef = useRef<MovementSample[]>([]);
  const totalLandmarkMovementRef = useRef(0);
  const avgRelativeMovementRef = useRef(0);
  const landmarkSampleCountRef = useRef(0);
  const completionChecksRef = useRef<{
    qualityIsGood: boolean;
    noGlassesDetected: boolean;
  } | null>(null);
  const debugModeRef = useRef(false);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [phase, setPhase] = useState<Phase>("intro");
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<InstructionDef[]>([]);
  const [currentInstructionIdx, setCurrentInstructionIdx] = useState(0);
  const [centerProgress, setCenterProgress] = useState(0); // 0..1
  const [recenterProgress, setRecenterProgress] = useState(0); // 0..1
  const [reviewUrl, setReviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [hasGlasses, setHasGlasses] = useState<boolean | null>(null);
  const [faceQuality, setFaceQuality] = useState<FaceQuality | null>(null);
  const [positioningReason, setPositioningReason] =
    useState<PositioningReason>("no_face");
  const [debugMode, setDebugMode] = useState(false);

  const currentInstruction = instructions[currentInstructionIdx];

  useEffect(() => {
    instructionsRef.current = instructions;
  }, [instructions]);
  useEffect(() => {
    currentInstructionIdxRef.current = currentInstructionIdx;
  }, [currentInstructionIdx]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    debugModeRef.current = debugMode;
  }, [debugMode]);

  // ---- Cleanup helpers ----
  const stopAll = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {}
    }
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close();
      } catch {}
      landmarkerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    stopAll();
    if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    setReviewUrl(null);
    setResult(null);
    onClose();
  }, [onClose, reviewUrl, stopAll]);

  // ---- Reset state on open, wait for the user's confirmation at "intro" ----
  useEffect(() => {
    if (!open) return;

    setPhase("intro");
    setError(null);
    setCurrentInstructionIdx(0);
    setCenterProgress(0);
    setRecenterProgress(0);
    centeredSinceRef.current = null;
    recenterSinceRef.current = null;
    blinkStateRef.current = { closed: false, count: 0 };
    metricsRef.current = { maxYaw: 0, maxPitch: 0, minYaw: 0, minPitch: 0 };
    neutralPoseRef.current = null;
    satisfiedRef.current = emptySatisfied();
    glassesSamplesRef.current = [];
    glassesRef.current = null;
    qualityRef.current = null;
    lastGlassesCheckAtRef.current = 0;
    setHasGlasses(null);
    setFaceQuality(null);

    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---- Start camera + FaceLandmarker after user confirms at intro ----
  const startFlow = useCallback(async () => {
    setPhase("loading");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      // Fase 4: inspeciona o track para sinais de câmera virtual/injeção.
      injectionRef.current = analyzeVideoTrack(stream.getVideoTracks()[0]);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const landmarker = await createFaceLandmarker();
      landmarkerRef.current = landmarker;

      const selectedInstructions = pickTwoInstructions();
      instructionsRef.current = selectedInstructions;
      setInstructions(selectedInstructions);
      setPhase("positioning");
      scheduleDetection();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Não foi possível acessar a câmera");
      setPhase("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Per-frame detection loop ----
  const scheduleDetection = useCallback(() => {
    const tick = () => {
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = performance.now();
      let detection: any;
      try {
        detection = landmarker.detectForVideo(video, now);
      } catch {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const hasFace = detection?.faceLandmarks?.length > 0;
      const faceCount = detection?.faceLandmarks?.length ?? 0;
      const matrix = detection?.facialTransformationMatrixes?.[0]?.data as
        | number[]
        | undefined;
      const pose = matrix ? yawPitchRollFromMatrix(matrix) : null;

      if (hasFace && pose) {
        const pts = detection.faceLandmarks[0] as { x: number; y: number }[];

        if (now - lastGlassesCheckAtRef.current >= GLASSES_SAMPLE_INTERVAL_MS) {
          lastGlassesCheckAtRef.current = now;
          const quality = inspectFaceFrame(video, canvasRef.current!, pts);
          qualityRef.current = quality;
          setFaceQuality(quality);
          // Óculos NÃO bloqueia mais o fluxo (heurística de pixel confunde com
          // sobrancelha/cílios). Fica como sinal manual do Compliance, que
          // revisa o vídeo. Mantemos apenas o aviso na tela de intro.
        }

        // ---- Landmark tracking ----
        const landmarkGroups = extractLandmarkGroups(pts);
        if (landmarkGroups && phaseRef.current === "recording") {
          const prev = prevLandmarksRef.current;
          if (prev) {
            const eyeDelta =
              (meanDelta(landmarkGroups.left_eye, prev.left_eye) +
                meanDelta(landmarkGroups.right_eye, prev.right_eye)) /
              2;
            const noseDelta = meanDelta(landmarkGroups.nose, prev.nose);
            const mouthDelta = meanDelta(landmarkGroups.mouth, prev.mouth);
            const relMove = eyeDelta + noseDelta + mouthDelta;

            const sample: MovementSample = {
              timestamp: now,
              left_eye: meanDelta(landmarkGroups.left_eye, prev.left_eye),
              right_eye: meanDelta(landmarkGroups.right_eye, prev.right_eye),
              nose: noseDelta,
              mouth: mouthDelta,
              yaw: pose.yaw,
              pitch: pose.pitch,
            };

            movementHistoryRef.current = [
              ...movementHistoryRef.current.slice(-MOVEMENT_HISTORY_MAX + 1),
              sample,
            ];
            totalLandmarkMovementRef.current += relMove;
            landmarkSampleCountRef.current += 1;

            // Relative movement ratio: landmark motion vs head rotation magnitude
            const headRotMag =
              (Math.abs(pose.yaw - (neutralPoseRef.current?.yaw ?? 0)) +
                Math.abs(pose.yaw)) /
              2;
            const relRatio = headRotMag > 3 ? relMove / headRotMag : 0;
            avgRelativeMovementRef.current =
              (avgRelativeMovementRef.current *
                (landmarkSampleCountRef.current - 1) +
                relRatio) /
              landmarkSampleCountRef.current;
          }
          prevLandmarksRef.current = landmarkGroups;
        } else if (landmarkGroups) {
          // During positioning, just keep updating the previous reference
          prevLandmarksRef.current = landmarkGroups;
        }

        // ---- Draw debug overlay ----
        if (debugModeRef.current && landmarkGroups) {
          const overlay = overlayCanvasRef.current;
          const videoEl = videoRef.current;
          if (overlay && videoEl) {
            drawLivenessDebugOverlay(
              overlay,
              videoEl,
              landmarkGroups,
              movementHistoryRef.current,
            );
          }
        }

        const box = computeFaceBox(pts);
        const positioning = evaluatePositioning({
          faceCount,
          box,
          pose,
          hasFeatures: hasEssentialFeatures(pts),
        });
        setPositioningReason(positioning.reason);
        const centered = positioning.centered;
        const frontal = positioning.frontal;
        const nearCenter = positioning.nearCenter;
        const qualityIsGood = qualityRef.current?.isGood === true;
        const noGlassesDetected = true; // óculos não bloqueia (decisão manual)

        setPhase((prev) => {
          if (prev === "positioning") {
            const ready = positioning.ready && qualityIsGood;
            if (ready) {
              if (neutralPoseRef.current == null) {
                neutralPoseRef.current = { yaw: pose.yaw, pitch: pose.pitch };
              }
              if (centeredSinceRef.current == null)
                centeredSinceRef.current = now;
              const elapsed = now - centeredSinceRef.current;
              setCenterProgress(Math.min(1, elapsed / CENTER_HOLD_MS));
              if (elapsed >= CENTER_HOLD_MS) {
                startRecordingRef.current?.();
                return "recording";
              }
            } else {
              centeredSinceRef.current = null;
              setCenterProgress(0);
              neutralPoseRef.current = null;
            }
            return prev;
          }

          if (prev === "recording") {
            if (!qualityIsGood) return prev;

            metricsRef.current.maxYaw = Math.max(
              metricsRef.current.maxYaw,
              pose.yaw,
            );
            metricsRef.current.minYaw = Math.min(
              metricsRef.current.minYaw,
              pose.yaw,
            );
            metricsRef.current.maxPitch = Math.max(
              metricsRef.current.maxPitch,
              pose.pitch,
            );
            metricsRef.current.minPitch = Math.min(
              metricsRef.current.minPitch,
              pose.pitch,
            );

            const neutral = neutralPoseRef.current ?? { yaw: 0, pitch: 0 };
            const deltaYaw = pose.yaw - neutral.yaw;
            const deltaPitch = pose.pitch - neutral.pitch;
            const bl = getBlendshape(detection.faceBlendshapes, "eyeBlinkLeft");
            const br = getBlendshape(
              detection.faceBlendshapes,
              "eyeBlinkRight",
            );
            const eyesClosed = (bl + br) / 2 > 0.28;
            if (eyesClosed && !blinkStateRef.current.closed) {
              blinkStateRef.current.closed = true;
            } else if (!eyesClosed && blinkStateRef.current.closed) {
              blinkStateRef.current.closed = false;
              blinkStateRef.current.count += 1;
            }

            const curIdx = currentInstructionIdxRef.current;
            const curId = instructionsRef.current[curIdx]?.id;
            if (curId && !satisfiedRef.current[curId]) {
              const satisfied = isChallengeSatisfied(curId, {
                deltaYaw,
                deltaPitch,
                blinkCount: blinkStateRef.current.count,
                blendshape: (name) =>
                  getBlendshape(detection.faceBlendshapes, name),
              });
              if (satisfied) {
                satisfiedRef.current[curId] = true;
                // Registra o tempo de resposta do desafio (DF-CAPTCHA: tempo).
                const startedAt = challengeStartRef.current;
                if (startedAt != null) {
                  challengeResponseMsRef.current = [
                    ...challengeResponseMsRef.current,
                    { id: curId, ms: Math.round(now - startedAt) },
                  ];
                }
              }
            }

            const isSatisfied = curId ? satisfiedRef.current[curId] : false;
            if (isSatisfied) {
              if (nearCenter) {
                if (recenterSinceRef.current == null)
                  recenterSinceRef.current = now;
                const elapsed = now - recenterSinceRef.current;
                setRecenterProgress(Math.min(1, elapsed / CENTER_HOLD_MS));
                if (elapsed >= CENTER_HOLD_MS) {
                  recenterSinceRef.current = null;
                  setRecenterProgress(0);
                  const total = instructionsRef.current.length;
                  if (curIdx < total - 1) {
                    currentInstructionIdxRef.current = curIdx + 1;
                    setCurrentInstructionIdx(curIdx + 1);
                    // Novo desafio começa a contar tempo a partir de agora.
                    challengeStartRef.current = now;
                  } else if (recorderRef.current?.state === "recording") {
                    // Congela as condições aprovadas no frame que encerra as
                    // instruções; leituras posteriores não podem invalidar uma
                    // prova já concluída durante o callback do recorder.
                    completionChecksRef.current = {
                      qualityIsGood,
                      noGlassesDetected,
                    };
                    recorderRef.current.stop();
                  }
                }
              } else {
                recenterSinceRef.current = null;
                setRecenterProgress(0);
              }
            }
          }
          return prev;
        });
      } else if (phaseRef.current === "positioning") {
        centeredSinceRef.current = null;
        neutralPoseRef.current = null;
        setCenterProgress(0);
        qualityRef.current = null;
        setFaceQuality(null);
        glassesSamplesRef.current = [];
        glassesRef.current = null;
        setHasGlasses(null);
        setPositioningReason("no_face");
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ---- Start recording ----
  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 500_000,
      });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const mime = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        // Release the live camera so the review player owns playback cleanly
        if (videoRef.current) {
          try {
            videoRef.current.pause();
          } catch {}
          videoRef.current.srcObject = null;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        const yawAmp = Math.max(
          Math.abs(metricsRef.current.maxYaw),
          Math.abs(metricsRef.current.minYaw),
        );
        const pitchAmp = Math.max(
          Math.abs(metricsRef.current.maxPitch),
          Math.abs(metricsRef.current.minPitch),
        );
        const instructions = instructionsRef.current.map((instruction) => ({
          id: instruction.id,
          satisfied: satisfiedRef.current[instruction.id],
        }));
        const completionChecks = completionChecksRef.current ?? {
          qualityIsGood: qualityRef.current?.isGood === true,
          noGlassesDetected: glassesRef.current === false,
        };
        const hasDirectionalProof = instructions.some(
          (instruction) => instruction.satisfied && instruction.id !== "blink",
        );
        const hasEnoughLandmarkMotion =
          hasDirectionalProof ||
          totalLandmarkMovementRef.current >
            Math.max(
              0.1,
              (performance.now() - recordingStartRef.current) * 0.0003,
            );
        const rejectionReasons: string[] = [];

        if (blob.size > MAX_VIDEO_UPLOAD_BYTES) {
          rejectionReasons.push("O vídeo excedeu o tamanho máximo permitido.");
        }
        if (
          instructions.length !== 2 ||
          !instructions.every((i) => i.satisfied)
        ) {
          rejectionReasons.push(
            "As instruções de prova de vida não foram concluídas.",
          );
        }
        if (!completionChecks.qualityIsGood) {
          rejectionReasons.push(
            "A qualidade da imagem ficou insuficiente ao finalizar a prova.",
          );
        }
        if (!hasEnoughLandmarkMotion) {
          rejectionReasons.push(
            "O movimento facial ficou abaixo do mínimo de segurança.",
          );
        }

        const r: LivenessResult = {
          videoBlob: blob,
          mimeType: mime,
          durationMs: performance.now() - recordingStartRef.current,
          instructions,
          blinkCount: blinkStateRef.current.count,
          hasGlasses: glassesRef.current,
          maxYawDeg: yawAmp,
          maxPitchDeg: pitchAmp,
          landmarkMovementScore: totalLandmarkMovementRef.current,
          avgRelativeMovement: avgRelativeMovementRef.current,
          challengeResponseMs: challengeResponseMsRef.current,
          injectionSuspicious: injectionRef.current?.suspicious ?? false,
          injectionReasons: injectionRef.current?.reasons ?? [],
          rejectionReasons,
        };
        setResult(r);
        if (rejectionReasons.length === 0) {
          setReviewUrl(url);
          setPhase("review");
        } else {
          // Discard the recording — user must redo everything.
          URL.revokeObjectURL(url);
          setReviewUrl(null);
          setPhase("failed");
        }
      };
      recordingStartRef.current = performance.now();
      recorder.start(1000);
      recorderRef.current = recorder;
      currentInstructionIdxRef.current = 0;
      setCurrentInstructionIdx(0);
      // Primeiro desafio começa a contar tempo de resposta a partir de agora.
      challengeStartRef.current = performance.now();
      challengeResponseMsRef.current = [];
    } catch (err: any) {
      console.error(err);
      setError("Não foi possível iniciar a gravação");
      setPhase("error");
    }
  }, []);

  startRecordingRef.current = startRecording;

  // Reset re-center progress whenever the current instruction changes
  useEffect(() => {
    recenterSinceRef.current = null;
    setRecenterProgress(0);
  }, [currentInstructionIdx, phase]);

  // Hard stop safety — guarantees the recorder stops even if detection stalls
  useEffect(() => {
    if (phase !== "recording") return;
    const maxTimer = setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state === "recording") {
        recorderRef.current.stop();
      }
    }, MAX_RECORDING_MS);
    return () => clearTimeout(maxTimer);
  }, [phase]);

  const handleRetry = useCallback(() => {
    stopAll();
    if (reviewUrl) URL.revokeObjectURL(reviewUrl);
    setReviewUrl(null);
    setResult(null);
    // Trigger re-init by toggling open effect
    setPhase("loading");
    // Re-run the open effect via forcing a remount would be cleaner; here we just re-init inline:
    setTimeout(() => {
      // re-invoke init effect by setting open false/true externally isn't possible here.
      // Instead we manually re-run init code:
      reinit();
    }, 50);
  }, [reviewUrl, stopAll]);

  const reinit = useCallback(async () => {
    try {
      setError(null);
      setCurrentInstructionIdx(0);
      setCenterProgress(0);
      centeredSinceRef.current = null;
      blinkStateRef.current = { closed: false, count: 0 };
      metricsRef.current = { maxYaw: 0, maxPitch: 0, minYaw: 0, minPitch: 0 };
      neutralPoseRef.current = null;
      satisfiedRef.current = emptySatisfied();
      glassesSamplesRef.current = [];
      glassesRef.current = null;
      qualityRef.current = null;
      completionChecksRef.current = null;
      lastGlassesCheckAtRef.current = 0;
      prevLandmarksRef.current = null;
      movementHistoryRef.current = [];
      totalLandmarkMovementRef.current = 0;
      avgRelativeMovementRef.current = 0;
      landmarkSampleCountRef.current = 0;
      setHasGlasses(null);
      setFaceQuality(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      streamRef.current = stream;
      // Fase 4: inspeciona o track para sinais de câmera virtual/injeção.
      injectionRef.current = analyzeVideoTrack(stream.getVideoTracks()[0]);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const landmarker = await createFaceLandmarker();
      landmarkerRef.current = landmarker;
      const selectedInstructions = pickTwoInstructions();
      instructionsRef.current = selectedInstructions;
      setInstructions(selectedInstructions);
      setPhase("positioning");
      scheduleDetection();
    } catch (err: any) {
      setError(err?.message || "Erro ao reiniciar");
      setPhase("error");
    }
  }, [scheduleDetection]);

  const handleConfirm = useCallback(() => {
    if (result) {
      onComplete(result);
      handleClose();
    }
  }, [handleClose, onComplete, result]);

  const allSatisfied = useMemo(
    () => result?.rejectionReasons.length === 0,
    [result],
  );

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">
              Biometria Facial
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {(phase === "recording" || phase === "positioning") && (
              <button
                onClick={() => setDebugMode((d) => !d)}
                className={cn(
                  "w-9 h-9 rounded-xl border flex items-center justify-center text-[10px] font-mono transition",
                  debugMode
                    ? "bg-primary/20 border-primary/40 text-primary"
                    : "bg-white/5 border-white/5 text-slate-500 hover:text-white",
                )}
                title="Toggle landmark debug overlay"
              >
                L
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white transition"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {phase === "error" ? (
            <LivenessErrorPanel error={error} onClose={handleClose} />
          ) : phase === "failed" ? (
            <LivenessFailedPanel
              result={result}
              pool={INSTRUCTION_POOL}
              onCancel={handleClose}
              onRetry={handleRetry}
            />
          ) : phase === "intro" ? (
            <LivenessIntroPanel onCancel={handleClose} onStart={startFlow} />
          ) : (
            <>
              {/* Video area */}
              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-black border border-white/5">
                {phase !== "review" ? (
                  <video
                    key="live"
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                ) : reviewUrl ? (
                  <video
                    key="review"
                    ref={reviewVideoRef}
                    src={reviewUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : null}

                {/* Debug overlay canvas for landmark tracking */}
                {debugMode &&
                  (phase === "recording" || phase === "positioning") && (
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      // A câmera frontal é espelhada para a prévia. Espelhar
                      // apenas o canvas alinha os landmarks sem alterar os
                      // valores originais usados no cálculo de pose.
                      style={{ zIndex: 10, transform: "scaleX(-1)" }}
                    />
                  )}

                {/* Centering guide */}
                {phase === "positioning" && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        className={cn(
                          "w-[60%] aspect-3/4 border-2 rounded-[45%] transition-all",
                          centerProgress > 0
                            ? "border-primary"
                            : "border-white/30",
                        )}
                        style={{
                          boxShadow: `0 0 0 9999px rgba(0,0,0,${0.55 - centerProgress * 0.25})`,
                        }}
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-linear-to-t from-black/80 to-transparent">
                      <p
                        className="text-center text-white text-xs uppercase tracking-widest font-bold"
                        aria-live="polite"
                      >
                        {positioningReason === "multiple_faces" ||
                        positioningReason === "occluded" ||
                        positioningReason === "too_far" ||
                        positioningReason === "too_close"
                          ? positioningMessage(positioningReason)
                          : faceQuality && !faceQuality.isGood
                            ? faceQuality.uniformity < GOOD_FACE_UNIFORMITY_MIN
                              ? "Iluminação irregular — evite luz lateral/sombra no rosto"
                              : faceQuality.brightness < GOOD_FACE_BRIGHTNESS_MIN
                                ? "Ambiente escuro — aumente a iluminação"
                                : "Aproxime-se e mantenha o rosto nítido"
                            : positioningMessage(positioningReason)}
                      </p>
                      <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${centerProgress * 100}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Loading overlay */}
                {phase === "loading" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="text-[11px] uppercase tracking-widest text-slate-400">
                      Carregando câmera e modelos...
                    </span>
                  </div>
                )}

                {/* Recording overlay */}
                {phase === "recording" &&
                  currentInstruction &&
                  (() => {
                    const curId = currentInstruction.id;
                    const satisfiedCur = satisfiedRef.current[curId];
                    return (
                      <>
                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-full px-3 py-1">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-[10px] uppercase font-black tracking-widest text-red-300">
                            Rec
                          </span>
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-5 bg-linear-to-t from-black/90 to-transparent">
                          <div className="flex items-center justify-center gap-3 text-white">
                            {satisfiedCur ? (
                              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            ) : (
                              <currentInstruction.Icon className="w-8 h-8 text-primary animate-pulse" />
                            )}
                            <span className="text-xl font-black uppercase tracking-wider">
                              {satisfiedCur
                                ? "Volte ao centro"
                                : currentInstruction.label}
                            </span>
                          </div>
                          {satisfiedCur && (
                            <div className="mt-3 mx-auto h-1 w-56 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 transition-all"
                                style={{ width: `${recenterProgress * 100}%` }}
                              />
                            </div>
                          )}
                          <div className="mt-3 flex justify-center gap-2">
                            {instructions.map((_, i) => (
                              <div
                                key={i}
                                className={cn(
                                  "h-1 w-12 rounded-full",
                                  i < currentInstructionIdx
                                    ? "bg-emerald-400"
                                    : i === currentInstructionIdx
                                      ? "bg-primary"
                                      : "bg-white/15",
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
              </div>

              {/* Review metrics */}
              {phase === "review" && result && (
                <LivenessReviewMetrics result={result} pool={INSTRUCTION_POOL} />
              )}

              {/* Actions */}
              {phase === "review" && (
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleRetry}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] uppercase font-black tracking-widest hover:bg-white/10 flex items-center justify-center gap-2 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Refazer
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!allSatisfied}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[11px] uppercase font-black tracking-widest flex items-center justify-center gap-2 transition",
                      allSatisfied
                        ? "bg-primary text-white hover:bg-primary/90"
                        : "bg-white/5 text-slate-500 cursor-not-allowed",
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Usar este vídeo
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden canvas for heuristics */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>,
    document.body,
  );
}
