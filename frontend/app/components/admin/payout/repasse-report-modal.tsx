import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Calendar, FileText, Wallet, X } from "lucide-react";
import { formatCurrencyBRL } from "~/lib/currency-format";
import { formatDateOnlyBR } from "~/lib/date-utils";
import { cn } from "~/lib/utils";
import type { PayoutInstallmentRequest } from "~/lib/queries";

const ALLOCATION_LABELS: Record<string, string> = {
  marketing: "Marketing & Growth",
  desenvolvimento: "Desenvolvimento / Produto",
  infraestrutura: "Infraestrutura",
  pessoal: "Pessoal",
  juridico: "Juridico & Compliance",
  operacional: "Operacional",
  reservaCaixa: "Reserva de Caixa",
};

export interface RepasseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PayoutInstallmentRequest | null;
}

export function RepasseReportModal({
  isOpen,
  onClose,
  item,
}: RepasseReportModalProps) {
  // SSR-safety: createPortal exige document.body. Em SSR retorna null.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !item || !mounted) return null;

  const valor = Number(item.valorSolicitado) || 0;
  const allocations = Object.entries(item.allocationPercents ?? {})
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]));
  const bank = item.bankInfoSnapshot;
  // A observacao do founder fica no campo `observacao` (form de solicitacao).
  // Os campos `mensagemInvestidores` e `usoRecurso` vem do relatorio
  // mensal FIN-11 §8.2 (fluxo separado, raramente preenchidos no MVP).
  const observacaoPrincipal =
    item.observacao ?? item.mensagemInvestidores ?? null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      data-testid="repasse-report-modal"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-primary/30 bg-card shadow-[0_0_40px_rgba(213,0,249,0.15)] max-h-[90vh] overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-card/95 backdrop-blur-sm p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
              Utilizacao do Recurso · FIN-11
            </p>
            <h2
              id="report-modal-title"
              className="mt-1 text-xl font-black tracking-tight"
            >
              {item.startupName ?? "Startup"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Parcela #{item.installmentNumber ?? "?"}
              {item.totalInstallments
                ? ` de ${item.totalInstallments}`
                : ""}{" "}
              · {formatCurrencyBRL(valor)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-accent/40 hover:text-foreground"
            aria-label="Fechar"
            data-testid="close-report-modal"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-6 p-6">
          {/* Cabecalho com meta-dados */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetaItem
              icon={Wallet}
              label="Valor solicitado"
              value={formatCurrencyBRL(valor)}
            />
            <MetaItem
              icon={Calendar}
              label="Data prevista"
              value={
                item.scheduledDate ? formatDateOnlyBR(item.scheduledDate) : "—"
              }
            />
            <MetaItem
              icon={FileText}
              label="Enviado em"
              value={new Date(item.submittedAt).toLocaleDateString("pt-BR")}
            />
          </div>

          {/* Secao: Destinacao dos Recursos */}
          <section
            className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-transparent p-5"
            data-testid="report-allocation-section"
          >
            <header className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary">
                Destinacao dos Recursos
              </h3>
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
                {allocations.length} categorias
              </span>
            </header>
            {allocations.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                Sem alocacao registrada.
              </p>
            ) : (
              <ul className="space-y-3">
                {allocations.map(([key, pct]) => {
                  const label =
                    ALLOCATION_LABELS[key] ?? key.replace(/^\w/, (c) =>
                      c.toUpperCase(),
                    );
                  const valueReais = item.allocationValues?.[key];
                  const percent = Number(pct);
                  return (
                    <li
                      key={key}
                      data-testid={`report-allocation-row-${key}`}
                      className="space-y-1.5"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {label}
                        </span>
                        <span className="text-xs font-black tabular-nums text-primary">
                          {percent}%
                          {valueReais && (
                            <span className="ml-2 text-[10px] font-bold text-muted-foreground">
                              · {valueReais}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-accent/40">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 shadow-[0_0_8px_rgba(213,0,249,0.5)]"
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Secao: Observacao do fundador — sempre renderizada para evitar
              parecer "sumida" quando o founder ainda nao preencheu.
              Mostra `observacao` (form de solicitacao) ou
              `mensagemInvestidores` (relatorio mensal) nesta ordem. */}
          <section
            className={cn(
              "rounded-2xl border p-5",
              observacaoPrincipal
                ? "border-white/10 bg-accent/10"
                : "border-dashed border-warning/30 bg-warning/5",
            )}
            data-testid="report-observation-section"
          >
            <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
              Observacao do fundador
            </h3>
            {observacaoPrincipal ? (
              <blockquote className="border-l-2 border-primary pl-4 text-sm leading-relaxed text-foreground italic whitespace-pre-line">
                {observacaoPrincipal}
              </blockquote>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Founder ainda nao preencheu a observacao deste mes.
              </p>
            )}
          </section>

          {/* Secao: Dados bancarios destino */}
          {bank && (
            <section
              className="rounded-2xl border border-white/10 bg-card/60 p-5"
              data-testid="report-bank-section"
            >
              <h3 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> Dados bancarios destino
              </h3>
              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Banco
                  </dt>
                  <dd className="mt-0.5 font-bold tabular-nums">
                    {bank.banco || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Agencia
                  </dt>
                  <dd className="mt-0.5 font-bold tabular-nums">
                    {bank.agencia || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Conta
                  </dt>
                  <dd className="mt-0.5 font-bold tabular-nums">
                    {bank.conta || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Tipo
                  </dt>
                  <dd className="mt-0.5 font-bold uppercase">
                    {bank.tipoConta || "CORRENTE"}
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* Texto livre do uso do recurso (campo legado `usoRecurso`).
              Sempre renderizado (igual a observacao) para evitar parecer sumido.
              Renomeado para deixar claro que este campo eh a utilizacao
              detalhada dos recursos que o founder preencheu no relatorio. */}
          <section
            className={cn(
              "rounded-2xl border p-5",
              item.usoRecurso && item.usoRecurso !== item.mensagemInvestidores
                ? "border-white/10 bg-card/60"
                : "border-dashed border-white/5 bg-card/30",
            )}
            data-testid="report-uso-section"
          >
            <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
              Detalhes da utilizacao dos recursos
            </h3>
            {item.usoRecurso && item.usoRecurso !== item.mensagemInvestidores ? (
              <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {item.usoRecurso}
              </p>
            ) : (
              <p className="text-xs italic text-muted-foreground">
                Sem detalhes adicionais sobre a utilizacao.
              </p>
            )}
          </section>
        </div>

        <footer
          className={cn(
            "sticky bottom-0 border-t border-white/10 bg-card/95 backdrop-blur-sm px-6 py-4",
            "flex items-center justify-end",
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-accent/40 px-5 py-2 text-xs font-black uppercase tracking-widest text-foreground transition hover:bg-accent/60"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-accent/10 p-3">
      <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-sm font-black tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}
