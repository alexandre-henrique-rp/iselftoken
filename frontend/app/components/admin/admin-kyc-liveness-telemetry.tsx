import { Activity, Eye, Glasses, ScanFace, ShieldAlert } from "lucide-react";

export interface LivenessTelemetry {
  publicId: string;
  passed: boolean;
  blinkCount: number;
  hasGlasses: boolean | null;
  maxYawDeg: number;
  maxPitchDeg: number;
  landmarkMovement: number;
  avgRelativeMovement: number;
  durationMs: number;
  mimeType: string | null;
  instructions: { id: string; satisfied: boolean }[] | null;
  challengeResponseMs?: { id: string; ms: number }[] | null;
  rejectionReasons: string[] | null;
  injectionSuspicious?: boolean;
  injectionReasons?: string[] | null;
  createdAt: string;
}

export interface FaceMatch {
  available: boolean;
  score?: number;
  band?: "match" | "review" | "no_match";
  threshold?: number;
  reason?: string;
}

const INSTRUCTION_LABELS: Record<string, string> = {
  look_up: "Olhar para cima",
  look_down: "Olhar para baixo",
  look_left: "Olhar à esquerda",
  look_right: "Olhar à direita",
  blink: "Piscar",
  open_mouth: "Abrir a boca",
  smile: "Sorrir",
};

function movementLabel(score: number): { label: string; className: string } {
  if (score > 0.5) return { label: "Bom", className: "text-emerald-400" };
  if (score > 0.2) return { label: "Baixo", className: "text-warning" };
  return { label: "Insuficiente", className: "text-destructive" };
}

const MATCH_BAND_UI: Record<
  "match" | "review" | "no_match",
  { label: string; className: string }
> = {
  match: {
    label: "Compatível",
    className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  },
  review: {
    label: "Revisar",
    className: "border-warning/30 bg-warning/10 text-warning",
  },
  no_match: {
    label: "Divergente",
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

const MATCH_UNAVAILABLE_LABEL: Record<string, string> = {
  embedder_disabled: "Comparação facial ainda não habilitada no servidor.",
  no_template: "Sem template biométrico da selfie para comparar.",
  no_face_in_document: "Não foi possível detectar rosto no documento.",
};

function FaceMatchRow({ faceMatch }: { faceMatch?: FaceMatch | null }) {
  if (!faceMatch) return null;
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        Match selfie × documento
      </p>
      {faceMatch.available &&
      typeof faceMatch.score === "number" &&
      faceMatch.band ? (
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${MATCH_BAND_UI[faceMatch.band].className}`}
          >
            {MATCH_BAND_UI[faceMatch.band].label}
          </span>
          <span className="font-mono text-xs font-bold text-foreground">
            {(faceMatch.score * 100).toFixed(1)}%
            {typeof faceMatch.threshold === "number"
              ? ` (corte ${(faceMatch.threshold * 100).toFixed(0)}%)`
              : ""}
          </span>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {MATCH_UNAVAILABLE_LABEL[faceMatch.reason ?? ""] ??
            "Comparação facial indisponível."}
        </p>
      )}
    </div>
  );
}

/**
 * Painel de telemetria da prova de vida (Fase 2). Apoio à decisão do Compliance:
 * mostra os sinais capturados no cliente durante o envio da selfie biofacial.
 */
export function AdminKycLivenessTelemetry({
  telemetry,
  faceMatch,
}: {
  telemetry: LivenessTelemetry | null;
  faceMatch?: FaceMatch | null;
}) {
  if (!telemetry) {
    return (
      <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ScanFace className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Prova de vida
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
              Telemetria
            </h2>
          </div>
        </div>
        <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-muted-foreground">
          Nenhuma telemetria de prova de vida registrada para este usuário.
        </p>
        <FaceMatchRow faceMatch={faceMatch} />
      </section>
    );
  }

  const move = movementLabel(telemetry.landmarkMovement);
  const capturedAt = new Date(telemetry.createdAt);
  const capturedLabel = Number.isNaN(capturedAt.getTime())
    ? "—"
    : capturedAt.toLocaleString("pt-BR");

  return (
    <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ScanFace className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            Prova de vida
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
            Telemetria
          </h2>
        </div>
        <span
          className={`ml-auto rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
            telemetry.passed
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {telemetry.passed ? "Aprovada" : "Rejeitada"}
        </span>
      </div>

      {telemetry.injectionSuspicious && (
        <div
          className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-warning"
          role="alert"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            Possível câmera virtual/injeção detectada
            {telemetry.injectionReasons && telemetry.injectionReasons.length
              ? ` (${telemetry.injectionReasons.join(", ")})`
              : ""}
            . Revise manualmente antes de aprovar.
          </span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-black/20 p-2">
          <div className="flex items-center justify-center gap-1 text-primary">
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-base font-black text-foreground">
              {telemetry.blinkCount}
            </span>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            Piscadas
          </p>
        </div>
        <div className="rounded-lg bg-black/20 p-2">
          <div className="flex items-center justify-center gap-1">
            <Glasses className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className="text-sm font-black text-foreground">
              {telemetry.hasGlasses === null
                ? "—"
                : telemetry.hasGlasses
                  ? "Sim"
                  : "Não"}
            </span>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            Óculos
          </p>
        </div>
        <div className="rounded-lg bg-black/20 p-2">
          <div className="flex items-center justify-center gap-1">
            <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span className={`text-xs font-black ${move.className}`}>
              {move.label}
            </span>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
            Movimento
          </p>
        </div>
      </div>

      <dl className="mt-4 space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Amplitude yaw / pitch</dt>
          <dd className="font-mono font-bold text-foreground">
            {telemetry.maxYawDeg.toFixed(1)}° / {telemetry.maxPitchDeg.toFixed(1)}°
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Duração</dt>
          <dd className="font-mono font-bold text-foreground">
            {(telemetry.durationMs / 1000).toFixed(1)}s
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Capturada em</dt>
          <dd className="font-bold text-foreground">{capturedLabel}</dd>
        </div>
      </dl>

      {telemetry.instructions && telemetry.instructions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {telemetry.instructions.map((ins) => {
            const rt = telemetry.challengeResponseMs?.find(
              (r) => r.id === ins.id,
            );
            return (
              <span
                key={ins.id}
                className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
                  ins.satisfied
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {INSTRUCTION_LABELS[ins.id] ?? ins.id}
                {rt ? ` · ${(rt.ms / 1000).toFixed(1)}s` : ""}
              </span>
            );
          })}
        </div>
      )}

      {telemetry.rejectionReasons && telemetry.rejectionReasons.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {telemetry.rejectionReasons.map((reason) => (
            <li
              key={reason}
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive"
            >
              {reason}
            </li>
          ))}
        </ul>
      )}

      <FaceMatchRow faceMatch={faceMatch} />
    </section>
  );
}
