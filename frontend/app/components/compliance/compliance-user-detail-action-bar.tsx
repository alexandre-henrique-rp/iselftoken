import { Ban, CheckCircle, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useRevalidator } from "react-router";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { UserDetail } from "~/routes/private/compliance-user-detail";

interface ComplianceUserDetailActionBarProps {
  user: UserDetail;
}

async function setUserStatus(
  userId: number,
  isActive: boolean,
): Promise<unknown> {
  const res = await fetch(`/api/admin/users/${userId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Falha ${res.status}`,
    );
  }
  return res.json();
}

export function ComplianceUserDetailActionBar({ user }: ComplianceUserDetailActionBarProps) {
  const revalidator = useRevalidator();
  const mutation = useMutation({
    mutationFn: (isActive: boolean) => setUserStatus(user.id, isActive),
    onSuccess: (_data, isActive) => {
      toast.success(isActive ? "Usuário habilitado" : "Usuário desabilitado");
      revalidator.revalidate();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar o status. Tente novamente.",
      );
    },
  });

  const handleToggleStatus = () => {
    mutation.mutate(!user.isActive);
  };

  return (
    <footer
      className={cn(
        "fixed bottom-0 left-0 w-full z-50 bg-black/85 backdrop-blur-2xl border-t border-primary/20",
        "py-6 px-8 flex items-center justify-between gap-6",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" aria-hidden="true" />
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Ações de Admin
        </span>
      </div>
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={handleToggleStatus}
          disabled={mutation.isPending}
          className={cn(
            "flex items-center justify-center gap-3 px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            user.isActive
              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30",
          )}
        >
          {mutation.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : user.isActive ? (
            <>
              <Ban className="w-4 h-4" />
              <span>Desabilitar</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Habilitar</span>
            </>
          )}
        </button>
      </div>
    </footer>
  );
}