import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatBRLCompact } from "~/lib/currency-format";

interface DefineParcelasModalProps {
  campaignId: number;
  startupName: string;
  /** Valor total captado (base para dividir as parcelas). */
  amountRaised: number;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * DefineParcelasModal — "Finalizar Definitivamente" (admin-payout-management
 * §3.6 / 12.2). Define nº de parcelas (mín. 12) e intervalo; mostra preview do
 * valor por parcela (última absorve centavos). Chama
 * POST /api/admin/payouts/:campaignId/finalize.
 */
export function DefineParcelasModal({
  campaignId,
  startupName,
  amountRaised,
  onClose,
  onSuccess,
}: DefineParcelasModalProps) {
  const [numeroParcelas, setNumeroParcelas] = useState(12);
  const [intervaloDias, setIntervaloDias] = useState(30);
  // Sprint S36 — primeiraParcelaDias opcional (1..120). Quando vazio,
  // o backend usa o mesmo intervaloDias (regra antiga — parcela 1 em
  // hoje + 1 * intervaloDias).
  const [primeiraParcelaDias, setPrimeiraParcelaDias] = useState<
    number | ""
  >("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    const n = Math.max(12, Math.min(60, Math.trunc(numeroParcelas) || 12));
    // Exibição sem centavos: valor por parcela inteiro; a última absorve o
    // resto. Mantém o total exato sem exibir frações que confundem o ponto.
    const total = Math.round(amountRaised);
    const valorParcela = Math.floor(total / n);
    const valorUltima = total - valorParcela * (n - 1);
    return { n, valorParcela, valorUltima };
  }, [numeroParcelas, amountRaised]);

  async function handleConfirm() {
    if (preview.n < 12) {
      setError("Mínimo de 12 parcelas.");
      return;
    }
    // Valida primeiraParcelaDias no cliente (defense-in-depth; backend
    // tbm valida via class-validator). Mantem o campo opcional.
    if (primeiraParcelaDias !== "") {
      const n = Number(primeiraParcelaDias);
      if (!Number.isInteger(n) || n < 1 || n > 120) {
        setError("Dias ate a 1a parcela deve ser um inteiro entre 1 e 120.");
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payouts/${campaignId}/finalize`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({
          numeroParcelas: preview.n,
          intervaloDias,
          // Quando vazio (""), backend usa intervaloDias (regra antiga).
          primeiraParcelaDias:
            primeiraParcelaDias === "" ? undefined : Number(primeiraParcelaDias),
          observacao: observacao.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        setError(body?.message ?? "Falha ao finalizar.");
        return;
      }
      onSuccess();
    } catch {
      setError("Falha de rede.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="define-parcelas-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              id="define-parcelas-title"
              className="text-lg font-semibold text-foreground"
            >
              Definir Parcelas
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {startupName} · Total a liberar{" "}
              <span className="font-semibold text-foreground">
                {formatBRLCompact(amountRaised)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="np" className="text-xs font-semibold text-muted-foreground">
              Quantidade (mín. 12)
            </label>
            <input
              id="np"
              type="number"
              min={12}
              max={60}
              value={numeroParcelas}
              onChange={(e) => setNumeroParcelas(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="iv" className="text-xs font-semibold text-muted-foreground">
              Intervalo entre parcelas (dias)
            </label>
            <input
              id="iv"
              type="number"
              min={15}
              max={60}
              value={intervaloDias}
              onChange={(e) => setIntervaloDias(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            />
          </div>
        </div>

        {/* Sprint S36 — primeira parcela configuravel separada (ramp-up). */}
        <div className="space-y-2">
          <label
            htmlFor="iv1"
            className="text-xs font-semibold text-muted-foreground flex items-center justify-between"
          >
            <span>Dias ate a 1a parcela (opcional)</span>
            <span className="text-[10px] text-muted-foreground/60 normal-case">
              deixe vazio para usar o mesmo intervalo
            </span>
          </label>
          <input
            id="iv1"
            type="number"
            min={1}
            max={120}
            value={primeiraParcelaDias}
            onChange={(e) =>
              setPrimeiraParcelaDias(
                e.target.value === "" ? "" : Number(e.target.value),
              )
            }
            placeholder={`Padrao: ${intervaloDias} dias (1 x intervalo)`}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            data-testid="define-primeira-parcela"
          />
          <p className="text-[10px] text-muted-foreground/70">
            Use para ramp-up curto (ex.: <strong>7 dias</strong> na primeira,
            demais a cada <strong>{intervaloDias} dias</strong>). Sem fraude —
            minimo absoluto e 1 dia para evitar saque no mesmo dia.
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor por parcela</span>
            <span className="font-bold text-foreground">
              {formatBRLCompact(preview.valorParcela)}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Última parcela</span>
            <span className="font-bold text-foreground">
              {formatBRLCompact(preview.valorUltima)}
            </span>
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Regra: 1 parcela/mês · não sacadas não expiram (rolam p/ o próximo).
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="obs" className="text-xs font-semibold text-muted-foreground">
            Observação (opcional)
          </label>
          <textarea
            id="obs"
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-white/10 py-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 rounded-full bg-primary py-3 text-xs font-bold text-black transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Liberando…" : "Confirmar e liberar"}
          </button>
        </div>
      </div>
    </div>
  );
}
