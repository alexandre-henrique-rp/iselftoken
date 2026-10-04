import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface WizardField {
  label: string;
  value: React.ReactNode;
  /**
   * Chave do schema Prisma (snake_case) que representa este campo no
   * snapshot de rejeição. Quando presente em `changedFields` (Set), o
   * card destaca visualmente (borda + badge "Atualizado").
   *
   * Se ausente, o campo nunca é destacado (não tem mapeamento no snapshot
   * — ex: campos derivados, totais).
   */
  snapshotKey?: string;
  /**
   * Valor anterior (do snapshot de rejeição) — exibido ao lado do atual
   * com ícone `→` quando há diff. Formato: string ou ReactNode curto.
   */
  previousValue?: React.ReactNode;
}

interface WizardDataCardProps {
  title: string;
  icon?: LucideIcon;
  fields: WizardField[];
  /**
   * Set de `snapshotKey`s que mudaram desde a rejeição. Quando fornecido,
   * campos cujo `snapshotKey` estiver no set ganham destaque visual (borda
   * + badge "Atualizado") + valor anterior. Se omitido, nenhum destaque.
   */
  changedFields?: Set<string>;
  /**
   * Quando `true`, exibe TODOS os campos — inclusive os vazios (renderizados
   * como "—"). Usado na Fase 2, onde o admin quer ver o formulário completo
   * do founder, mesmo os campos ainda não preenchidos. Default `false`
   * (comportamento original: omite vazios).
   */
  showEmpty?: boolean;
}

/**
 * WizardDataCard — card read-only que exibe os dados preenchidos pelo founder
 * naquela etapa (design §2.2). Campos vazios são omitidos (não mostra "—"
 * fabricado). Glass panel + magenta no ícone.
 *
 * Quando há rejeição registrada e o founder atualizou o cadastro, recebe
 * `changedFields` (Set de snapshotKeys) e destaca campo-a-campo o que
 * mudou, com valor anterior entre setas `→` para evidenciar a correção.
 */
export function WizardDataCard({
  title,
  icon: Icon,
  fields,
  changedFields,
  showEmpty = false,
}: WizardDataCardProps) {
  const isEmpty = (v: WizardField["value"]) =>
    v === null || v === undefined || v === "";
  // showEmpty: exibe todos os campos (vazios viram "—"). Caso contrário,
  // filtra os vazios (comportamento original).
  const visible = showEmpty ? fields : fields.filter((f) => !isEmpty(f.value));
  if (visible.length === 0) return null;

  const changedCount = changedFields
    ? visible.filter(
        (f) => f.snapshotKey && changedFields.has(f.snapshotKey),
      ).length
    : 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-4 sm:p-8 space-y-4">
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className="h-4 w-4 text-primary/70" aria-hidden="true" />
        )}
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {changedCount > 0 && (
          <span className="ml-auto rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
            {changedCount} campo{changedCount === 1 ? "" : "s"} atualizado
            {changedCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visible.map((f) => {
          const isChanged =
            changedFields != null &&
            f.snapshotKey != null &&
            changedFields.has(f.snapshotKey);
          return (
            <div
              key={f.label}
              data-changed={isChanged ? "true" : undefined}
              className={
                isChanged
                  ? "rounded-xl border border-amber-500/40 bg-amber-500/5 p-2.5 transition"
                  : undefined
              }
            >
              <dt className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                {f.label}
                {isChanged && (
                  <span className="rounded-full bg-amber-500/20 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-amber-300">
                    Atualizado
                  </span>
                )}
              </dt>
              <dd className="mt-1 break-words text-sm text-foreground">
                {isChanged && f.previousValue !== undefined ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="text-muted-foreground line-through">
                      {f.previousValue || <em className="not-italic opacity-60">(vazio)</em>}
                    </span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-amber-400" />
                    <span className="font-semibold">{f.value}</span>
                  </span>
                ) : (
                  <>
                    {isEmpty(f.value) ? (
                      <span className="text-muted-foreground/50">—</span>
                    ) : (
                      f.value
                    )}
                  </>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
