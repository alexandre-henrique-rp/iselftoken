import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  adminTaxonomyQueryOptions,
  type AdminTaxonomyArea,
  type AdminTaxonomyCategory,
} from "~/lib/queries";
import { cn } from "~/lib/utils";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/60";

export function AdminTaxonomyPanel() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useQuery(adminTaxonomyQueryOptions);
  const [categoryName, setCategoryName] = useState("");
  const [areaDrafts, setAreaDrafts] = useState<Record<number, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function mutate(body: Record<string, unknown>) {
    const key = `${body.type}:${body.id ?? body.categoryId ?? "new"}`;
    setBusyKey(key);
    try {
      const res = await fetch("/api/admin/config/categories", {
        method: body.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || result?.error) throw new Error(result?.message ?? "Falha ao salvar");
      toast.success("Taxonomia atualizada.");
      void queryClient.invalidateQueries({ queryKey: adminTaxonomyQueryOptions.queryKey });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar taxonomia.");
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  async function deactivate(type: "category" | "area", id: number) {
    setBusyKey(`${type}:${id}`);
    try {
      const res = await fetch("/api/admin/config/categories", {
        method: "DELETE",
        headers: { "content-type": "application/json", accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ type, id }),
      });
      const result = await res.json().catch(() => null);
      if (!res.ok || result?.error) throw new Error(result?.message ?? "Falha ao desativar");
      toast.success("Item desativado.");
      void queryClient.invalidateQueries({ queryKey: adminTaxonomyQueryOptions.queryKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao desativar item.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section className="space-y-5" aria-labelledby="taxonomy-title">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Layers3 className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 id="taxonomy-title" className="text-lg font-black text-foreground">
            Categorias e áreas de atuação
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Gerencie as opções exibidas nos cadastros e nas edições de startups.
            A exclusão é uma desativação para preservar startups existentes.
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:flex-row"
        onSubmit={async (event) => {
          event.preventDefault();
          if (categoryName.trim() && await mutate({ type: "category", nome: categoryName.trim() })) {
            setCategoryName("");
          }
        }}
      >
        <input
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          placeholder="Nova categoria (ex.: Tecnologia)"
          className={cn(inputClass, "sm:flex-1")}
          aria-label="Nome da nova categoria"
        />
        <button
          type="submit"
          disabled={!categoryName.trim() || busyKey === "category:new"}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar categoria
        </button>
      </form>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      ) : isError ? (
        <p className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
          Não foi possível carregar categorias e áreas.
        </p>
      ) : data.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
          Nenhuma categoria cadastrada.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((category) => (
            <TaxonomyCategoryCard
              key={category.id}
              category={category}
              areaDraft={areaDrafts[category.id] ?? ""}
              onAreaDraftChange={(value) =>
                setAreaDrafts((current) => ({ ...current, [category.id]: value }))
              }
              busyKey={busyKey}
              onMutate={mutate}
              onDeactivate={deactivate}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TaxonomyCategoryCard({
  category,
  areaDraft,
  onAreaDraftChange,
  busyKey,
  onMutate,
  onDeactivate,
}: {
  category: AdminTaxonomyCategory;
  areaDraft: string;
  onAreaDraftChange: (value: string) => void;
  busyKey: string | null;
  onMutate: (body: Record<string, unknown>) => Promise<boolean>;
  onDeactivate: (type: "category" | "area", id: number) => Promise<void>;
}) {
  const [name, setName] = useState(category.nome);
  return (
    <article className="rounded-2xl border border-white/10 bg-card p-4 shadow-lg">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={cn(inputClass, "font-bold")}
          aria-label={`Nome da categoria ${category.nome}`}
        />
        <button
          type="button"
          onClick={() => onMutate({ type: "category", id: category.id, nome: name })}
          disabled={!name.trim() || busyKey === `category:${category.id}`}
          className="rounded-xl border border-primary/20 bg-primary/10 px-3 text-primary disabled:opacity-40"
          aria-label={`Salvar categoria ${category.nome}`}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onDeactivate("category", category.id)}
          disabled={busyKey === `category:${category.id}`}
          className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 text-destructive disabled:opacity-40"
          aria-label={`Desativar categoria ${category.nome}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4 space-y-2 border-l border-white/10 pl-4">
        {category.areas.filter((area) => area.ativo).map((area) => (
          <AreaRow
            key={area.id}
            area={area}
            busyKey={busyKey}
            onMutate={onMutate}
            onDeactivate={onDeactivate}
          />
        ))}
        <form
          className="flex gap-2 pt-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (areaDraft.trim() && await onMutate({ type: "area", categoryId: category.id, nome: areaDraft.trim() })) {
              onAreaDraftChange("");
            }
          }}
        >
          <input
            value={areaDraft}
            onChange={(event) => onAreaDraftChange(event.target.value)}
            placeholder="Nova área de atuação"
            className={cn(inputClass, "text-xs")}
            aria-label={`Nova área para ${category.nome}`}
          />
          <button
            type="submit"
            disabled={!areaDraft.trim() || busyKey === "area:new"}
            className="rounded-xl border border-primary/20 bg-primary/10 px-3 text-primary disabled:opacity-40"
            aria-label={`Adicionar área em ${category.nome}`}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </article>
  );
}

function AreaRow({
  area,
  busyKey,
  onMutate,
  onDeactivate,
}: {
  area: AdminTaxonomyArea;
  busyKey: string | null;
  onMutate: (body: Record<string, unknown>) => Promise<boolean>;
  onDeactivate: (type: "category" | "area", id: number) => Promise<void>;
}) {
  const [name, setName] = useState(area.nome);
  return (
    <div className="flex gap-2">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={cn(inputClass, "text-xs")}
        aria-label={`Nome da área ${area.nome}`}
      />
      <button
        type="button"
        onClick={() => onMutate({ type: "area", id: area.id, nome: name })}
        disabled={!name.trim() || busyKey === `area:${area.id}`}
        className="rounded-xl border border-primary/20 bg-primary/10 px-3 text-primary disabled:opacity-40"
        aria-label={`Salvar área ${area.nome}`}
      >
        <Save className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onDeactivate("area", area.id)}
        disabled={busyKey === `area:${area.id}`}
        className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 text-destructive disabled:opacity-40"
        aria-label={`Desativar área ${area.nome}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
