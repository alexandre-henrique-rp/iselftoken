import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Form, useNavigation } from "react-router";
import {
  useLatestReviewDecision,
  type StartupReviewDecision,
} from "~/hooks/use-latest-review-decision";
import { formatBRDateTime } from "~/lib/date-utils";
import { cn } from "~/lib/utils";

interface PhaseApprovalActionsProps {
  phase: 1 | 2 | 3;
  startupId: number | string;
  /** Gate de pagamento atendido? Habilita o botão Aprovar (auditoria). */
  unlocked: boolean;
}

/**
 * PhaseApprovalActions — ações de auditoria da fase (design §2.2).
 *
 * Comportamento por estado:
 *  - Nunca decidida: mostra botões Aprovar (se gate pago) e Rejeitar.
 *  - APROVADA: ESCONDE os botões. Mostra card "Aprovado por X em DD/MM HH:mm"
 *    com ícone verde. Permite reabrir (botão secundário "Reabrir esta etapa")?
 *    Não por enquanto — a aprovação é final nesta fase.
 *  - REJEITADA: mostra card de rejeição (motivo + quem/quando) com ícone rosa.
 *    MANTÉM os botões Aprovar/Rejeitar para o admin poder reavaliar sem
 *    precisar voltar e clicar de novo (após correção do founder, por ex.).
 *
 * Hook `useLatestReviewDecision` hidrata o estado do backend
 * (`startupReviewDecision` table criada em S26 admin-phases).
 */
export function PhaseApprovalActions({
  phase,
  startupId,
  unlocked,
}: PhaseApprovalActionsProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const navigation = useNavigation();
  const submitting = navigation.state !== "idle";
  const reasonValid = reason.trim().length >= 20;

  const { data: decision } = useLatestReviewDecision(startupId, phase);
  const decisionStatus = decision?.decision ?? null;

  // Após o submit terminar com sucesso, invalida a query de decisão
  // para forçar refetch e atualizar a UI (esconder botões se APPROVED, mostrar
  // card "Rejeitado por X", etc). Sem isso, o usuário precisaria dar F5
  // para ver a mudança porque o cache de TanStack (staleTime: 30s) segura
  // o resultado antigo.
  const queryClient = useQueryClient();
  const wasSubmitting = useRef(false);
  useEffect(() => {
    const nowSubmitting = navigation.state === "submitting";
    if (wasSubmitting.current && !nowSubmitting) {
      // Submit terminou — invalida o cache da decisão para esta fase.
      queryClient.invalidateQueries({
        queryKey: [
          "admin",
          "startup",
          String(startupId),
          "review-decision",
          phase,
        ],
      });
      // Também invalida payment-status (gate pode ter mudado) e o detalhe
      // geral da startup (status muda para APPROVED).
      queryClient.invalidateQueries({
        queryKey: ["admin", "startup", String(startupId)],
      });
    }
    wasSubmitting.current = nowSubmitting;
  }, [navigation.state, queryClient, startupId, phase]);

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-4 sm:p-5 space-y-3">
      <h2 className="text-sm font-bold text-foreground">Ações de aprovação</h2>

      {/* === Card de decisão registrada (APPROVED ou REJECTED) === */}
      {decision && (
        <DecisionCard decision={decision} />
      )}

      {!unlocked && decisionStatus !== "APPROVED" && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
          🔒 Pagamento da etapa ainda não confirmado. A próxima etapa é liberada
          automaticamente quando o pagamento for confirmado (PAID). O botão
          Aprovar registra a validação dos dados como auditoria.
        </div>
      )}

      {/* === Quando APROVADO: esconde botões (decisão final desta fase). === */}
      {decisionStatus === "APPROVED" ? null : !rejecting ? (
        <div className="flex flex-wrap gap-3">
          <Form method="post">
            <input type="hidden" name="startupId" value={startupId} />
            <input type="hidden" name="intent" value="approve-startup" />
            <input type="hidden" name="phase" value={phase} />
            <button
              type="submit"
              disabled={!unlocked || submitting}
              className="rounded-full bg-primary px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-black transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              {submitting ? "Enviando..." : `Aprovar Fase ${phase}`}
            </button>
          </Form>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="rounded-full border border-destructive/30 bg-destructive/10 px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-destructive transition hover:bg-destructive hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/70"
          >
            {decisionStatus === "REJECTED"
              ? "Rejeitar novamente"
              : "Rejeitar / Solicitar ajustes"}
          </button>
        </div>
      ) : (
        <Form method="post" className="space-y-3">
          <input type="hidden" name="startupId" value={startupId} />
          <input type="hidden" name="intent" value="reject-startup" />
          <input type="hidden" name="phase" value={phase} />
          <label
            htmlFor="reject-reason"
            className="block text-xs font-semibold text-foreground"
          >
            Motivo da rejeição (mín. 20 caracteres)
          </label>
          <textarea
            id="reject-reason"
            name="justification"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: documentação societária incompleta…"
            className="w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-foreground outline-none focus:border-destructive/50"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!reasonValid || submitting}
              className={cn(
                "rounded-full bg-destructive px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-destructive/90",
                "disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/70",
              )}
            >
              {submitting ? "Enviando..." : "Confirmar rejeição"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
              className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
            >
              Cancelar
            </button>
            {!reasonValid && reason.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {20 - reason.trim().length} caractere(s) restante(s)
              </span>
            )}
          </div>
        </Form>
      )}
    </section>
  );
}

/**
 * Card visual da decisão registrada (APPROVED ou REJECTED).
 * Mostra quem decidiu, quando e (para REJECTED) o motivo.
 */
function DecisionCard({ decision }: { decision: StartupReviewDecision }) {
  const isApproved = decision.decision === "APPROVED";
  const adminLabel =
    decision.adminName ??
    decision.adminEmail ??
    (decision.adminUserId != null ? `Admin #${decision.adminUserId}` : "Admin");

  return (
    <div
      data-testid="phase-decision-card"
      data-decision={decision.decision}
      className={cn(
        "rounded-xl border p-3 text-xs space-y-2",
        isApproved
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-rose-500/30 bg-rose-500/5",
      )}
    >
      <div className="flex items-start gap-2">
        {isApproved ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
        )}
        <div className="flex-1 space-y-1 min-w-0">
          <p
            className={cn(
              "font-bold text-[11px] uppercase tracking-wider",
              isApproved ? "text-emerald-400" : "text-rose-400",
            )}
          >
            {isApproved ? "Etapa aprovada" : "Etapa rejeitada"}
          </p>
          <p className="text-foreground leading-snug">
            {isApproved ? (
              <>
                Aprovado por{" "}
                <span className="font-bold">{adminLabel}</span>{" "}
                em <span className="font-mono">{formatBRDateTime(decision.createdAt)}</span>
              </>
            ) : (
              <>
                Rejeitado por <span className="font-bold">{adminLabel}</span>{" "}
                em <span className="font-mono">{formatBRDateTime(decision.createdAt)}</span>
                {decision.justification && (
                  <>
                    {" — Motivo: "}
                    <span className="italic text-foreground/90">
                      &ldquo;{decision.justification}&rdquo;
                    </span>
                  </>
                )}
              </>
            )}
          </p>
          {!isApproved && (
            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Quando o founder atualizar o cadastro, os campos alterados serão destacados.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
