import { useEffect, useState } from "react";
import { cn } from "~/lib/utils";

const NAV_ITEMS = [
  { id: "resumo", label: "Resumo" },
  { id: "dados-pessoais", label: "Dados pessoais" },
  { id: "endereco", label: "Endereço" },
  { id: "verificacao", label: "Verificação" },
  { id: "perfil", label: "Perfil" },
] as const;

export function ProfileAccountNav() {
  const [activeId, setActiveId] = useState<string>(NAV_ITEMS[0].id);

  useEffect(() => {
    const sections = NAV_ITEMS.map(({ id }) => document.getElementById(id)).filter(
      (section): section is HTMLElement => Boolean(section),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-28% 0px -58%", threshold: [0.1, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Seções da conta"
      className="sticky top-24 z-20 -mx-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="inline-flex min-w-full gap-1 rounded-xl border border-white/5 bg-surface/85 p-1 backdrop-blur-xl sm:min-w-0">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === activeId;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={isActive ? "location" : undefined}
              onClick={() => setActiveId(item.id)}
              className={cn(
                "shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-colors sm:px-5",
                isActive
                  ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground hover:bg-surface-container-high hover:text-foreground",
              )}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
