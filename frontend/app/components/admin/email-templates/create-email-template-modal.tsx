import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { X, Mail, Plus, Loader2 } from "lucide-react";
import { useCreateEmailTemplate } from "~/hooks/use-create-email-template";

interface CreateEmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateEmailTemplateModal({
  isOpen,
  onClose,
}: CreateEmailTemplateModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateEmailTemplate();

  // Fecha modal com Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Atualiza slug automaticamente enquanto o usuário não tiver customizado manualmente
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugCustomized) {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlug(slugify(val));
    setIsSlugCustomized(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanSlug = slug.trim();
    const cleanSubject = subject.trim();

    if (!cleanName) {
      setError("Por favor, informe o nome do template.");
      return;
    }
    if (!cleanSlug) {
      setError("Por favor, informe o slug do template.");
      return;
    }
    if (!cleanSubject) {
      setError("Por favor, informe o assunto padrão do e-mail.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        name: cleanName,
        slug: cleanSlug,
        subject: cleanSubject,
        description: description.trim() || undefined,
      });
      onClose();
      // Redireciona diretamente para a tela de edição do template criado
      navigate(`/admin/email-templates/${cleanSlug}`);
    } catch (err: any) {
      setError(err?.message ?? "Falha ao criar o template de email.");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-template-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 id="create-template-title" className="text-lg font-bold text-foreground">
                Criar Novo Template
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure os dados básicos do novo template de e-mail transacional
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="template-name" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Nome do Template *
            </label>
            <input
              id="template-name"
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Confirmação de Reserva"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="template-slug" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Slug (Identificador Kebab-case) *
            </label>
            <input
              id="template-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="Ex: confirmacao-reserva"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Utilizado no backend para invocar este template via código.
            </p>
          </div>

          <div>
            <label htmlFor="template-subject" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Assunto Padrão *
            </label>
            <input
              id="template-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Sua reserva de tokens foi confirmada! 🎉"
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="template-desc" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Descrição (Opcional)
            </label>
            <textarea
              id="template-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Disparado assim que a transferência bancária é reconciliada."
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Criar e Editar HTML
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
