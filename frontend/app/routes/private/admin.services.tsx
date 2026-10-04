import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { Link } from "react-router";

import {
  useAdminServices,
  useCreateService,
  useDeleteService,
  useUpdateService,
  type AdminService,
  type CreateServiceInput,
} from "~/hooks/use-admin-services";
import { useToast } from "~/context/ToastContext";

const CATEGORIES = [
  { value: "FAST_TRACK", label: "Fast-Track" },
  { value: "COMPLIANCE", label: "Taxa de Compliance" },
  { value: "SEAL", label: "Selo de Verificada" },
  { value: "EXTENSION", label: "Prorrogação" },
  { value: "EARLY_ACCESS", label: "Acesso Antecipado" },
  { value: "OTHER", label: "Outros" },
] as const;

const PAYMENT_PURPOSES = [
  { value: "VERIFICATION_SEAL", label: "Selo de Verificada" },
  { value: "COMPLIANCE_FEE", label: "Taxa de Compliance" },
  { value: "TOKEN_RESERVATION", label: "Reserva de Token" },
  { value: "TOKEN_RESERVATION_EXTENSION", label: "Prorrogação de Reserva" },
  { value: "EARLY_ACCESS", label: "Acesso Antecipado" },
  { value: "SUBSCRIPTION", label: "Assinatura SaaS" },
] as const;

const CAMPAIGN_STATUSES = ["DRAFT", "OPEN", "PAUSED", "FUNDED", "CLOSED", "PAID_OUT"];

