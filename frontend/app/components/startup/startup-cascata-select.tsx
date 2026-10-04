import { AlertCircle, Check, ChevronDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useAreasByCategory } from "~/hooks/use-areas-by-category";
import { useCategories } from "~/hooks/use-categories";
import { startupInputClass } from "~/lib/form-styles";
import { cn } from "~/lib/utils";

export interface CascataSelectValue {
  categoryId: number | null;
  areaAtuacaoIds: number[];
}

export interface StartupCascataSelectProps {
  value: CascataSelectValue;
  onChange: (value: CascataSelectValue) => void;
  error?: string;
  disabled?: boolean;
  categoryId?: string;
  areaId?: string;
}

/** Categoria única com seleção múltipla pesquisável de áreas de atuação. */
export function StartupCascataSelect({
  value,
  onChange,
  error,
  disabled = false,
  categoryId: categoryIdProp,
  areaId: areaIdProp,
}: StartupCascataSelectProps) {
  const generatedId = useId();
  const categoryId = categoryIdProp ?? `categoria-${generatedId}`;
  const areaId = areaIdProp ?? `area-${generatedId}`;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: categories, isLoading: isLoadingCategories, error: errorCategories } = useCategories();
  const { data: areas, isLoading: isLoadingAreas, error: errorAreas } = useAreasByCategory(value.categoryId);

  const selectedIds = value.areaAtuacaoIds;
  const areaById = useMemo(() => new Map((areas ?? []).map((area) => [area.id, area])), [areas]);
  const availableIds = useMemo(() => new Set((areas ?? []).map((area) => area.id)), [areas]);
  const incompatible = selectedIds.some((id) => !availableIds.has(id));
  const filteredAreas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return areas ?? [];
    return (areas ?? []).filter((area) => area.nome.toLowerCase().includes(term));
  }, [areas, search]);
  const errorId = `${areaId}-error`;
  const selectedLabel = selectedIds.length
    ? `${selectedIds.length} ${selectedIds.length === 1 ? "área selecionada" : "áreas selecionadas"}`
    : "Selecione as áreas de atuação";

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const updateSelection = (areaIdValue: number) => {
    const selected = selectedIds.includes(areaIdValue);
    onChange({
      ...value,
      areaAtuacaoIds: selected
        ? selectedIds.filter((id) => id !== areaIdValue)
        : [...selectedIds, areaIdValue],
    });
  };

  const clearSelection = () => onChange({ ...value, areaAtuacaoIds: [] });
  const selectAll = () => onChange({ ...value, areaAtuacaoIds: (areas ?? []).map((area) => area.id) });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={categoryId} className="label-tag">Categoria</label>
          {isLoadingCategories ? (
            <div className={`${startupInputClass} flex items-center gap-2 opacity-60`}><Loader2 className="h-4 w-4 animate-spin" /><span>Carregando...</span></div>
          ) : errorCategories ? (
            <div className="flex items-center gap-2 text-sm text-red-400"><AlertCircle className="h-4 w-4" />Erro ao carregar categorias</div>
          ) : (
            <select
              id={categoryId}
              disabled={disabled}
              className={cn(startupInputClass, "disabled:cursor-not-allowed disabled:opacity-60")}
              value={value.categoryId ?? ""}
              onChange={(event) => {
                setIsOpen(false);
                setSearch("");
                onChange({ categoryId: event.target.value ? Number(event.target.value) : null, areaAtuacaoIds: [] });
              }}
            >
              <option value="" disabled>Selecione a categoria</option>
              {categories?.map((category) => <option key={category.id} value={category.id}>{category.nome}</option>)}
            </select>
          )}
        </div>

        <div ref={containerRef} className="relative space-y-2">
          <label htmlFor={areaId} className={cn("label-tag", (!value.categoryId || disabled) && "opacity-50")}>Áreas de atuação</label>
          {isLoadingAreas && value.categoryId ? (
            <div className={`${startupInputClass} flex items-center gap-2 opacity-60`}><Loader2 className="h-4 w-4 animate-spin" /><span>Carregando áreas...</span></div>
          ) : errorAreas ? (
            <div className="flex items-center gap-2 text-sm text-red-400"><AlertCircle className="h-4 w-4" />Erro ao carregar áreas</div>
          ) : !value.categoryId ? (
            <div className={`${startupInputClass} flex items-center justify-between opacity-50`}><span>Selecione a categoria primeiro</span><ChevronDown className="h-4 w-4" /></div>
          ) : !areas?.length ? (
            <div className={`${startupInputClass} opacity-50`}>Nenhuma área cadastrada</div>
          ) : (
            <>
              <button
                id={areaId}
                type="button"
                disabled={disabled}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-describedby={error || incompatible ? errorId : undefined}
                aria-invalid={Boolean(error || incompatible)}
                onClick={() => setIsOpen((open) => !open)}
                className={cn(startupInputClass, "flex min-h-12 w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60", (error || incompatible) && "border-red-500")}
              >
                <span className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {selectedIds.length === 0 ? <span className="text-muted-foreground">{selectedLabel}</span> : (
                    <>
                      {selectedIds.slice(0, 2).map((id) => (
                        <span key={id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                          <span className="truncate">{areaById.get(id)?.nome ?? `Área ${id}`}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Remover ${areaById.get(id)?.nome ?? "área"}`}
                            onClick={(event) => { event.stopPropagation(); updateSelection(id); }}
                            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); updateSelection(id); } }}
                          ><X className="h-3 w-3" /></span>
                        </span>
                      ))}
                      {selectedIds.length > 2 && <span className="rounded-full border border-border bg-accent/40 px-2 py-1 text-xs font-semibold text-muted-foreground">+{selectedIds.length - 2}</span>}
                    </>
                  )}
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-2xl shadow-black/30">
                  <div className="flex items-center gap-2 rounded-xl border border-border px-3 text-muted-foreground">
                    <Search className="h-4 w-4 shrink-0" />
                    <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar área..." className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                    {search && <button type="button" onClick={() => setSearch("")} aria-label="Limpar busca"><X className="h-4 w-4" /></button>}
                  </div>
                  <div className="flex items-center justify-between px-2 py-2 text-xs">
                    <span className="text-muted-foreground">{selectedIds.length} de {areas.length} selecionadas</span>
                    <div className="flex gap-2"><button type="button" onClick={selectAll} className="font-semibold text-primary hover:underline">Selecionar todas</button><button type="button" onClick={clearSelection} className="font-semibold text-muted-foreground hover:text-foreground">Limpar</button></div>
                  </div>
                  <div role="listbox" aria-label="Áreas de atuação" aria-multiselectable="true" className="max-h-56 space-y-1 overflow-y-auto">
                    {filteredAreas.length ? filteredAreas.map((area) => {
                      const selected = selectedIds.includes(area.id);
                      return <button key={area.id} type="button" role="option" aria-selected={selected} onClick={() => updateSelection(area.id)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition", selected ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")}><span className={cn("flex h-4 w-4 items-center justify-center rounded border", selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50")}>{selected && <Check className="h-3 w-3" />}</span><span className="flex-1">{area.nome}</span>{selected && <span className="text-xs text-primary">Selecionada</span>}</button>;
                    }) : <p className="px-3 py-5 text-center text-sm text-muted-foreground">Nenhuma área encontrada.</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {(error || incompatible) && <div id={errorId} role="alert" className="flex items-start gap-2 text-sm text-red-400"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error ?? "As áreas selecionadas não pertencem à categoria escolhida."}</span></div>}
      {value.categoryId && areas?.length ? <p className="text-xs text-muted-foreground">Pesquise e selecione uma ou mais áreas de atuação.</p> : null}
    </div>
  );
}
