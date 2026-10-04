import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DEFAULT_BENEFITS } from "~/lib/plan-types";
import type { PlanPayload } from "~/hooks/use-plans-admin";
import { cn } from "~/lib/utils";

import type { PlanItem } from "~/lib/plan-types";

interface PlanEditFormProps {
  initial?: Partial<PlanPayload> | PlanItem;
  /** Quando presente, indica modo de edição (slug fica disabled). */
  editingId?: number;
  onSubmit: (data: PlanPayload) => void;
  onCancel: () => void;
  submitting: boolean;
  error?: string | null;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

const ICON_OPTIONS = [
  { value: "star", label: "Estrela" },
  { value: "shield", label: "Escudo" },
  { value: "rocket", label: "Foguete" },
  { value: "briefcase", label: "Briefcase" },
  { value: "crown", label: "Coroa" },
  { value: "zap", label: "Raio" },
] as const;

const PERIODO_OPTIONS = [
  { value: "/mes", label: "Mensal" },
  { value: "/trimestre", label: "Trimestral" },
  { value: "/semestre", label: "Semestral" },
  { value: "/ano", label: "Anual" },
] as const;

/**
 * Form de criação/edição de plano com lista dinâmica de benefícios
 * (add/remove) + chips de sugestões rápidas (DEFAULT_BENEFITS).
 */
export function PlanEditForm({
  initial,
  editingId,
  onSubmit,
  onCancel,
  submitting,
  error,
}: PlanEditFormProps) {
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [preco, setPreco] = useState(initial?.preco ?? 0);
  const [periodoMeses, setPeriodoMeses] = useState(initial?.periodoMeses ?? 12);
  const [periodo, setPeriodo] = useState(initial?.periodo ?? "/ano");
  const [icon, setIcon] = useState(initial?.icon ?? "star");
  const [beneficios, setBeneficios] = useState<string[]>(
  initial?.beneficios ?? [],
);
  const [novoBeneficio, setNovoBeneficio] = useState("");
  const [visivel, setVisivel] = useState(initial?.visivel ?? true);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [recomendado, setRecomendado] = useState(initial?.recomendado ?? false);
  const [textoBotao, setTextoBotao] = useState(initial?.textoBotao ?? "");

  // Auto-gerar slug a partir do nome se o usuário não tiver editado o slug
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(nome));
  }, [nome, slugTouched]);

  function addBeneficio() {
    const v = novoBeneficio.trim();
    if (!v || beneficios.includes(v)) return;
    setBeneficios((prev) => [...prev, v]);
    setNovoBeneficio("");
  }

  function removeBeneficio(idx: number) {
    setBeneficios((prev) => prev.filter((_, i) => i !== idx));
  }

  function addSuggestion(b: string) {
    if (beneficios.includes(b)) return;
    setBeneficios((prev) => [...prev, b]);
  }

  const canSubmit =
    nome.length >= 3 &&
    /^[a-z0-9_]+$/.test(slug) &&
    Number(preco) > 0 &&
    Number(periodoMeses) > 0 &&
    beneficios.length >= 1 &&
    !submitting;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      nome,
      slug,
      descricao: descricao || undefined,
      preco: Number(preco),
      periodoMeses: Number(periodoMeses) || 12,
      periodo,
      icon,
      beneficios,
      textoBotao: textoBotao.trim() || undefined,
      visivel,
      isActive,
      recomendado,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Identidade */}
      <fieldset className="space-y-4">
        <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Identidade
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome">
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              minLength={3}
              maxLength={50}
              placeholder="Ex.: Plano Investidor Pro"
              className="ds-form-input w-full"
            />
          </Field>
          <Field label="Slug (único, kebab-case)">
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              required
              pattern="[a-z0-9_]+"
              placeholder="plano_investidor_pro"
              disabled={Boolean(editingId)}
              title={editingId ? "Slug não pode ser alterado após criação" : undefined}
              className="ds-form-input w-full font-mono disabled:opacity-60"
            />
          </Field>
        </div>
        <Field label="Descrição (opcional, max 500 chars)">
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Descrição exibida para os usuários no /pricing"
            className="ds-form-input w-full resize-none"
          />
        </Field>
      </fieldset>

      {/* Financeiro */}
      <fieldset className="space-y-4">
        <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Financeiro
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Preço (R$)">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={preco}
              onChange={(e) => setPreco(Number(e.target.value))}
              required
              className="ds-form-input w-full"
            />
          </Field>
          <Field label="Período (meses)">
            <select
              value={periodoMeses}
              onChange={(e) => setPeriodoMeses(Number(e.target.value))}
              className="ds-form-input w-full"
            >
              {[1, 3, 6, 12, 24].map((n) => (
                <option key={n} value={n}>
                  {n} meses
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rótulo do Período">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="ds-form-input w-full"
            >
              {PERIODO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </fieldset>

      {/* Apresentação */}
      <fieldset className="space-y-4">
        <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Apresentação
        </legend>
        <Field label="Texto do botão de aquisição (opcional)">
          <input
            type="text"
            value={textoBotao}
            onChange={(e) => setTextoBotao(e.target.value)}
            maxLength={60}
            placeholder="Ex.: Começar agora"
            className="ds-form-input w-full"
          />
        </Field>
        <Field label="Ícone (Lucide name)">
          <select
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className="ds-form-input w-full"
          >
            {ICON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      {/* Benefícios dinâmicos */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Benefícios ({beneficios.length})
        </legend>
        <div className="space-y-2">
          {beneficios.map((b, idx) => (
            <div
              key={`${idx}-${b}`}
              className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-xl px-3 py-2"
            >
              <span className="text-[10px] font-mono text-muted-foreground/50 w-6 tabular-nums">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm">{b}</span>
              <button
                type="button"
                onClick={() => removeBeneficio(idx)}
                aria-label="Remover benefício"
                className="text-red-400 hover:text-red-300 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {beneficios.length === 0 && (
            <p className="text-xs text-muted-foreground italic text-center py-2">
              Nenhum benefício adicionado ainda.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={novoBeneficio}
            onChange={(e) => setNovoBeneficio(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addBeneficio();
              }
            }}
            placeholder="Novo benefício (Enter para adicionar)"
            className="ds-form-input flex-1"
          />
          <button
            type="button"
            onClick={addBeneficio}
            disabled={!novoBeneficio.trim()}
            className="px-3 py-2 rounded-lg bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-foreground/80 font-bold uppercase mr-1 self-center">
            Sugestões:
          </span>
          {DEFAULT_BENEFITS.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => addSuggestion(b)}
              disabled={beneficios.includes(b)}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] border transition-all",
                beneficios.includes(b)
                  ? "bg-white/5 text-muted-foreground/40 border-white/5 cursor-not-allowed"
                  : "bg-accent/30 text-foreground border-white/10 hover:bg-primary/15 hover:border-primary/40",
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Visibilidade */}
      <fieldset className="space-y-3">
        <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Visibilidade
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ToggleField
            label="Visível no /pricing"
            description="Quando false, plano some do catálogo público"
            checked={visivel}
            onChange={setVisivel}
          />
          <ToggleField
            label="Ativo"
            description="Permite novas assinaturas"
            checked={isActive}
            onChange={setIsActive}
          />
          <ToggleField
            label="Recomendado"
            description="Destaque visual no card"
            checked={recomendado}
            onChange={setRecomendado}
          />
        </div>
      </fieldset>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-full bg-white/5 text-muted-foreground hover:text-foreground transition-all text-[11px] font-black uppercase tracking-widest"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-1 py-3 rounded-full bg-primary text-black hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-[11px] font-black uppercase tracking-widest"
        >
          {submitting
            ? "Salvando…"
            : editingId
              ? "Salvar alterações"
              : "Criar plano"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "p-4 rounded-xl border text-left transition-all space-y-1",
        checked
          ? "bg-primary/10 border-primary/40"
          : "bg-accent/15 border-white/10 hover:border-white/30",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">{label}</span>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
            checked
              ? "bg-primary text-black border-primary"
              : "bg-white/5 text-muted-foreground border-white/10",
          )}
        >
          {checked ? "ON" : "OFF"}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">{description}</p>
    </button>
  );
}