function formatBRL(value: string | number | null | undefined): string {
  if (value == null) return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

interface FormState extends Omit<CreateServiceInput, "price"> {
  price: string; // form usa string p/ input controlado
  requiresCampaignStatus: string[];
}

function emptyForm(): FormState {
  return {
    slug: "",
    name: "",
    description: "",
    shortDesc: "",
    category: "OTHER",
    paymentPurpose: "VERIFICATION_SEAL",
    price: "",
    currency: "BRL",
    highlight: false,
    available: true,
    order: 0,
    requiresCampaignStatus: [],
    endpoint: "",
  };
}

function parseBenefits(raw: string): string[] {
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseStatusList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Form de criar/editar serviço. Controlled, valida client-side basico.
 */
function ServiceForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
  submitLabel,
}: {
  initial: AdminService | null;
  onCancel: () => void;
  onSubmit: (input: CreateServiceInput) => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<FormState>(() => {
    if (!initial) return emptyForm();
    return {
      slug: initial.slug,
      name: initial.name,
      description: initial.description,
      shortDesc: initial.shortDesc ?? "",
      category: initial.category,
      paymentPurpose: initial.paymentPurpose,
      price: initial.price != null ? String(initial.price) : "",
      currency: initial.currency ?? "BRL",
      highlight: initial.highlight,
      available: initial.available,
      order: initial.order,
      requiresCampaignStatus: initial.requiresCampaignStatus
        ? (JSON.parse(initial.requiresCampaignStatus) as string[])
        : [],
      endpoint: initial.endpoint ?? "",
    };
  });

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.slug || !form.name || !form.description) {
      return;
    }
    onSubmit({
      slug: form.slug,
      name: form.name,
      description: form.description,
      shortDesc: form.shortDesc || undefined,
      benefits: parseBenefits(
        typeof form.benefits === "string"
          ? form.benefits
          : "",
      ),
      category: form.category,
      paymentPurpose: form.paymentPurpose,
      price: form.price ? Number(form.price) : undefined,
      currency: form.currency,
      highlight: form.highlight,
      available: form.available,
      order: form.order,
      requiresCampaignStatus: form.requiresCampaignStatus,
      endpoint: form.endpoint || undefined,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-card p-5 space-y-4"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground">
          {initial ? `Editar ${initial.name}` : "Novo serviço"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ✕ Fechar
        </button>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field label="Slug (único, kebab-case)" required>
          <input
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            required
            pattern="[a-z0-9-]+"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            placeholder="meu-servico-vip"
          />
        </Field>
        <Field label="Nome de exibição" required>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            placeholder="Meu Serviço Premium"
          />
        </Field>
        <Field label="Subtítulo (1 linha)" full>
          <input
            value={form.shortDesc}
            onChange={(e) => update("shortDesc", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            placeholder="Frase curta exibida nos cards"
          />
        </Field>
        <Field label="Descrição completa" required full>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            required
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 resize-none"
            placeholder="Descrição completa exibida no dialog de contratação"
          />
        </Field>
        <Field label="Benefícios (1 por linha)" full>
          <textarea
            value={
              Array.isArray(form.benefits)
                ? (form.benefits as string[]).join("\n")
                : typeof form.benefits === "string"
                  ? form.benefits
                  : ""
            }
            onChange={(e) => {
              // Mantém como string controlada para edição fácil (linha por linha).
              const arr = e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
              update("benefits", arr as unknown as FormState["benefits"]);
            }}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 resize-none"
            placeholder={"Aprovação em 24h\nDestaque no marketplace"}
          />
        </Field>
        <Field label="Categoria">
          <select
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="PaymentPurpose (criará Payment com este purpose)">
          <select
            value={form.paymentPurpose}
            onChange={(e) => update("paymentPurpose", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
          >
            {PAYMENT_PURPOSES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Preço (REAIS, vazio = variável)">
          <input
            value={form.price}
            onChange={(e) => update("price", e.target.value)}
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            placeholder="2500"
          />
        </Field>
        <Field label="Moeda">
          <input
            value={form.currency}
            onChange={(e) => update("currency", e.target.value.toUpperCase())}
            maxLength={3}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40 uppercase"
            placeholder="BRL"
          />
        </Field>
        <Field label="Ordem (menor = primeiro)">
          <input
            type="number"
            value={form.order}
            onChange={(e) => update("order", Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
          />
        </Field>
        <Field label="Endpoint BFF (path para mutation de contratação)">
          <input
            value={form.endpoint}
            onChange={(e) => update("endpoint", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            placeholder="/api/founder/services/seal"
          />
        </Field>
        <Field label="Status[] da campanha permitidos (CSV)" full>
          <input
            value={form.requiresCampaignStatus.join(", ")}
            onChange={(e) =>
              update("requiresCampaignStatus", parseStatusList(e.target.value))
            }
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/40"
            placeholder="DRAFT, OPEN, PAUSED"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Disponível para os status acima. Vazio = qualquer campanha.
          </p>
        </Field>
        <Field label="Flags">
          <div className="flex flex-wrap gap-4 text-xs">
            <label className="inline-flex items-center gap-2 text-foreground">
              <input
                type="checkbox"
                checked={form.highlight}
                onChange={(e) => update("highlight", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Destaque (exibe no topo + borda magenta)
            </label>
            <label className="inline-flex items-center gap-2 text-foreground">
              <input
                type="checkbox"
                checked={form.available}
                onChange={(e) => update("available", e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Disponível para os fundadores
            </label>
          </div>
        </Field>
      </div>

      <footer className="flex items-center justify-end gap-2 border-t border-white/5 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {submitLabel}
        </button>
      </footer>
    </form>
  );
}

function Field({
  label,
  required,
  full,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "md:col-span-2 space-y-1" : "space-y-1"}>
      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/** Card de serviço na tabela admin. */
function ServiceCard({
  service,
  onEdit,
  onDelete,
}: {
  service: AdminService;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article
      className={
        service.highlight
          ? "rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5 space-y-3"
          : "rounded-2xl border border-white/10 bg-card p-5 space-y-3"
      }
      data-testid={`admin-service-${service.slug}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-black text-foreground">
              {service.name}
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {service.slug}
            </span>
            {service.highlight && (
              <span className="inline-flex items-center rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
                Destaque
              </span>
            )}
            {service.available ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                Disponível
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground border border-white/10">
                <XCircle className="h-3 w-3" />
                Indisponível
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {service.shortDesc ?? service.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-xl font-black text-foreground tabular-nums">
            {formatBRL(service.price)}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {service.currency}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <dt className="text-muted-foreground uppercase tracking-widest text-[9px]">
            Categoria
          </dt>
          <dd className="text-foreground font-bold">{service.category}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground uppercase tracking-widest text-[9px]">
            PaymentPurpose
          </dt>
          <dd className="text-foreground font-bold">{service.paymentPurpose}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-muted-foreground uppercase tracking-widest text-[9px]">
            Endpoint / Status permitidos
          </dt>
          <dd className="text-foreground font-mono text-[10px] truncate">
            {service.endpoint ?? "—"} ·{" "}
            {service.requiresCampaignStatus
              ? (JSON.parse(service.requiresCampaignStatus) as string[]).join(", ")
              : "qualquer"}
          </dd>
        </div>
      </dl>

      <footer className="flex items-center justify-end gap-2 border-t border-white/5 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-300 hover:bg-rose-500/20 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Deletar
        </button>
      </footer>
    </article>
  );
}

export function AdminServicesOverview() {
  const { data: services, isLoading, isError } = useAdminServices();
  const createMut = useCreateService();
  const updateMut = useUpdateService();
  const deleteMut = useDeleteService();
  const toast = useToast();

  const [editing, setEditing] = useState<AdminService | null>(null);
  const [creating, setCreating] = useState(false);

  const ordered = useMemo(() => {
    if (!services) return [];
    return [...services].sort((a, b) => a.order - b.order || a.id - b.id);
  }, [services]);

  // Reset form quando termina o submit
  useEffect(() => {
    if (!createMut.isPending && !createMut.isError && createMut.isSuccess) {
      setCreating(false);
    }
  }, [createMut.isPending, createMut.isError, createMut.isSuccess]);

  useEffect(() => {
    if (
      !updateMut.isPending &&
      !updateMut.isError &&
      updateMut.isSuccess &&
      editing
    ) {
      setEditing(null);
    }
  }, [updateMut.isPending, updateMut.isError, updateMut.isSuccess, editing]);

  const handleCreate = (input: CreateServiceInput) => {
    createMut.mutate(input, {
      onSuccess: () => toast.showToast("Serviço criado!", "success"),
      onError: (err) => toast.showToast(err.message, "error"),
    });
  };

  const handleUpdate = (input: CreateServiceInput) => {
    if (!editing) return;
    updateMut.mutate(
      { id: editing.id, input },
      {
        onSuccess: () => toast.showToast("Serviço atualizado!", "success"),
        onError: (err) => toast.showToast(err.message, "error"),
      },
    );
  };

  const handleDelete = (svc: AdminService) => {
    if (!confirm(`Deletar o serviço "${svc.name}"? Esta ação é irreversível.`)) {
      return;
    }
    deleteMut.mutate(svc.id, {
      onSuccess: () => toast.showToast("Serviço deletado.", "success"),
      onError: (err) => toast.showToast(err.message, "error"),
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card/60 p-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando catálogo de serviços…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300 flex items-center gap-3">
        <AlertCircle className="h-4 w-4" />
        Não foi possível carregar os serviços.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-services-overview">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            admin · serviços
          </p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground">
            CATÁLOGO DE SERVIÇOS.
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os serviços que os fundadores podem contratar para suas
            startups. {ordered.length} serviço(s) cadastrado(s).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setCreating(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 transition-colors self-start md:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo serviço
        </button>
      </header>

      {creating && (
        <ServiceForm
          initial={null}
          onCancel={() => setCreating(false)}
          onSubmit={handleCreate}
          submitting={createMut.isPending}
          submitLabel="Criar"
        />
      )}

      {editing && (
        <ServiceForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSubmit={handleUpdate}
          submitting={updateMut.isPending}
          submitLabel="Salvar"
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ordered.map((svc) => (
          <ServiceCard
            key={svc.id}
            service={svc}
            onEdit={() => {
              setCreating(false);
              setEditing(svc);
            }}
            onDelete={() => handleDelete(svc)}
          />
        ))}
      </div>
    </div>
  );
}

export function meta() {
  return [{ title: "Catálogo de Serviços | Admin iSelfToken" }];
}

export default function AdminServicesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 space-y-6">
      <Link
        to="/admin/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-[11px] font-black uppercase tracking-widest transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
      </Link>
      <AdminServicesOverview />
    </div>
  );
}