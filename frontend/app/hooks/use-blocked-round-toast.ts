/**
 * Hook que escuta o search param `?blocked=...` e dispara um toast de erro
 * explicando por que uma nova rodada não pode ser aberta (PRD §4.11).
 *
 * Após exibir o toast, remove o param da URL (replace: true) para que o
 * toast não seja re-disparado em re-renders.
 *
 * Aceita também o param opcional `?round=<id>` e `?paid=<n>` (passados pelo
 * loader) para compor mensagens com progresso concreto do repasse
 * (ex.: "2/3 parcelas pagas").
 */
import { useEffect } from "react";
import type { SetURLSearchParams } from "react-router";
import { toast } from "sonner";

const BLOCKED_TOAST_MESSAGES: Record<string, string> = {
  STATUS_INVALIDO:
    "Esta startup ainda não concluiu todo o fluxo de aprovação.",
  CAMPANHA_ATIVA:
    "Sua captação atual ainda está em andamento. Finalize-a antes de abrir uma nova rodada.",
  CAMPANHA_DRAFT:
    "Sua captação está aguardando aprovação. Não é possível abrir outra rodada.",
  TOKENS_NAO_VENDIDOS:
    "A rodada anterior precisa estar 100% vendida para iniciar uma nova.",
  CARENCIA_3_MESES:
    "É preciso esperar 3 meses desde o encerramento da rodada anterior.",
  SEM_CAMPANHA_ANTERIOR:
    "Não há campanha anterior finalizada para abrir nova rodada.",
};

/**
 * Mensagem do Gate 6 — REPASSE_PENDENTE.
 * Constrói dinamicamente conforme o número de parcelas já pagas
 * (passado via `?paid=N`). Sem esse param, mostra mensagem genérica.
 */
function buildRepassePendenteMessage(paid: number | null): string {
  if (paid === null) {
    return "O repasse de fundos da rodada anterior está em andamento. Finalize o repasse antes de abrir uma nova captação.";
  }
  if (paid <= 0) {
    return "O repasse da rodada anterior ainda não foi iniciado. Aguarde a primeira parcela antes de abrir uma nova captação.";
  }
  if (paid >= 3) {
    // Edge case: 3 ou mais parcelas pagas (não deveria acontecer
    // porque o Gate 6 libera com PAID_OUT, mas tratamos defensivamente).
    return "Repasse concluído. Recarregue a página para liberar o botão de nova captação.";
  }
  return `Repasse em andamento (${paid}/3 parcelas pagas). Conclua as parcelas restantes para abrir uma nova captação.`;
}

export function useBlockedRoundToast(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
): void {
  useEffect(() => {
    const blocked = searchParams.get("blocked");
    if (!blocked) return;

    const paidRaw = searchParams.get("paid");
    const paid = paidRaw !== null ? Number(paidRaw) : null;
    const isRepasse = blocked === "REPASSE_PENDENTE";

    const fallback = "Não é possível abrir nova rodada no momento.";
    const msg = isRepasse
      ? buildRepassePendenteMessage(paid)
      : BLOCKED_TOAST_MESSAGES[blocked] || fallback;

    toast.error("Nova rodada bloqueada", { description: msg, duration: 8000 });

    const next = new URLSearchParams(searchParams);
    next.delete("blocked");
    next.delete("paid");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);
}
