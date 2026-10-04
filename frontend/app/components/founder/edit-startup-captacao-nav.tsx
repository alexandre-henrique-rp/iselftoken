import {
  Brain,
  Coins,
  ShieldCheck,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "react-router";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Uma aba = uma subrota. `href` vazio → rota index (valores de captação).
const navItems: NavItem[] = [
  { label: "Valores de captação", href: "", icon: Wallet },
  { label: "Destinação de recursos", href: "recursos", icon: Coins },
  { label: "Tese de negócios", href: "tese", icon: Target },
  { label: "Governança e operação", href: "governanca", icon: Brain },
  { label: "Benefícios e participação", href: "retornos", icon: ShieldCheck },
];

export function EditStartupCaptacaoNav({ id }: { id: string }) {
  const { pathname } = useLocation();
  const base = `/founder/startups/${id}/captacao`;

  return (
    <nav
      aria-label="Etapas da edição da captação"
      className="mb-6 overflow-x-auto pb-1 no-scrollbar md:mb-8"
    >
      <ol className="flex min-w-[760px] items-center">
        {navItems.map((item, index) => {
          const to = item.href ? `${base}/${item.href}` : base;
          const isActive = item.href
            ? pathname === to || pathname.startsWith(`${to}/`)
            : pathname === base;
          const Icon = item.icon;

          return (
            <li key={item.label} className="flex min-w-0 flex-1 items-center">
              <Link
                to={to}
                aria-current={isActive ? "step" : undefined}
                className={`group flex min-w-0 items-center gap-2 rounded-lg px-1 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isActive ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Etapa 0{index + 1}
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
