/** Modal de edição de cupom com configuração, uso, validade e auditoria. */

import {
  BarChart3,
  CalendarDays,
  History,
  Power,
  Save,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CouponsAuditTable } from "~/components/coupons/coupons-audit-table";
import { useCouponUsages } from "~/hooks/use-coupon-usages";
import { useToggleCouponStatus } from "~/hooks/use-toggle-coupon-status";
import { useUpdateCoupon } from "~/hooks/use-update-coupon";
import {
  PERCENT_WHITELIST,
  getCouponStatus,
  type Coupon,
  type CouponUsageStatus,
} from "~/lib/api/coupons";

export type CouponTabId = "dados" | "uso" | "validade" | "auditoria";

interface CouponEditModalProps {
  coupon: Coupon | null;
  open: boolean;
  initialTab?: CouponTabId;
  canManage: boolean;
  onClose: () => void;
}

const tabs: Array<{
  id: CouponTabId;
  label: string;
  icon: typeof Settings2;
}> = [
  { id: "dados", label: "Configuração", icon: Settings2 },
  { id: "uso", label: "Uso em tempo real", icon: BarChart3 },
  { id: "validade", label: "Validade", icon: CalendarDays },
  { id: "auditoria", label: "Auditoria", icon: History },
];

export function CouponEditModal({
  coupon,
  open,
  initialTab = "dados",
  canManage,
  onClose,
}: CouponEditModalProps) {
  const [activeTab, setActiveTab] = useState<CouponTabId>(initialTab);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(20);
  const [maxUses, setMaxUses] = useState("");
  const [description, setDescription] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const updateCoupon = useUpdateCoupon();
  const toggleStatus = useToggleCouponStatus();
  const usageQuery = useCouponUsages(
    coupon?.id ?? 0,
    open && activeTab === "uso" && coupon !== null,
  );
  const usageCount =
    usageQuery.data?.confirmedCount ??
    coupon?.confirmedCount ??
    coupon?.usedCount ??
    0;
  const reservedCount =
    usageQuery.data?.reservedCount ?? coupon?.reservedCount ?? 0;
  const availableCount =
    usageQuery.data?.availableCount ??
    coupon?.availableCount ??
    (coupon?.maxUses === null || coupon?.maxUses === undefined
      ? null
      : Math.max(0, coupon.maxUses - usageCount - reservedCount));
  const auditEnabled = open && activeTab === "auditoria" && coupon !== null;
  const usageCapacity = usageCount + reservedCount;
  const couponStatus = coupon ? getCouponStatus(coupon) : "INACTIVE";

  useEffect(() => {
    if (!open || !coupon) return;
    setActiveTab(initialTab);
    setCode(coupon.code);
    setPercent(coupon.percent);
    setMaxUses(coupon.maxUses ? String(coupon.maxUses) : "");
    setDescription(coupon.description ?? "");
    setValidFrom(coupon.validFrom?.slice(0, 10) ?? "");
    setValidUntil(coupon.validUntil?.slice(0, 10) ?? "");
  }, [coupon, initialTab, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || !coupon) return null;

  const handleSave = async () => {
    await updateCoupon.mutateAsync({
      id: coupon.id,
      code: code.toUpperCase(),
      percent,
      maxUses: maxUses ? Number(maxUses) : null,
      description: description.trim() || null,
      validFrom: validFrom || null,
      validUntil: validUntil || null,
    });
    onClose();
  };

  const usagePercent = coupon.maxUses
    ? Math.min(100, (usageCapacity / coupon.maxUses) * 100)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Fechar edição de cupom"
      />
      <section
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface-container-highest shadow-[0_0_60px_rgba(213,0,249,0.2)] outline outline-1 outline-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-modal-title"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 p-5 md:p-6">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
              {canManage ? "Editar cupom" : "Detalhes do cupom"}
            </p>
            <h2
              id="coupon-modal-title"
              className="truncate text-2xl font-bold text-foreground"
            >
              {coupon.code}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {coupon.percent}% OFF ·{" "}
              {coupon.maxUses
                ? `${coupon.maxUses} usos globais`
                : "uso ilimitado"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-2 focus:outline-primary"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div
          className="overflow-x-auto border-b border-white/10"
          role="tablist"
          aria-label={`Editar cupom ${coupon.code}`}
        >
          <div className="flex min-w-max px-4 md:px-6">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`coupon-tab-${id}`}
                aria-selected={activeTab === id}
                aria-controls={`coupon-panel-${id}`}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition md:px-4 ${activeTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {activeTab === "dados" && (
            <div
              id="coupon-panel-dados"
              role="tabpanel"
              aria-labelledby="coupon-tab-dados"
              className="flex flex-col gap-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${couponStatusClass(couponStatus)}`}
                >
                  {couponStatusLabel(couponStatus)}
                </span>
                <span className="text-xs text-muted-foreground">
                  Usos confirmados: {usageCount}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Percentual">
                  <select
                    value={percent}
                    onChange={(event) => setPercent(Number(event.target.value))}
                    disabled={!canManage}
                    className={inputClass}
                  >
                    <>
                      {PERCENT_WHITELIST.map((value) => (
                        <option key={value} value={value}>
                          {value}% OFF
                        </option>
                      ))}
                    </>
                  </select>
                </Field>
                <Field label="Código" className="md:col-span-2">
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9_-]/g, ""),
                      )
                    }
                    maxLength={32}
                    disabled={!canManage}
                    className={`${inputClass} font-mono uppercase tracking-wider`}
                  />
                </Field>
              </div>
              <Field label="Limite global">
                <input
                  type="number"
                  min={1}
                  max={1_000_000}
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                  placeholder="Ilimitado"
                  disabled={!canManage}
                  className={inputClass}
                />
              </Field>
              <Field label="Descrição interna">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={!canManage}
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          )}

          {activeTab === "uso" && (
            <div
              id="coupon-panel-uso"
              role="tabpanel"
              aria-labelledby="coupon-tab-uso"
              className="flex flex-col gap-5"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Usos confirmados" value={String(usageCount)} />
                <Metric
                  label="Reservas pendentes"
                  value={String(reservedCount)}
                />
                <Metric
                  label="Limite global"
                  value={coupon.maxUses ? String(coupon.maxUses) : "Ilimitado"}
                />
                <Metric
                  label="Disponíveis"
                  value={
                    availableCount === null
                      ? "Sem limite"
                      : String(availableCount)
                  }
                />
              </div>
              {coupon.maxUses !== null && (
                <div>
                  <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                    <span>Ocupação do limite</span>
                    <span>{Math.round(usagePercent)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Confirmados e reservas vigentes ocupam a capacidade; uma
                    reserva só vira uso após o pagamento ser confirmado.
                  </p>
                </div>
              )}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  Aplicações recentes
                </h3>
                {usageQuery.isLoading ? (
                  <p className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground">
                    Carregando histórico de uso...
                  </p>
                ) : usageQuery.isError ? (
                  <div className="flex flex-col gap-3 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
                    <p>Não foi possível carregar o histórico de uso.</p>
                    <button
                      type="button"
                      onClick={() => usageQuery.refetch()}
                      className="self-start rounded-full bg-primary px-4 py-2 text-xs font-semibold text-black"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : usageQuery.data?.data.length ? (
                  <div className="overflow-x-auto rounded-xl outline outline-1 outline-white/10">
                    <table className="min-w-full text-left text-xs">
                      <thead className="bg-white/5 text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">
                            Usuário (ID público)
                          </th>
                          <th className="px-3 py-2 font-medium">Situação</th>
                          <th className="px-3 py-2 font-medium">Desconto</th>
                          <th className="px-3 py-2 font-medium">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageQuery.data.data.map((usage, index) => (
                          <tr
                            key={`${usage.userId}-${usage.usedAt}-${index}`}
                            className="border-t border-white/10 text-muted-foreground"
                          >
                            <td className="px-3 py-2 text-foreground">
                              {usage.userId}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${usageStatusClass(usage.usageStatus)}`}
                              >
                                {humanizeUsageStatus(usage.usageStatus)}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {formatCouponAmount(usage.discountAmount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2">
                              {formatCouponDate(usage.usedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="rounded-xl bg-white/5 p-4 text-sm text-muted-foreground">
                    Este cupom ainda não foi utilizado.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "validade" && (
            <div
              id="coupon-panel-validade"
              role="tabpanel"
              aria-labelledby="coupon-tab-validade"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <Field label="Válido de">
                <input
                  type="date"
                  value={validFrom}
                  onChange={(event) => setValidFrom(event.target.value)}
                  disabled={!canManage}
                  className={inputClass}
                />
              </Field>
              <Field label="Válido até">
                <input
                  type="date"
                  value={validUntil}
                  onChange={(event) => setValidUntil(event.target.value)}
                  disabled={!canManage}
                  className={inputClass}
                />
              </Field>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Datas vazias deixam o cupom sem restrição correspondente.
              </p>
            </div>
          )}

          {activeTab === "auditoria" && (
            <div
              id="coupon-panel-auditoria"
              role="tabpanel"
              aria-labelledby="coupon-tab-auditoria"
            >
              <CouponsAuditTable couponId={coupon.id} enabled={auditEnabled} />
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-white/10 bg-black/20 p-5 sm:flex-row sm:items-center sm:justify-end md:p-6">
          {canManage && (
            <button
              type="button"
              onClick={() =>
                toggleStatus.mutate(
                  { id: coupon.id, active: !coupon.active },
                  { onSuccess: onClose },
                )
              }
              disabled={toggleStatus.isPending}
              className="mr-auto inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              <Power className="h-4 w-4" aria-hidden="true" />
              {coupon.active ? "Desativar cupom" : "Ativar cupom"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-muted-foreground outline outline-1 outline-white/10 hover:bg-white/5 hover:text-foreground"
          >
            Fechar
          </button>
          {canManage && (
            <button
              type="button"
              onClick={handleSave}
              disabled={updateCoupon.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-black shadow-[0_0_18px_rgba(213,0,249,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {updateCoupon.isPending ? "Salvando..." : "Salvar alterações"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl bg-black px-4 py-3 text-sm text-foreground outline outline-1 outline-white/10 focus:outline-2 focus:outline-primary";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className ?? ""}`}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
function couponStatusLabel(status: Coupon["status"]): string {
  const labels: Record<Coupon["status"], string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    EXPIRED: "Expirado",
    EXHAUSTED: "Esgotado",
  };
  return labels[status];
}

function couponStatusClass(status: Coupon["status"]): string {
  const classes: Record<Coupon["status"], string> = {
    ACTIVE: "bg-primary/10 text-primary",
    INACTIVE: "bg-white/10 text-muted-foreground",
    EXPIRED: "bg-destructive/10 text-destructive",
    EXHAUSTED: "bg-amber-400/10 text-amber-300",
  };
  return classes[status];
}

function humanizeUsageStatus(status: CouponUsageStatus): string {
  if (status === "CONFIRMED") return "Confirmado";
  if (status === "RESERVED") return "Reserva pendente";
  return "Liberado";
}

function usageStatusClass(status: CouponUsageStatus): string {
  if (status === "CONFIRMED") return "bg-primary/10 text-primary";
  if (status === "RESERVED") return "bg-amber-400/10 text-amber-300";
  return "bg-white/10 text-muted-foreground";
}

function formatCouponAmount(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatCouponDate(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
