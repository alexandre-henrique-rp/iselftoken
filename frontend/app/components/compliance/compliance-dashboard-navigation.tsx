import { Link, useLocation } from "react-router";
import { complianceNavigation, isComplianceNavigationActive } from "~/lib/compliance-navigation";
import { cn } from "~/lib/utils";

export function ComplianceDashboardNavigation() {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Navegação de Compliance" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {complianceNavigation.map((item) => {
        const Icon = item.icon;
        const active = isComplianceNavigationActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            to={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-24 items-start gap-3 rounded-2xl border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active
                ? "border-primary/40 bg-primary/10 text-primary shadow-[0_0_24px_rgba(213,0,249,0.12)]"
                : "border-white/10 bg-card/70 text-foreground hover:border-primary/30 hover:bg-primary/5",
            )}
          >
            <span className={cn("mt-0.5 rounded-xl p-2", active ? "bg-primary/15" : "bg-white/5 group-hover:bg-primary/10")}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold">{item.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
