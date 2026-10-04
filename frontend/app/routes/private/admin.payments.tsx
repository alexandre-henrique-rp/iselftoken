import type { Route } from "./+types/admin.payments";
import { Form, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Loader2,
  Receipt,
  Search,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  useAdminPayments,
  useUpdatePaymentMutation,
  type AdminPayment,
  type PaymentStatus,
} from "~/hooks/use-admin-payments";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Ordens e Pagamentos | Admin | iSelfToken" },
    {
      name: "description",
      content:
        "Audite e gerencie todas as ordens de servicos e pagamentos do sistema.",
    },
  ];
}

const PAYMENT_PURPOSE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Assinatura SaaS",
  INVESTMENT: "Investimento em tokens",
  TOKEN_RESERVATION: "Reserva de token (fundador)",
  EARLY_ACCESS: "Acesso antecipado",
  P2P_BUY: "Compra P2P",
  VERIFICATION_SEAL: "Selo de verificada",
  COMPLIANCE_FEE: "Taxa de compliance",
  TOKEN_RESERVATION_EXTENSION: "Prorrogacao de reserva",
  FAST_TRACK_REVIEW: "Fast track (compliance)",
};

const SERVICE_PURPOSES = new Set([
  "VERIFICATION_SEAL",
  "COMPLIANCE_FEE",
  "FAST_TRACK_REVIEW",
  "TOKEN_RESERVATION_EXTENSION",
  "EARLY_ACCESS",
]);

const STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  PAID: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  CANCELED: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  REFUNDED: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  EXPIRED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelado",
  REFUNDED: "Estornado",
  EXPIRED: "Expirado",
};

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return 0;
}

function formatBRL(v: unknown): string {
  const n = toNumber(v);
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  void request;
  return null;
}

