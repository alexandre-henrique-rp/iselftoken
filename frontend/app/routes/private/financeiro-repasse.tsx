/**
 * Pagina: Financeiro Repasse.
 * Path: /financeiro/repasse/:repasseId
 *
 * Configura valor/intervalo/valorUltimaParcela (se compliance ja deliberou).
 * Lista solicitacoes pendentes com countdown SLA, aprovar/rejeitar.
 *
 * YAGNI: lista usamos o BFF legado GET /api/financeiro/repasses/:id que
 * retorna `Repasse + Installments + Requests`. Se nao existir, loader
 * cai em fallback vazio.
 */
import { Banknote, Loader2, Settings } from "lucide-react";
import { useState } from "react";
import { useLoaderData, useParams } from "react-router";
import { RepasseConfigModal } from "~/components/financeiro/repasse-config-modal";
import { RepasseReviewModal } from "~/components/financeiro/repasse-review-modal";
import { RepasseSlaCountdown } from "~/components/foundation/repasse-sla-countdown";
import { useMarkInstallmentPaid } from "~/hooks/use-mark-installment-paid";
import { useRejectInstallment } from "~/hooks/use-reject-installment";
import { formatCurrencyBRL } from "~/lib/currency-format";
import { serverFetch } from "~/lib/server-fetch";
import { cn } from "~/lib/utils";
import {
  REPASSE_STATUS_LABELS,
  type Installment,
  type InstallmentRequest,
  type Repasse,
} from "~/types/repasse";

interface RepasseFinanceiroData {
  repasse: Repasse | null;
  pendentes: Array<{ installment: Installment; request: InstallmentRequest }>;
}

export function meta() {
  return [{ title: "Financeiro · Repasse | iSelfToken" }];
}

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { repasseId?: string };
}) {
  const repasseId = params.repasseId;
  if (!repasseId) {
    return Response.json(
      { error: true, message: "ID do repasse nao fornecido" },
      { status: 400 },
    );
  }

  const res = await serverFetch(
    request,
    `/api/financeiro/repasses/${repasseId}`,
  );

  if (!res.ok) {
    // Fallback: tenta endpoint de pendentes
    const fallback = await serverFetch(
      request,
      `/api/financeiro/repasses/${repasseId}/pending`,
    );
    if (!fallback.ok) {
      return Response.json(
        { repasse: null, pendentes: [] } as RepasseFinanceiroData,
        { status: fallback.status },
      );
    }
    const body = (await fallback.json()) as { data?: RepasseFinanceiroData };
    return Response.json(body?.data ?? { repasse: null, pendentes: [] });
  }

  const body = (await res.json()) as { data?: RepasseFinanceiroData };
  return Response.json(body?.data ?? { repasse: null, pendentes: [] });
}

