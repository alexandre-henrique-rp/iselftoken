/**
 * Subcomponentes de apresentação (puros) das telas do fluxo de liveness.
 * Não tocam no estado/loop de detecção — recebem tudo por props. Extraídos do
 * liveness-modal.tsx na Fase 0 para reduzir o tamanho do componente principal.
 */
import {
  Camera,
  CheckCircle2,
  Eye,
  Glasses,
  RotateCcw,
  X,
} from "lucide-react";
import type React from "react";
import { cn } from "~/lib/utils";
import type { Instruction, LivenessResult } from "./types";

export interface InstructionDef {
  id: Instruction;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

export function LivenessErrorPanel({
  error,
  onClose,
}: {
  error: string | null;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-10">
      <p className="text-red-400 text-sm mb-4">{error}</p>
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 bg-white/10 rounded-xl text-xs uppercase tracking-widest text-white hover:bg-white/20 transition"
      >
        Fechar
      </button>
    </div>
  );
}

export function LivenessIntroPanel({
  onCancel,
  onStart,
}: {
  onCancel: () => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5">
        <Glasses className="w-9 h-9 text-amber-300" />
      </div>
      <h3 className="text-lg font-black uppercase tracking-wider text-white mb-3">
        Antes de começar
      </h3>
      <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
        Para a verificação de identidade, por favor{" "}
        <strong className="text-white">retire seus óculos</strong> e remova
        objetos que cubram o rosto (máscaras, bonés etc.).
      </p>
      <p className="text-xs text-slate-500 mt-3 max-w-sm">
        Mantenha boa iluminação e posicione-se em frente à câmera.
      </p>
      <div className="mt-7 flex gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] uppercase font-black tracking-widest hover:bg-white/10 transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onStart}
          className="flex-1 py-3 rounded-xl bg-primary text-white text-[11px] uppercase font-black tracking-widest hover:bg-primary/90 flex items-center justify-center gap-2 transition"
        >
          <Camera className="w-4 h-4" />
          Estou pronto
        </button>
      </div>
    </div>
  );
}

function InstructionList({
  result,
  pool,
}: {
  result: LivenessResult;
  pool: InstructionDef[];
}) {
  return (
    <ul className="mt-5 w-full max-w-sm space-y-2">
      {result.instructions.map((ins) => {
        const def = pool.find((p) => p.id === ins.id)!;
        return (
          <li
            key={ins.id}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl border text-left",
              ins.satisfied
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10 border-red-500/30",
            )}
          >
            <def.Icon className="w-4 h-4 text-white shrink-0" />
            <span className="text-[11px] uppercase tracking-widest text-white flex-1">
              {def.label}
            </span>
            {ins.satisfied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <X className="w-4 h-4 text-red-400" />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function LivenessFailedPanel({
  result,
  pool,
  onCancel,
  onRetry,
}: {
  result: LivenessResult | null;
  pool: InstructionDef[];
  onCancel: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-5">
        <X className="w-9 h-9 text-red-400" />
      </div>
      <h3 className="text-lg font-black uppercase tracking-wider text-white mb-3">
        Verificação não concluída
      </h3>
      <p className="text-sm text-slate-300 max-w-sm leading-relaxed">
        A gravação não atendeu todos os requisitos de segurança. Veja o motivo
        identificado antes de refazer.
      </p>
      {result?.rejectionReasons.length ? (
        <ul className="mt-4 w-full max-w-sm space-y-2 text-left">
          {result.rejectionReasons.map((reason) => (
            <li
              key={reason}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            >
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
      {result && <InstructionList result={result} pool={pool} />}
      <div className="mt-7 flex gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[11px] uppercase font-black tracking-widest hover:bg-white/10 transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl bg-primary text-white text-[11px] uppercase font-black tracking-widest hover:bg-primary/90 flex items-center justify-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4" />
          Refazer gravação
        </button>
      </div>
    </div>
  );
}

export function LivenessReviewMetrics({
  result,
  pool,
}: {
  result: LivenessResult;
  pool: InstructionDef[];
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      {result.instructions.map((ins) => {
        const def = pool.find((p) => p.id === ins.id)!;
        return (
          <div
            key={ins.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl border",
              ins.satisfied
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-red-500/10 border-red-500/30",
            )}
          >
            <def.Icon className="w-4 h-4 text-white" />
            <span className="text-[11px] uppercase tracking-widest text-white flex-1">
              {def.label}
            </span>
            {ins.satisfied ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <X className="w-4 h-4 text-red-400" />
            )}
          </div>
        );
      })}
      <div className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10">
        <Eye className="w-4 h-4 text-white" />
        <span className="text-[11px] uppercase tracking-widest text-white flex-1">
          Piscadas
        </span>
        <span className="text-xs font-black text-primary">
          {result.blinkCount}
        </span>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10">
        <Glasses className="w-4 h-4 text-white" />
        <span className="text-[11px] uppercase tracking-widest text-white flex-1">
          Óculos
        </span>
        <span className="text-xs font-black text-primary">
          {result.hasGlasses === null
            ? "—"
            : result.hasGlasses
              ? "Sim"
              : "Não"}
        </span>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-xl border bg-white/5 border-white/10">
        <Eye className="w-4 h-4 text-white" />
        <span className="text-[11px] uppercase tracking-widest text-white flex-1">
          Movimento Facial
        </span>
        <span
          className={cn(
            "text-xs font-black",
            result.landmarkMovementScore > 0.5
              ? "text-emerald-400"
              : result.landmarkMovementScore > 0.2
                ? "text-amber-400"
                : "text-red-400",
          )}
        >
          {result.landmarkMovementScore > 0.5
            ? "Bom"
            : result.landmarkMovementScore > 0.2
              ? "Baixo"
              : "Insuficiente"}
        </span>
      </div>
    </div>
  );
}
