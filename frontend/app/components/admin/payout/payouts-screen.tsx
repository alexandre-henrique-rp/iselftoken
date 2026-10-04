import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { DefineParcelasModal } from "~/components/admin/payout/define-parcelas-modal";
import { RepasseReportModal } from "~/components/admin/payout/repasse-report-modal";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Paperclip,
  Save,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { Link } from "react-router";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import {
  adminPayoutsQueryOptions,
  type PayoutAwaitingDecision,
  type PayoutInstallmentRequest,
  type PayoutAwaitingRequest,
  type PayoutScheduledInstallment,
} from "~/lib/queries";
import { formatBRLCompact, formatCurrencyBRL } from "~/lib/currency-format";
import { cn } from "~/lib/utils";

function CategoryHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
        {title}
      </h2>
      <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
        {count}
      </span>
    </div>
  );
}

function DecisionCard({
  item,
  onFinalize,
}: {
  item: PayoutAwaitingDecision;
  onFinalize: (item: PayoutAwaitingDecision) => void;
}) {
  const [periodo, setPeriodo] = useState(30);
  const raised = Number(item.amountRaised) || 0;
  const target = Number(item.targetAmount) || 0;
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  return (
    <article className="rounded-2xl border border-white/10 bg-card p-4 sm:p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-foreground">
            {item.startupName ?? item.campaignName}
          </h3>
          <p className="font-mono text-[10px] text-primary">
            #{String(item.startupId ?? item.campaignId).padStart(6, "0")}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-warning">
          Aguardando decisão
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
        <div>
          <dt className="text-[9px] uppercase text-muted-foreground">Captado</dt>
          <dd className="mt-0.5 font-bold text-foreground">
            {formatBRLCompact(raised)}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase text-muted-foreground">Meta</dt>
          <dd className="mt-0.5 font-bold text-foreground">
            {formatBRLCompact(target)}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase text-muted-foreground">Tokens</dt>
          <dd className="mt-0.5 font-bold text-foreground">
            {item.tokensSold}/{item.totalTokens}
          </dd>
        </div>
      </dl>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Período
          <input
            type="number"
            min={7}
            max={120}
            value={periodo}
            onChange={(e) => setPeriodo(Number(e.target.value))}
            className="w-14 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center text-[11px] text-foreground outline-none focus:border-primary/50"
            aria-label="Período da prorrogação em dias"
          />
          dias
        </label>
        <Link
          to={`/founder/startups/${item.startupId}/prorrogacao?periodo=${periodo}`}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground transition hover:border-primary/30 hover:text-primary"
        >
          Prorrogar
        </Link>
        <button
          type="button"
          onClick={() => onFinalize(item)}
          className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-black"
        >
          Finalizar definitivamente
        </button>
      </div>
    </article>
  );
}

function AwaitingRequestCard({ item }: { item: PayoutAwaitingRequest }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-card p-4 sm:p-6 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-foreground">
            {item.startupName ?? "—"}
          </h3>
          <p className="font-mono text-[10px] text-primary">
            #{String(item.startupId ?? item.repasseId).padStart(6, "0")}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          Aguardando founder
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
        <div>
          <dt className="text-[9px] uppercase text-muted-foreground">Parcelas</dt>
          <dd className="mt-0.5 font-bold text-foreground">
            {item.numeroParcelas}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase text-muted-foreground">Valor/parcela</dt>
          <dd className="mt-0.5 font-bold text-foreground">
            {formatBRLCompact(item.valorParcela)}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] uppercase text-muted-foreground">Próxima</dt>
          <dd className="mt-0.5 font-bold text-foreground">
            {item.proximaParcela ? `#${item.proximaParcela}` : "—"}
          </dd>
        </div>
      </dl>
      <p className="text-[11px] text-muted-foreground">
        Repasse configurado. Aguardando o founder solicitar a parcela do mês.
      </p>
    </article>
  );
}

function dateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

