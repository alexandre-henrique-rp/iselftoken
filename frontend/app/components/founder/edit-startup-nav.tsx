import { FileText, Landmark, Lock, User, Users, type LucideIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { label: "Identidade", href: "", icon: User },
  { label: "Time", href: "time", icon: Users },
  { label: "Documentos", href: "documentos", icon: FileText },
  { label: "Bancário", href: "bancario", icon: Landmark },
];

/**
 * Mensagem exibida quando o usuário tenta avançar para uma seção bloqueada
 * (ex.: tentar sair de "Documentos" sem aceitar e salvar o Termo de Adesão).
 */
const BLOCKED_FORWARD_MESSAGE =
  "Aceite e salve o Termo de Adesão antes de prosseguir para esta seção.";

function resolveCurrentIndex(pathname: string, base: string): number {
  for (let i = navItems.length - 1; i >= 0; i--) {
    const item = navItems[i];
    const to = item.href ? `${base}/${item.href}` : base;
    if (pathname === to || pathname.startsWith(`${to}/`)) return i;
  }
  return 0;
}

export function EditStartupNav({
  id,
  lockedFromIndex = null,
}: {
  id: string;
  /**
   * Índice da seção a partir do qual (inclusive) o avanço para uma seção
   * posterior fica bloqueado. `null` desabilita o bloqueio.
   *
   * Voltar para seções anteriores (índice menor) nunca é bloqueado.
   */
  lockedFromIndex?: number | null;
}) {
  const { pathname } = useLocation();
  const base = `/founder/startups/${id}/edit`;
  const currentIndex = resolveCurrentIndex(pathname, base);

  return (
    <nav
      aria-label="Seções da edição da startup"
      className="mb-6 overflow-x-auto pb-1 no-scrollbar md:mb-8"
    >
      <ol className="flex min-w-[650px] items-center">
        {navItems.map((item, index) => {
          const to = item.href ? `${base}/${item.href}` : base;
          const isActive = item.href
            ? pathname === to || pathname.startsWith(`${to}/`)
            : pathname === base;
          const Icon = item.icon;

          const isForwardBlocked =
            lockedFromIndex !== null &&
            currentIndex >= lockedFromIndex &&
            index > currentIndex;

          const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (isForwardBlocked) {
              e.preventDefault();
              toast.error(BLOCKED_FORWARD_MESSAGE);
            }
          };

          return (
            <li key={item.label} className="flex min-w-0 flex-1 items-center">
              <Link
                to={to}
                onClick={handleClick}
                aria-current={isActive ? "page" : undefined}
                aria-disabled={isForwardBlocked || undefined}
                title={
                  isForwardBlocked
                      ? "Bloqueado: aceite e salve o Termo de Adesão para liberar."
                    : undefined
                }
                className={`group flex min-w-0 items-center gap-2 rounded-lg px-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isActive
                    ? "text-foreground"
                    : isForwardBlocked
                      ? "cursor-not-allowed text-muted-foreground/50"
                      : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isForwardBlocked
                        ? "border-border/40 bg-card text-muted-foreground/40"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {isForwardBlocked ? (
                    <Lock className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Seção 0{index + 1}
                  </span>
                  <span className="block truncate text-sm font-semibold">
                    {item.label}
                  </span>
                </span>
              </Link>
              {index < navItems.length - 1 && (
                <span
                  className="mx-2 h-px min-w-6 flex-1 bg-border"
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}