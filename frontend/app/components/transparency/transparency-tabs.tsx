/**
 * TabNav: Atualizacoes | Chat por Topicos.
 *
 * Estado em query param `?tab=discussao` (default "atualizacoes")
 * para deep-link. Troca invalida apenas queries correspondentes.
 *
 * O label "Discussao" foi renomeado para "Chat por Topicos" para deixar
 * explicito que a aba e um canal bidirecional entre o fundador da startup
 * e os investidores (token-holders). Cada discussion tem categoria
 * (GERAL, FINANCEIRO, PRODUTO, SOCIETARIO, DUVIDA) e pode ser votada
 * (upvote) ou fixada (pin) — ver TRANSP-04.
 */
import { Link, useSearchParams } from "react-router";

export type TransparencyTab = "atualizacoes" | "discussao";

const TABS: Array<{
  key: TransparencyTab;
  label: string;
  description: string;
}> = [
  {
    key: "atualizacoes",
    label: "Atualizacoes",
    description: "Comunicados oficiais do fundador e relatorios mensais.",
  },
  {
    key: "discussao",
    label: "Chat por Topicos",
    description:
      "Converse por categoria com o fundador e outros investidores. Cada topico tem replies e upvotes.",
  },
];

interface TransparencyTabsProps {
  active: TransparencyTab;
  onChange: (next: TransparencyTab) => void;
}

export function TransparencyTabs({ active, onChange }: TransparencyTabsProps) {
  const [, setSearchParams] = useSearchParams();

  const handle = (next: TransparencyTab) => {
    onChange(next);
    if (next === "discussao") {
      setSearchParams((prev) => {
        const np = new URLSearchParams(prev);
        np.set("tab", "discussao");
        return np;
      });
    } else {
      setSearchParams((prev) => {
        const np = new URLSearchParams(prev);
        np.delete("tab");
        return np;
      });
    }
  };

  return (
    <div className="border-b border-border">
      <div className="flex gap-1" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            aria-label={t.description}
            onClick={() => handle(t.key)}
            className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition ${
              active === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        {/* deep-link helper (acessibilidade) */}
        <Link
          to={active === "discussao" ? "?tab=discussao" : "?"}
          className="sr-only"
          aria-hidden
        >
          {active === "discussao" ? "Chat por Topicos" : "Atualizacoes"}
        </Link>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1 px-1 pb-2">
        {TABS.find((t) => t.key === active)?.description}
      </p>
    </div>
  );
}

export function readTabFromSearch(search: string): TransparencyTab {
  if (typeof search !== "string") return "atualizacoes";
  const params = new URLSearchParams(search);
  return params.get("tab") === "discussao" ? "discussao" : "atualizacoes";
}