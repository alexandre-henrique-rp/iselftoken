import type { Route } from "./+types/admin.plans";
import { useState } from "react";
import { toast } from "sonner";
import {
  useAdminPlansQuery,
  useUpdatePlanMutation,
} from "~/hooks/use-plans-admin";
import type { PlanItem } from "~/lib/plan-types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Planos | Admin | iSelfToken" },
    {
      name: "description",
      content:
        "Edite o conteúdo (copy, preço, benefícios) dos planos exibidos em /pricing.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  void request;
  return null;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v);
  return 0;
}

/**
 * Página dedicada para o ADMIN editar o CONTEÚDO dos cards exibidos em
 * /pricing. Mantém a gestão completa de planos (criar/desativar/estatísticas)
 * no painel `/financeiro/plans` — aqui o foco é o que o investidor vê.
 */
export default function AdminPlansPage() {
  const plansQuery = useAdminPlansQuery({ limit: 100 });
  const updateMutation = useUpdatePlanMutation();
  const plans: PlanItem[] = plansQuery.data?.data ?? [];

  return (
    <div className="space-y-8 px-4 md:px-8 py-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-black tracking-tight">Conteúdo dos Planos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edite o que aparece nos cards de{" "}
          <a className="text-primary underline" href="/pricing" target="_blank">
            /pricing
          </a>
          : eyebrow, título, descrição, preço, botão e benefícios. Mudanças refletem
          imediatamente após salvar.
        </p>
      </header>

      {plansQuery.isLoading ? (
        <div className="text-center text-muted-foreground py-12">Carregando...</div>
      ) : plans.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          Nenhum plano cadastrado.
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((plano) => (
            <PlanEditCard
              key={plano.id}
              plano={plano}
              isSubmitting={
                updateMutation.isPending && updateMutation.variables?.id === plano.id
              }
              onSubmit={(input) =>
                updateMutation.mutateAsync({ id: plano.id, ...input })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PlanEditCardProps {
  plano: PlanItem;
  isSubmitting: boolean;
  onSubmit: (input: {
    nome: string;
    descricao: string;
    preco: number;
    periodoMeses: number;
    beneficios: string[];
    textoBotao?: string;
    visivel: boolean;
    recomendado: boolean;
  }) => Promise<unknown>;
}

function PlanEditCard({ plano, isSubmitting, onSubmit }: PlanEditCardProps) {
  const [nome, setNome] = useState(plano.nome);
  const [descricao, setDescricao] = useState(plano.descricao ?? "");
  const [preco, setPreco] = useState(toNumber(plano.preco));
  const [periodoMeses, setPeriodoMeses] = useState(plano.periodoMeses);
  const [beneficios, setBeneficios] = useState<string[]>(
    plano.beneficios ?? [],
  );
  const [visivel, setVisivel] = useState(plano.visivel);
  const [recomendado, setRecomendado] = useState(plano.recomendado);
  const [textoBotao, setTextoBotao] = useState(plano.textoBotao ?? "");

  const dirty =
    nome !== plano.nome ||
    descricao !== (plano.descricao ?? "") ||
    preco !== toNumber(plano.preco) ||
    periodoMeses !== plano.periodoMeses ||
    visivel !== plano.visivel ||
    recomendado !== plano.recomendado ||
    textoBotao !== (plano.textoBotao ?? "") ||
    JSON.stringify(beneficios) !== JSON.stringify(plano.beneficios ?? []);

  const handleBeneficio = (i: number, value: string) => {
    const next = [...beneficios];
    next[i] = value;
    setBeneficios(next);
  };

  const handleAddBeneficio = () => setBeneficios([...beneficios, ""]);
  const handleRemoveBeneficio = (i: number) =>
    setBeneficios(beneficios.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit({
        nome: nome.trim(),
        descricao: descricao.trim(),
        preco,
        periodoMeses,
        beneficios: beneficios.map((b) => b.trim()).filter(Boolean),
        textoBotao: textoBotao.trim() || undefined,
        visivel,
        recomendado,
      });
      toast.success(`Plano "${nome}" atualizado.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar plano.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-card p-5 md:p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Slug
          </span>
          <h2 className="text-lg font-black">{plano.slug}</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          ID #{plano.id}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Título exibido no card
          </span>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-xl bg-surface border border-white/10 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Preço (R$/ano)
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={preco}
            onChange={(e) => setPreco(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-surface border border-white/10 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Texto do botão de aquisição (opcional)
        </span>
        <input
          type="text"
          value={textoBotao}
          onChange={(e) => setTextoBotao(e.target.value)}
          maxLength={60}
          placeholder="Ex.: Começar agora"
          className="mt-1 w-full rounded-xl bg-surface border border-white/10 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
        />
      </label>

      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Descrição
        </span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl bg-surface border border-white/10 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none resize-y"
        />
      </label>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Período (meses)
          </span>
          <input
            type="number"
            min="1"
            max="60"
            value={periodoMeses}
            onChange={(e) => setPeriodoMeses(Number(e.target.value))}
            className="mt-1 w-full rounded-xl bg-surface border border-white/10 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
          />
        </label>

        <div className="flex items-center gap-6 pt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visivel}
              onChange={(e) => setVisivel(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-xs font-bold uppercase tracking-wider">
              Visível
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={recomendado}
              onChange={(e) => setRecomendado(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-xs font-bold uppercase tracking-wider">
              Recomendado
            </span>
          </label>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Benefícios (lista)
          </span>
          <button
            type="button"
            onClick={handleAddBeneficio}
            className="text-xs font-bold uppercase text-primary hover:underline"
          >
            + Adicionar
          </button>
        </div>
        <ul className="mt-2 space-y-2">
          {beneficios.map((b, i) => (
            <li key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={b}
                onChange={(e) => handleBeneficio(i, e.target.value)}
                className="flex-1 rounded-lg bg-surface border border-white/10 px-3 py-1.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none"
              />
              <button
                type="button"
                onClick={() => handleRemoveBeneficio(i)}
                aria-label="Remover benefício"
                className="text-xs text-muted-foreground hover:text-rose-400"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
        {dirty ? (
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
            Alterações não salvas
          </span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Sincronizado
          </span>
        )}
        <button
          type="submit"
          disabled={!dirty || isSubmitting}
          className="px-5 py-2 rounded-xl bg-primary text-black font-black uppercase tracking-wider text-xs hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSubmitting ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
