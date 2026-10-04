/**
 * Editor de Post de Transparencia (criar ou editar).
 *
 * Form: type + title + content (markdown) + periodMonth + periodYear.
 * Conteudo eh sanitizado no backend (markdown whitelist).
 */
import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import {
  TRANSPARENCY_POST_TYPES,
  type TransparencyPost,
  type TransparencyPostType,
} from "~/types/transparency";
import { PERIOD_LABELS, TYPE_LABELS_PT } from "./_shared";

interface PostEditorProps {
  startupId: number;
  startupNome: string;
  post: TransparencyPost | null;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    content: string;
    type: TransparencyPostType;
    periodMonth?: number;
    periodYear?: number;
  }) => void;
  isSubmitting: boolean;
}

export function PostEditorView({
  startupId: _startupId,
  startupNome: _startupNome,
  post,
  onClose,
  onSubmit,
  isSubmitting,
}: PostEditorProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [type, setType] = useState<TransparencyPostType>(
    post?.type ?? "GENERAL",
  );
  const [periodMonth, setPeriodMonth] = useState<string>(
    post?.periodMonth ? String(post.periodMonth) : "",
  );
  const [periodYear, setPeriodYear] = useState<string>(
    post?.periodYear ? String(post.periodYear) : "",
  );

  const canSubmit =
    title.trim().length >= 3 && content.trim().length >= 10 && !isSubmitting;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      type,
      periodMonth: periodMonth ? Number(periodMonth) : undefined,
      periodYear: periodYear ? Number(periodYear) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Cancelar
      </button>

      <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground leading-tight">
        {post ? "Editar post" : "Nova atualizacao"}
      </h1>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        {/* Tipo */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransparencyPostType)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          >
            {TRANSPARENCY_POST_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS_PT[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Titulo */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Titulo
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Ex: Relatorio Financeiro - Q3 2026"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Conteudo markdown */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Conteudo (markdown)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder={"## Resumo\n\n- Ponto 1\n- Ponto 2\n\n**Numeros:** ..."}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            Suporta markdown: # titulos, **bold**, *italic*, - listas,
            [links](url), `code`. HTML e scripts sao removidos por seguranca.
          </p>
        </div>

        {/* Periodo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Mes (opcional)
            </label>
            <select
              value={periodMonth}
              onChange={(e) => setPeriodMonth(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">—</option>
              {PERIOD_LABELS.map((m, i) => (
                <option key={i + 1} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              Ano (opcional)
            </label>
            <input
              type="number"
              value={periodYear}
              onChange={(e) => setPeriodYear(e.target.value)}
              min={2000}
              max={2100}
              placeholder="2026"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-bold rounded border border-border hover:border-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-6 py-2 text-sm font-black rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
        >
          {isSubmitting
            ? "Salvando..."
            : post
              ? "Atualizar"
              : "Publicar"}
        </button>
      </div>
    </form>
  );
}