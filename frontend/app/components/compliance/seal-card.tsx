import { Award, Edit3, Power, PowerOff, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import type { SealItem } from "~/lib/seal-types";
import { cn } from "~/lib/utils";

interface SealCardProps {
  seal: SealItem;
  /** Quando true, renderiza ações admin (ativar/desativar). */
  adminActions?: boolean;
}

const CATEGORY_LABEL: Record<string, string> = {
  STAGE: "Estágio",
  VERIFICATION: "Verificação",
  PARTNERSHIP: "Parceria",
  ACHIEVEMENT: "Conquista",
  CUSTOM: "Personalizado",
};

async function toggleSeal(
  sealId: number,
  active: boolean,
): Promise<unknown> {
  const res = await fetch(`/api/admin/seals/${sealId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Falha ${res.status}`,
    );
  }
  return res.json();
}

/**
 * Card de selo com imagem, metadados e ações admin.
 */
export function SealCard({ seal, adminActions = true }: SealCardProps) {
  const revalidator = useRevalidator();

  const mutation = useMutation({
    mutationFn: (active: boolean) => toggleSeal(seal.id, active),
    onSuccess: (_data, active) => {
      toast.success(active ? "Selo reativado" : "Selo desativado");
      revalidator.revalidate();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao alterar selo",
      );
    },
  });

  return (
    <div
      className={cn(
        "glass-panel rounded-3xl p-6 border border-white/5 space-y-4",
        !seal.active && "opacity-60",
      )}
    >
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
          {seal.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={seal.imagePath}
              alt={seal.name}
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23d500f9' d='M12 2L3 7v6c0 5 3.5 9.7 9 11 5.5-1.3 9-6 9-11V7l-9-5z'/%3E%3C/svg%3E";
              }}
            />
          ) : (
            <Award className="w-8 h-8 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-black text-foreground truncate">{seal.name}</h3>
            <span
              className={cn(
                "shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                seal.active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-white/5 text-muted-foreground border-white/10",
              )}
            >
              {seal.active ? "Ativo" : "Inativo"}
            </span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/80 mt-1 truncate">
            {seal.slug}
          </p>
          {seal.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {seal.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-white/5">
        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
          {CATEGORY_LABEL[seal.category] ?? seal.category}
        </span>
        {typeof seal.issuedCount === "number" && (
          <span className="text-[10px] text-muted-foreground font-bold">
            · {seal.issuedCount} atribuição{seal.issuedCount !== 1 ? "ões" : ""}
          </span>
        )}
      </div>

      {adminActions && (
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            disabled
            title="Edição em massa será implementada em sprint futura"
            className="flex-1 py-2 rounded-lg bg-white/5 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-not-allowed"
          >
            <Edit3 className="w-3 h-3" /> Editar
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate(!seal.active)}
            disabled={mutation.isPending}
            className={cn(
              "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed",
              seal.active
                ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20",
            )}
            title={seal.active ? "Desativar selo" : "Reativar selo"}
          >
            {mutation.isPending ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : seal.active ? (
              <>
                <PowerOff className="w-3 h-3" /> Desativar
              </>
            ) : (
              <>
                <Power className="w-3 h-3" /> Ativar
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