export default function FinanceiroRepassePage() {
  const { repasse, pendentes } = useLoaderData() as RepasseFinanceiroData;
  const { repasseId } = useParams();
  const rejectMutation = useRejectInstallment(repasseId);
  const paidMutation = useMarkInstallmentPaid(repasseId);

  const [configOpen, setConfigOpen] = useState(false);
  const [reviewIdx, setReviewIdx] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState("");
  const [markPaidId, setMarkPaidId] = useState<number | null>(null);
  const [paidForm, setPaidForm] = useState({ txidC6: "", endToEndId: "" });

  const approved = Boolean(repasse?.complianceApprovedAt);
  const item = reviewIdx !== null ? pendentes[reviewIdx] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        data-testid="financeiro-repasse-header"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            financeiro · repasse
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
            Repasse #{repasseId}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {repasse
              ? `${repasse.numeroParcelas} parcelas · valor total ${formatCurrencyBRL(Number(repasse.valorTotalCaptacao))}`
              : "Repasse ainda nao configurado pelo compliance."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {repasse && (
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-widest",
                repasse.status === "IN_PROGRESS"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-accent border-border/40 text-muted-foreground",
              )}
            >
              {REPASSE_STATUS_LABELS[repasse.status]}
            </span>
          )}
          <button
            type="button"
            onClick={() => setConfigOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground hover:opacity-90 active:scale-95"
            data-testid="open-config-modal"
          >
            <Settings className="h-4 w-4" /> Configurar
          </button>
        </div>
      </header>

      {!approved && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          Aguardando deliberacao do Compliance.
        </div>
      )}

      <section
        className="space-y-3"
        data-testid="financeiro-pendentes"
        aria-label="Solicitacoes pendentes"
      >
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Solicitacoes pendentes
        </h2>
        {pendentes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
            Nenhuma solicitacao pendente.
          </div>
        ) : (
          <ul className="space-y-3">
            {pendentes.map(({ installment, request }) => (
              <li
                key={installment.id}
                data-testid={`pendente-installment-${installment.id}`}
                className="rounded-2xl border border-border/40 bg-card/60 p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black">
                      Parcela #{installment.numero} · founder #
                      {request.founderUserId}
                    </h3>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrencyBRL(Number(request.valorSolicitado))}
                    </p>
                  </div>
                  <RepasseSlaCountdown submittedAt={request.submittedAt} />
                </div>

                <ul className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(request.allocationPercents)
                    .filter(([, v]) => (v as number) > 0)
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <li
                        key={k}
                        className="rounded-lg border border-border/30 bg-accent/10 px-2 py-1"
                      >
                        {k}: {v}%
                      </li>
                    ))}
                </ul>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/30">
                  <button
                    type="button"
                    onClick={() =>
                      setReviewIdx(
                        pendentes.findIndex(
                          (p) => p.installment.id === installment.id,
                        ),
                      )
                    }
                    className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-950 hover:opacity-90"
                    data-testid={`approve-${installment.id}`}
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectId(installment.id)}
                    className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-300 hover:bg-red-500/10"
                    data-testid={`reject-${installment.id}`}
                  >
                    Rejeitar
                  </button>
                  {installment.status === "PROCESSING" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMarkPaidId(installment.id);
                        setPaidForm({ txidC6: "", endToEndId: "" });
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-sky-950 hover:opacity-90"
                      data-testid={`mark-paid-${installment.id}`}
                    >
                      <Banknote className="h-4 w-4" /> Marcar como Pago
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reject inline form */}
      {rejectId !== null && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black">Rejeitar solicitacao</h3>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Motivo (obrigatorio, min 10 chars)
              </span>
              <textarea
                rows={3}
                value={rejectMotivo}
                onChange={(e) => setRejectMotivo(e.target.value)}
                className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm resize-none"
                data-testid="reject-motivo"
              />
            </label>
            <footer className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="px-4 py-2 rounded-full border border-border/40 text-xs font-black uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  rejectMotivo.trim().length < 10 || rejectMutation.isPending
                }
                onClick={async () => {
                  await rejectMutation.mutateAsync({
                    installmentId: rejectId,
                    payload: { motivo: rejectMotivo.trim() },
                  });
                  setRejectId(null);
                  setRejectMotivo("");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-red-950 hover:opacity-90 disabled:opacity-50"
                data-testid="reject-submit"
              >
                {rejectMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Confirmar Rejeicao
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* Mark paid inline form */}
      {markPaidId !== null && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border/40 shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-black">Confirmar pagamento (PIX)</h3>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                txid C6
              </span>
              <input
                value={paidForm.txidC6}
                onChange={(e) =>
                  setPaidForm((p) => ({ ...p, txidC6: e.target.value }))
                }
                className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm font-mono"
                data-testid="markpaid-txid"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                endToEndId
              </span>
              <input
                value={paidForm.endToEndId}
                onChange={(e) =>
                  setPaidForm((p) => ({ ...p, endToEndId: e.target.value }))
                }
                className="w-full bg-transparent border border-border/40 rounded-xl px-3 py-2 text-sm font-mono"
                data-testid="markpaid-e2e"
              />
            </label>
            <footer className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMarkPaidId(null)}
                className="px-4 py-2 rounded-full border border-border/40 text-xs font-black uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  paidForm.txidC6.length < 6 ||
                  paidForm.endToEndId.length < 10 ||
                  paidMutation.isPending
                }
                onClick={async () => {
                  await paidMutation.mutateAsync({
                    installmentId: markPaidId,
                    payload: {
                      txidC6: paidForm.txidC6.trim(),
                      endToEndId: paidForm.endToEndId.trim(),
                    },
                  });
                  setMarkPaidId(null);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-sky-950 hover:opacity-90 disabled:opacity-50"
                data-testid="markpaid-submit"
              >
                {paidMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Confirmar Pagamento
              </button>
            </footer>
          </div>
        </div>
      )}

      <RepasseConfigModal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        onSuccess={() => {
          /* invalida TanStack Query no hook */
        }}
        repasseId={repasseId ?? ""}
        complianceApproved={approved}
        defaultValues={{
          valorParcela: repasse?.valorParcela ?? "",
          valorUltimaParcela: repasse?.valorUltimaParcela ?? "",
          intervaloDias: repasse?.intervaloDias ?? 30,
        }}
      />

      <RepasseReviewModal
        isOpen={item !== null}
        onClose={() => setReviewIdx(null)}
        onSuccess={() => {
          /* hook faz a invalidacao */
        }}
        installment={item?.installment ?? null}
        request={item?.request ?? null}
        repasseId={repasseId}
      />
    </div>
  );
}
