import { Upload } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "~/lib/utils";

interface UploadZoneProps {
  label?: string;
  hint?: string;
  preview?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function UploadZone({ label = "Arraste ou clique pra enviar", hint, preview, className, onClick }: UploadZoneProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("upload-zone w-full flex flex-col items-center justify-center gap-3", className)}
    >
      {preview ?? (
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
      )}
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{label}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </button>
  );
}
