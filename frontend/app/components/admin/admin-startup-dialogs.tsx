import { Form } from "react-router";
import { Plus, Trash2, X } from "lucide-react";

interface StartupDialogItem {
  id: number | string;
  nome: string;
  segmento?: string | null;
  area_atuacao?: string | null;
  estagio?: string | null;
  score?: number | null;
  razao_social?: string | null;
  cnpj?: string | null;
  descricao?: string | null;
  site?: string | null;
  telefone?: string | null;
}

interface SealCatalogItem {
  id: number;
  slug: string;
  name: string;
  category: string;
}

interface AssignedSeal {
  id: number;
  slug: string;
  name: string;
}

interface AdminStartupDialogsProps {
  editando: StartupDialogItem | null;
  rejeitando: { id: number | string; nome: string } | null;
  gerenciandoSelos: StartupDialogItem | null;
  sealCatalog: SealCatalogItem[];
  assignedSeals: AssignedSeal[];
  sealsLoading: boolean;
  enviando: boolean;
  onCloseEdit: () => void;
  onCloseReject: () => void;
  onCloseSeals: () => void;
}

export function AdminStartupDialogs({
  editando,
  rejeitando,
  gerenciandoSelos,
  sealCatalog,
  assignedSeals,
  sealsLoading,
  enviando,
  onCloseEdit,
  onCloseReject,
  onCloseSeals,
}: AdminStartupDialogsProps) {
  return (
    <>
      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-startup-title"
        >
          <Form
            method="post"
            className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="edit-startup-title" className="text-lg font-semibold text-foreground">
                  Editar startup
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  #{String(editando.id).padStart(6, "0")}
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseEdit}
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                aria-label="Fechar edição"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <input type="hidden" name="startupId" value={editando.id} />
            <input type="hidden" name="intent" value="edit-startup" />
            <div className="space-y-2">
              <label htmlFor="startup-name" className="text-xs font-semibold text-muted-foreground">
                Nome
              </label>
              <input
                id="startup-name"
                name="nome"
                required
                defaultValue={editando.nome}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="startup-razao" className="text-xs font-semibold text-muted-foreground">
                  Razão social
                </label>
                <input
                  id="startup-razao"
                  name="razaoSocial"
                  defaultValue={editando.razao_social ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="startup-cnpj" className="text-xs font-semibold text-muted-foreground">
                  CNPJ
                </label>
                <input
                  id="startup-cnpj"
                  name="cnpj"
                  defaultValue={editando.cnpj ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
                <p className="text-[10px] text-muted-foreground">
                  Bloqueado após rodada finalizada (CLOSED/FUNDED).
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="startup-descricao" className="text-xs font-semibold text-muted-foreground">
                Descrição
              </label>
              <textarea
                id="startup-descricao"
                name="descricao"
                rows={3}
                defaultValue={editando.descricao ?? ""}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="startup-site" className="text-xs font-semibold text-muted-foreground">
                  Site
                </label>
                <input
                  id="startup-site"
                  name="site"
                  defaultValue={editando.site ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="startup-telefone" className="text-xs font-semibold text-muted-foreground">
                  Telefone
                </label>
                <input
                  id="startup-telefone"
                  name="telefone"
                  defaultValue={editando.telefone ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="startup-segment" className="text-xs font-semibold text-muted-foreground">
                  Segmento
                </label>
                <input
                  id="startup-segment"
                  name="area_atuacao"
                  defaultValue={editando.segmento ?? editando.area_atuacao ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="startup-stage" className="text-xs font-semibold text-muted-foreground">
                  Estágio
                </label>
                <input
                  id="startup-stage"
                  name="estagio"
                  defaultValue={editando.estagio ?? ""}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="startup-score" className="text-xs font-semibold text-muted-foreground">
                Score de marketplace (0–100)
              </label>
              <input
                id="startup-score"
                name="score"
                type="number"
                min={0}
                max={100}
                defaultValue={editando.score ?? 0}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
              <p className="text-xs text-muted-foreground">
                Usado para ordenar a vitrine “Destaques”.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onCloseEdit}
                className="flex-1 rounded-full border border-white/10 py-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 rounded-full bg-primary py-3 text-xs font-bold text-black transition hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                Salvar
              </button>
            </div>
          </Form>
        </div>
      )}

      {gerenciandoSelos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="startup-seals-title"
        >
          <div className="max-h-[85vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="startup-seals-title" className="text-lg font-semibold text-foreground">
                  Selos da startup
                </h3>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {gerenciandoSelos.nome}
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseSeals}
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                aria-label="Fechar selos"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {sealsLoading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Carregando selos…
              </p>
            ) : sealCatalog.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Catálogo de selos indisponível.
              </p>
            ) : (
              <div className="space-y-2">
                {sealCatalog.map((seal) => {
                  const aplicado = assignedSeals.find(
                    (item) => item.slug === seal.slug,
                  );
                  return (
                    <div
                      key={seal.slug}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {seal.name}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                          {seal.category}
                        </p>
                      </div>
                      <Form method="post" className="shrink-0">
                        <input
                          type="hidden"
                          name="startupId"
                          value={gerenciandoSelos.id}
                        />
                        {aplicado ? (
                          <>
                            <input type="hidden" name="intent" value="remove-seal" />
                            <input type="hidden" name="sealId" value={aplicado.id} />
                            <button
                              type="submit"
                              disabled={enviando}
                              className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-destructive transition hover:bg-destructive hover:text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/70"
                              aria-label={`Remover selo ${seal.name}`}
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                              Remover
                            </button>
                          </>
                        ) : (
                          <>
                            <input type="hidden" name="intent" value="assign-seal" />
                            <input type="hidden" name="sealSlug" value={seal.slug} />
                            <button
                              type="submit"
                              disabled={enviando}
                              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-black disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                              aria-label={`Aplicar selo ${seal.name}`}
                            >
                              <Plus className="h-3 w-3" aria-hidden="true" />
                              Aplicar
                            </button>
                          </>
                        )}
                      </Form>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={onCloseSeals}
              className="w-full rounded-full border border-white/10 py-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {rejeitando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-startup-title"
        >
          <Form
            method="post"
            className="w-full max-w-md space-y-6 rounded-2xl border border-white/10 bg-[#121212] p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="reject-startup-title" className="text-lg font-semibold text-foreground">
                  Rejeitar startup
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">{rejeitando.nome}</p>
              </div>
              <button
                type="button"
                onClick={onCloseReject}
                className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                aria-label="Fechar rejeição"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <input type="hidden" name="startupId" value={rejeitando.id} />
            <input type="hidden" name="intent" value="reject-startup" />
            <div className="space-y-2">
              <label htmlFor="rejection-justification" className="text-xs font-semibold text-muted-foreground">
                Motivo da rejeição <span className="text-destructive">(obrigatório)</span>
              </label>
              <textarea
                id="rejection-justification"
                name="justification"
                required
                rows={4}
                placeholder="Ex.: documentação societária incompleta…"
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCloseReject}
                className="flex-1 rounded-full border border-white/10 py-3 text-xs font-semibold text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={enviando}
                className="flex-1 rounded-full bg-destructive py-3 text-xs font-bold text-white transition hover:bg-destructive/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/70"
              >
                Confirmar rejeição
              </button>
            </div>
          </Form>
        </div>
      )}
    </>
  );
}
