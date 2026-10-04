/**
 * DiscussionEditor: form de criar/editar thread.
 *
 * Campos: title (10..200), category (select), content (textarea markdown),
 * toggle "Postar anonimamente" (default false; texto explicativo).
 */
import { useState } from "react";
import { X } from "lucide-react";
import {
  DISCUSSION_CATEGORIES,
  DISCUSSION_CATEGORY_LABELS,
  type DiscussionCategory,
} from "~/types/transparency";

interface DiscussionEditorProps {
  initialTitle?: string;
  initialContent?: string;
  initialCategory?: DiscussionCategory;
  initialAnonymous?: boolean;
  mode?: "create" | "edit";
  onSubmit: (data: {
    title: string;
    content: string;
    category: DiscussionCategory;
    isAnonymous: boolean;
  }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function DiscussionEditor({
  initialTitle = "",
  initialContent = "",
  initialCategory = "GERAL",
  initialAnonymous = false,
  mode = "create",
  onSubmit,
  onCancel,
  isSubmitting,
}: DiscussionEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [category, setCategory] = useState<DiscussionCategory>(initialCategory);
  const [isAnonymous, setIsAnonymous] = useState(initialAnonymous);

  const titleValid = title.trim().length >= 10 && title.trim().length <= 200;
  const contentValid = content.trim().length >= 20 && content.trim().length <= 10000;
  const canSubmit = titleValid && contentValid && !isSubmitting;

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category,
      isAnonymous,
    });
  };

  return (
    <form
      onSubmit={handle}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-testid="discussion-editor"
    >
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight">
            {mode === "edit" ? "Editar thread" : "Nova thread"}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Titulo (10..200 chars)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Resuma o topico em uma frase"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            data-testid="discussion-editor-title"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {title.trim().length}/200
          </p>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Categoria
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DiscussionCategory)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
            data-testid="discussion-editor-category"
          >
            {DISCUSSION_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {DISCUSSION_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
            Conteudo (markdown, 20..10000 chars)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Detalhe seu topico..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono"
            data-testid="discussion-editor-content"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            {content.trim().length}/10000
          </p>
        </div>

        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mt-0.5"
            data-testid="discussion-editor-anonymous"
          />
          <span>
            Postar anonimamente.{" "}
            <strong className="text-foreground">
              Seu nome aparecera como "PrimeiroNome U." (primeiro nome + inicial do sobrenome).
            </strong>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border border-border hover:border-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            data-testid="discussion-editor-submit"
            className="px-6 py-2 text-xs font-black uppercase tracking-wider rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition"
          >
            {isSubmitting ? "Salvando..." : mode === "edit" ? "Atualizar" : "Publicar"}
          </button>
        </div>
      </div>
    </form>
  );
}