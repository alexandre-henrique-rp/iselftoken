import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "~/lib/queries";

export interface SocioInput {
  nome: string;
  participacao: number;
  cargo?: string;
  linkedin?: string;
  bio?: string;
  dedicacao?: string;
}

export interface TeamMemberInput {
  nome: string;
  cargo: string;
  linkedin?: string;
  dedicacao?: string;
}

export interface UpdateStartupTeamInput {
  startupId: string | number;
  socios: SocioInput[];
  teams: TeamMemberInput[];
}

async function updateStartupTeam(
  input: UpdateStartupTeamInput,
): Promise<unknown> {
  const res = await fetch(`/api/startup/${input.startupId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      socios: input.socios,
      teams: input.teams,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Falha ${res.status}`,
    );
  }
  return res.json().catch(() => ({}));
}

/**
 * Persiste sócios + team (founders + advisors + employees) na startup.
 * O backend já aceita todos os campos via SocioDto/TeamMemberDto estendidos
 * (cargo, linkedin, bio, dedicacao, participacao).
 *
 * Invalida queries de dashboard e startup específica após sucesso.
 */
export function useUpdateStartupTeamMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateStartupTeam,
    onSuccess: (_data, vars) => {
      toast.success("Equipe salva com sucesso");
      queryClient.invalidateQueries({ queryKey: queryKeys.startup.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.startup.detail(vars.startupId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.startup.overview,
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Erro ao salvar equipe",
      );
    },
  });
}