export default function AdminPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const page = Number(searchParams.get("page") ?? "1") || 1;
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "") as PaymentStatus | "";
  const purpose = searchParams.get("purpose") ?? "";

  const paymentsQuery = useAdminPayments({
    page,
    limit: 25,
    search: search || undefined,
    status: status || undefined,
    purpose: purpose || undefined,
  });

  const updateMutation = useUpdatePaymentMutation();
  const payments: AdminPayment[] = paymentsQuery.data?.data ?? [];
  const total = paymentsQuery.data?.total ?? 0;
  const totalPages = paymentsQuery.data?.totalPages ?? 0;

  const selected = useMemo(
    () => payments.find((p) => p.id === selectedId) ?? null,
    [payments, selectedId],
  );

  const updateParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    if (next.search !== undefined || next.status !== undefined || next.purpose !== undefined) {
      params.set("page", "1");
    }
    setSearchParams(params);
  };

  const isServiceOrder = (p: string) => SERVICE_PURPOSES.has(p);

  const handleStatusChange = async (
    id: number,
    newStatus: PaymentStatus,
  ) => {
    try {
      await updateMutation.mutateAsync({ id, status: newStatus });
      toast.success(`Pagamento #${id} atualizado para ${STATUS_LABELS[newStatus]}.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao atualizar pagamento.",
      );
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-8 py-6 max-w-7xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Ordens e Pagamentos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Auditoria centralizada de pagamentos (assinaturas, investimentos,
            ordens de servico). Use os filtros para auditar ordens pendentes
            ou localizar pagamentos por usuario.
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {total} {total === 1 ? "registro" : "registros"}
        </span>
      </header>

      <Form
        method="get"
        className="flex flex-wrap gap-3 items-end rounded-2xl border border-white/10 bg-card p-4"
      >
        <label className="flex-1 min-w-[200px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Buscar
          </span>
          <div className="relative mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="ID do pagamento, email ou status"
              className="w-full rounded-xl bg-surface border border-white/10 pl-9 pr-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
            />
          </div>
        </label>

        <label>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Status
          </span>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 rounded-xl bg-surface border border-white/10 px-3 py-2 text-sm focus:border-primary outline-none"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tipo
          </span>
          <select
            name="purpose"
            defaultValue={purpose}
            className="mt-1 rounded-xl bg-surface border border-white/10 px-3 py-2 text-sm focus:border-primary outline-none"
          >
            <option value="">Todos</option>
            <optgroup label="Ordens de servico">
              {Array.from(SERVICE_PURPOSES).map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_PURPOSE_LABELS[p] ?? p}
                </option>
              ))}
            </optgroup>
            <optgroup label="Outros pagamentos">
              {(
                [
                  "SUBSCRIPTION",
                  "INVESTMENT",
                  "TOKEN_RESERVATION",
                  "P2P_BUY",
                ] as const
              ).map((p) => (
                <option key={p} value={p}>
                  {PAYMENT_PURPOSE_LABELS[p]}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        <button
          type="submit"
          className="rounded-xl bg-primary text-black font-black uppercase tracking-wider text-xs px-4 py-2.5 hover:opacity-90"
        >
          Filtrar
        </button>

        {(search || status || purpose) && (
          <button
            type="button"
            onClick={() =>
              updateParams({ search: "", status: "", purpose: "" })
            }
            className="rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:bg-white/5"
          >
            Limpar
          </button>
        )}
      </Form>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="rounded-2xl border border-white/10 bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04] text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5">#</th>
                <th className="text-left px-3 py-2.5">Tipo</th>
                <th className="text-left px-3 py-2.5">Usuario</th>
                <th className="text-right px-3 py-2.5">Valor</th>
                <th className="text-left px-3 py-2.5">Metodo</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-left px-3 py-2.5">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {paymentsQuery.isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Loader2 className="inline-block w-5 h-5 animate-spin mr-2" />
                    Carregando...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Nenhum pagamento encontrado.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`border-t border-white/5 cursor-pointer transition-colors ${
                      selectedId === p.id
                        ? "bg-primary/10"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">
                      #{p.id}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {isServiceOrder(p.purpose) && (
                          <Receipt className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span className="text-foreground">
                          {PAYMENT_PURPOSE_LABELS[p.purpose] ?? p.purpose}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {p.user?.email ??
                        `User #${p.userId}`}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">
                      {formatBRL(p.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {p.method}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[p.status]}`}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <nav
              className="flex items-center justify-between gap-3 p-3 border-t border-white/5"
              aria-label="Paginacao"
            >
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
                className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-xs text-muted-foreground">
                Pagina {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updateParams({ page: String(page + 1) })}
                className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Proxima
              </button>
            </nav>
          )}
        </div>

        <aside className="rounded-2xl border border-white/10 bg-card p-5 lg:sticky lg:top-6 self-start">
          {selected ? (
            <PaymentDetail
              payment={selected}
              onStatusChange={(s) => handleStatusChange(selected.id, s)}
              isUpdating={
                updateMutation.isPending &&
                updateMutation.variables?.id === selected.id
              }
            />
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Selecione um pagamento para ver os detalhes.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

interface PaymentDetailProps {
  payment: AdminPayment;
  onStatusChange: (s: PaymentStatus) => void;
  isUpdating: boolean;
}

function PaymentDetail({
  payment,
  onStatusChange,
  isUpdating,
}: PaymentDetailProps) {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Pagamento #{payment.id}
        </span>
        <h2 className="text-lg font-bold mt-0.5">
          {PAYMENT_PURPOSE_LABELS[payment.purpose] ?? payment.purpose}
        </h2>
        <span
          className={`inline-block mt-2 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${STATUS_STYLES[payment.status]}`}
        >
          {STATUS_LABELS[payment.status]}
        </span>
      </div>

      <dl className="space-y-2 text-sm">
        <Field label="Valor" value={formatBRL(payment.amount)} />
        <Field label="Metodo" value={payment.method} icon={<CreditCard className="w-3.5 h-3.5" />} />
        <Field label="Usuario" value={payment.user?.email ?? `#${payment.userId}`} icon={<Wallet className="w-3.5 h-3.5" />} />
        <Field label="Criado em" value={formatDate(payment.createdAt)} />
        <Field label="Pago em" value={formatDate(payment.paidAt)} />
        {payment.originalAmount && (
          <Field
            label="Original"
            value={formatBRL(payment.originalAmount)}
          />
        )}
        {payment.discountAmount && Number(payment.discountAmount) > 0 && (
          <Field
            label="Desconto"
            value={`- ${formatBRL(payment.discountAmount)}`}
          />
        )}
        {payment.paidAmount && (
          <Field label="Pago" value={formatBRL(payment.paidAmount)} />
        )}
        {payment.txid && <Field label="TXID" value={payment.txid} mono />}
        {payment.endToEndId && (
          <Field label="End-to-End" value={payment.endToEndId} mono />
        )}
        {payment.expiresAt && (
          <Field label="Expira em" value={formatDate(payment.expiresAt)} />
        )}
      </dl>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Alterar status
        </span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(STATUS_LABELS).map(([k, v]) => {
            const isCurrent = payment.status === k;
            const isDangerous = k === "CANCELED" || k === "EXPIRED";
            return (
              <button
                key={k}
                type="button"
                disabled={isCurrent || isUpdating}
                onClick={() => onStatusChange(k as PaymentStatus)}
                className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                  isCurrent
                    ? "border-primary bg-primary/10 text-primary cursor-default"
                    : isDangerous
                      ? "border-rose-500/30 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40"
                      : "border-white/10 text-muted-foreground hover:bg-white/5 disabled:opacity-40"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed">
          Mudancas sao registradas no audit log. Acoes irreversiveis
          (estorno, cancelamento) devem ser feitas via gateway (EFI) para
          efeito financeiro real.
        </p>
      </div>

      {payment.status === "CANCELED" && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] text-rose-200">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Marcado como cancelado. Lembre-se de processar o estorno no
            gateway para reaver os valores do usuario.
          </span>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/5 pb-2 last:border-b-0">
      <dt className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </dt>
      <dd
        className={`text-sm text-foreground text-right ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