function ScheduledInstallmentRow({
  item,
  onChanged,
}: {
  item: PayoutScheduledInstallment;
  onChanged: () => void;
}) {
  const [date, setDate] = useState(dateInputValue(item.scheduledDate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completed = item.status === "COMPLETED" || Boolean(item.paidAt);

  async function saveDate() {
    if (!date || completed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/payouts/installments/${item.id}/scheduled-date`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json", accept: "application/json" },
          credentials: "include",
          body: JSON.stringify({
            scheduledDate: new Date(`${date}T00:00:00.000Z`).toISOString(),
          }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        setError(body?.message ?? "Falha ao atualizar a data.");
        return;
      }
      onChanged();
    } catch {
      setError("Falha de rede.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3 border-b border-white/10 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:px-5">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-foreground">
          {item.startupName}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Parcela {item.numero} de {item.totalInstallments} · {formatBRLCompact(Number(item.valor) || 0)}
        </p>
      </div>
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Data prevista
        <input
          type="date"
          value={date}
          disabled={completed || busy}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-xs font-medium normal-case tracking-normal text-foreground outline-none focus:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={`Data de pagamento da parcela ${item.numero} de ${item.startupName}`}
        />
      </label>
      <button
        type="button"
        onClick={saveDate}
        disabled={completed || busy || !date || date === dateInputValue(item.scheduledDate)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Save className="h-3.5 w-3.5" aria-hidden="true" />
        {completed ? "Paga" : busy ? "Salvando…" : "Salvar data"}
      </button>
      {error && (
        <p role="alert" className="text-[10px] text-destructive sm:col-span-3">
          {error}
        </p>
      )}
    </div>
  );
}

function InstallmentCard({
  item,
  onChanged,
}: {
  item: PayoutInstallmentRequest;
  onChanged: () => void;
}) {
  const approved = item.status === "APPROVED";
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comprovante, setComprovante] = useState<File | null>(null);
  const comprovanteInputRef = useRef<HTMLInputElement>(null);

  // Limites espelhados do backend (RepassesService.markInstallmentPaidWithComprovante).
  const COMPROVANTE_MAX_BYTES = 25 * 1024 * 1024;
  const COMPROVANTE_MIMES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
  ];

  function handleComprovanteChange(file: File | null) {
    if (!file) {
      setComprovante(null);
      setError(null);
      return;
    }
    if (!COMPROVANTE_MIMES.includes(file.type)) {
      setError(`Tipo nao suportado (${file.type || "?"}). Aceitos: PDF, JPG, PNG.`);
      setComprovante(null);
      if (comprovanteInputRef.current) comprovanteInputRef.current.value = "";
      return;
    }
    if (file.size > COMPROVANTE_MAX_BYTES) {
      setError(`Arquivo excede 25 MB (${(file.size / 1024 / 1024).toFixed(1)} MB).`);
      setComprovante(null);
      if (comprovanteInputRef.current) comprovanteInputRef.current.value = "";
      return;
    }
    setError(null);
    setComprovante(file);
  }

  function clearComprovante() {
    setComprovante(null);
    setError(null);
    if (comprovanteInputRef.current) comprovanteInputRef.current.value = "";
  }

  async function call(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify(body ?? {}),
      });
      const b = await res.json().catch(() => null);
      if (!res.ok || b?.error) {
        setError(b?.message ?? "Falha na operação.");
        return false;
      }
      return true;
    } catch {
      setError("Falha de rede.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const base = `/api/financeiro/installments/${item.installmentId}`;

  async function markPaidWithComprovante(): Promise<void> {
    if (!comprovante) {
      toast.error("Selecione um arquivo de comprovante antes de marcar como pago.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", comprovante);
      const res = await fetch(`${base}/mark-paid-comprovante`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const b = await res.json().catch(() => null);
      if (!res.ok || b?.error) {
        const msg = b?.message ?? "Falha ao marcar como pago.";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Parcela marcada como paga e comprovante anexado.");
      clearComprovante();
      onChanged();
    } catch (err) {
      const msg = "Falha de rede ao enviar o comprovante.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-card to-card/60 p-4 sm:p-6 space-y-3 shadow-[0_0_24px_rgba(213,0,249,0.04)] transition hover:border-primary/30"
      data-testid={`installment-card-${item.installmentId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-black tracking-tight text-foreground">
            {item.startupName ?? "—"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            Parcela {item.installmentNumber ?? "?"}
            {item.totalInstallments ? ` de ${item.totalInstallments}` : ""} ·{" "}
            <span className="font-black text-foreground">
              {formatCurrencyBRL(Number(item.valorSolicitado) || 0)}
            </span>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest",
            approved
              ? "border-primary/30 bg-primary/15 text-primary shadow-[0_0_12px_rgba(213,0,249,0.25)]"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300",
          )}
        >
          {approved ? "Aprovada" : "Solicitada"}
        </span>
      </div>

      {/* Linha de status: Relatorio (botao) + Comprovante (badge) */}
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-black uppercase tracking-widest transition",
            "hover:scale-[1.02] active:scale-95",
            item.hasReport
              ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
          )}
          data-testid={`open-report-modal-${item.installmentId}`}
          aria-label={`Ver relatorio da parcela ${item.installmentNumber ?? ""}`}
        >
          {item.hasReport ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Relatorio {item.hasReport ? "preenchido" : "pendente"}
        </button>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-black uppercase tracking-widest",
            item.hasComprovante
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-white/15 bg-white/5 text-muted-foreground",
          )}
        >
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          Comprovante {item.hasComprovante ? "anexado" : "—"}
        </span>
      </div>

      {rejecting ? (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo da rejeição (obrigatório)…"
            className="w-full rounded-xl border border-destructive/30 bg-black/30 p-2 text-xs text-foreground outline-none focus:border-destructive/60"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy || reason.trim().length < 3}
              onClick={async () => {
                if (await call(`${base}/reject`, { motivo: reason.trim() })) {
                  toast.success("Solicitacao rejeitada.");
                  onChanged();
                }
              }}
              className="rounded-full bg-destructive px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white shadow-[0_0_12px_rgba(239,68,68,0.3)] disabled:opacity-40"
            >
              Confirmar rejeição
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {/* Aprovar — magenta primary (CTA principal) */}
          {!approved && (
            <button
              type="button"
              disabled={busy || !item.hasReport}
              title={item.hasReport ? undefined : "Relatorio do mes obrigatorio"}
              onClick={async () => {
                if (await call(`${base}/approve`)) {
                  toast.success("Solicitacao aprovada.");
                  onChanged();
                }
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition",
                "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(213,0,249,0.35)]",
                "hover:opacity-90 hover:scale-[1.02] active:scale-95",
                "disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",
              )}
              data-testid={`approve-${item.installmentId}`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Aprovar
            </button>
          )}

          {/* Upload de comprovante — visivel em qualquer status (exceto
              COMPLETED). Backend exige Installment.status === PROCESSING,
              entao antes de aprovar o admin vai receber erro amigavel.
              Estrutura:
              - Botao "Selecionar arquivo" explicito que abre o seletor do SO
                via ref (mais confiavel do que label htmlFor com sr-only).
              - Input real sempre presente mas estilizado (visivel) para
                manter a11y nativa e funcionar em qualquer browser.
              - Preview do arquivo selecionado + botao X para limpar.
              - CTA "Marcar como pago" fica desabilitado ate ter arquivo
                valido (passou na validacao MIME + tamanho). */}
          {item.status !== "COMPLETED" && item.status !== "REJECTED" && (
            <div className="flex w-full flex-col gap-4 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
              <header className="flex items-start justify-between gap-3">
                <h4 className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                  <Paperclip className="h-3.5 w-3.5" /> Comprovante de pagamento
                </h4>
                <span className="shrink-0 text-right text-[9px] uppercase leading-relaxed tracking-widest text-muted-foreground">
                  PDF / JPG / PNG
                  <br className="sm:hidden" /> · até 25 MB
                </span>
              </header>

              {!approved && (
                <p className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
                  A parcela precisa ser <strong>Aprovada</strong> antes de
                  anexar o comprovante. Clique em <strong>Aprovar</strong>{" "}
                  acima para liberar esta acao.
                </p>
              )}

              {comprovante ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p
                        className="truncate text-xs font-bold text-foreground"
                        data-testid={`comprovante-name-${item.installmentId}`}
                      >
                        {comprovante.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {(comprovante.size / 1024).toFixed(1)} KB ·{" "}
                        {comprovante.type || "tipo desconhecido"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearComprovante}
                    disabled={busy}
                    className="rounded-full p-1 text-muted-foreground transition hover:bg-destructive/20 hover:text-destructive disabled:opacity-40"
                    aria-label="Remover arquivo"
                    data-testid={`comprovante-clear-${item.installmentId}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => comprovanteInputRef.current?.click()}
                  disabled={busy}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-xs font-bold uppercase tracking-widest transition",
                    "border-primary/30 bg-primary/5 text-primary",
                    "hover:border-primary/60 hover:bg-primary/10",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                  )}
                  data-testid={`comprovante-pick-${item.installmentId}`}
                  aria-controls={`comprovante-${item.installmentId}`}
                >
                  <Upload className="h-4 w-4" />
                  Selecionar arquivo de comprovante
                </button>
              )}

              <input
                ref={comprovanteInputRef}
                id={`comprovante-${item.installmentId}`}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) =>
                  handleComprovanteChange(e.target.files?.[0] ?? null)
                }
                className="sr-only"
                tabIndex={-1}
                aria-label="Selecionar comprovante de pagamento"
                data-testid={`comprovante-input-${item.installmentId}`}
              />

              <button
                type="button"
                disabled={busy || !comprovante || !approved}
                title={
                  !approved
                    ? "Aprovar a solicitacao antes de marcar como pago"
                    : !comprovante
                      ? "Selecione um comprovante para marcar como pago"
                      : undefined
                }
                onClick={markPaidWithComprovante}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition",
                  "bg-primary text-primary-foreground shadow-[0_0_18px_rgba(213,0,249,0.35)]",
                  "hover:opacity-90 hover:scale-[1.02] active:scale-95",
                  "disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none",
                )}
                data-testid={`mark-paid-${item.installmentId}`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Marcar como pago
              </button>
            </div>
          )}

          {/* Rejeitar — outline destructive (acao secundaria) */}
          <button
            type="button"
            disabled={busy}
            onClick={() => setRejecting(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-5 py-2 text-[10px] font-black uppercase tracking-widest transition",
              "border-destructive/40 bg-destructive/10 text-destructive",
              "hover:bg-destructive hover:text-white hover:scale-[1.02] active:scale-95",
              "disabled:opacity-30 disabled:cursor-not-allowed",
            )}
            data-testid={`reject-${item.installmentId}`}
          >
            Rejeitar
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[10px] text-destructive">
          {error}
        </p>
      )}

      <RepasseReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        item={item}
      />
    </article>
  );
}

/**
 * PayoutsScreen — página consolidada /admin/payouts (S4), 4 estados.
 * Categoria 1: captações finalizadas aguardando decisão (prorrogar/finalizar).
 * Categoria 2: solicitações de parcela pendentes (relatório + comprovante).
 */
export function PayoutsScreen() {
  const [scheduledPage, setScheduledPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery(
    adminPayoutsQueryOptions(scheduledPage),
  );
  const queryClient = useQueryClient();
  const [finalizing, setFinalizing] =
    useState<PayoutAwaitingDecision | null>(null);

  const decisions = data?.awaitingDecision ?? [];
  const requests = data?.installmentRequests ?? [];
  const awaiting = data?.awaitingRequest ?? [];
  const scheduledInstallments = data?.scheduledInstallments ?? [];
  const scheduledPagination = data?.scheduledInstallmentsPagination;
  const empty =
    decisions.length === 0 &&
    requests.length === 0 &&
    awaiting.length === 0 &&
    scheduledInstallments.length === 0;

  return (
    <main className="min-h-screen px-1.5 pb-6 pt-3 md:px-0 md:pb-8 md:pt-4">
      <div className="relative mx-auto w-full max-w-7xl xl:max-w-[1400px]">
        <DashboardBackgroundWatermark />
        <header className="mb-6 md:mb-8">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
            Financeiro
          </p>
          <h1 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
            Gestão de Repasse
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Decisões de captação finalizada e solicitações de parcela em um só
            lugar.
          </p>
        </header>

        {isLoading && !data ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : isError ? (
          <div
            className="rounded-2xl border border-white/10 bg-card p-8 text-center"
            role="alert"
          >
            <AlertCircle
              className="mx-auto h-10 w-10 text-destructive"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-bold text-destructive">
              Não foi possível carregar os payouts.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 rounded-full bg-primary px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-black hover:opacity-90"
            >
              Tentar novamente
            </button>
          </div>
        ) : empty ? (
          <div className="rounded-2xl border border-white/10 bg-card p-10 text-center">
            <Wallet
              className="mx-auto h-10 w-10 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-bold text-foreground">
              Nenhum payout pendente
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Captações finalizadas e solicitações de parcela aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <CategoryHeader
                title="Captação finalizada — decisão pendente"
                count={decisions.length}
              />
              {decisions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma captação aguardando decisão.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {decisions.map((d) => (
                    <DecisionCard
                      key={d.campaignId}
                      item={d}
                      onFinalize={setFinalizing}
                    />
                  ))}
                </div>
              )}
            </section>

            <section>
              <CategoryHeader
                title="Aguardando solicitação do founder"
                count={awaiting.length}
              />
              {awaiting.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma startup aguardando solicitação.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {awaiting.map((a) => (
                    <AwaitingRequestCard key={a.repasseId} item={a} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <CategoryHeader
                title="Parcelas programadas"
                count={scheduledInstallments.length}
              />
              {scheduledInstallments.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma parcela programada.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-card">
                  {scheduledInstallments.map((item) => (
                    <ScheduledInstallmentRow
                      key={item.id}
                      item={item}
                      onChanged={() => {
                        toast.success("Data de pagamento atualizada.");
                        void queryClient.invalidateQueries({
                          queryKey: ["admin-payouts"],
                        });
                      }}
                    />
                  ))}
                </div>
              )}
              {scheduledPagination && scheduledPagination.totalPages > 1 && (
                <nav
                  className="mt-3 flex items-center justify-end gap-2"
                  aria-label="Paginação de parcelas programadas"
                >
                  <button
                    type="button"
                    disabled={scheduledPagination.page <= 1}
                    onClick={() => setScheduledPage((page) => page - 1)}
                    aria-label="Página anterior das parcelas"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Página {scheduledPagination.page} de {scheduledPagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={scheduledPagination.page >= scheduledPagination.totalPages}
                    onClick={() => setScheduledPage((page) => page + 1)}
                    aria-label="Próxima página das parcelas"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </nav>
              )}
            </section>

            <section>
              <CategoryHeader
                title="Solicitações de parcela"
                count={requests.length}
              />
              {requests.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhuma solicitação de parcela pendente.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {requests.map((r) => (
                    <InstallmentCard
                      key={r.id}
                      item={r}
                      onChanged={() => {
                        // NAO mostrar toast generico aqui — cada acao
                        // (aprovar, rejeitar, marcar como pago) ja tem
                        // seu proprio toast especifico. Mostrar dois
                        // toasts por acao confundia o admin (parecia
                        // que TODAS as parcelas tinham sido afetadas).
                        void queryClient.invalidateQueries({
                          queryKey: ["admin-payouts"],
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {finalizing && (
        <DefineParcelasModal
          campaignId={finalizing.campaignId}
          startupName={finalizing.startupName ?? finalizing.campaignName}
          amountRaised={Number(finalizing.amountRaised) || 0}
          onClose={() => setFinalizing(null)}
          onSuccess={() => {
            toast.success("Repasse configurado e liberado.");
            setFinalizing(null);
            void queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
          }}
        />
      )}
    </main>
  );
}
