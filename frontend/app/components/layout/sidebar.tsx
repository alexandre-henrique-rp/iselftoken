import {
  Briefcase,
  Building2,
  Eye,
  Handshake,
  Landmark,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Percent,
  PieChart,
  Receipt,
  Scale,
  Settings,
  Ticket,
  User,
  Users,
  Wallet,
} from "lucide-react";
import React from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useLogoutMutation } from "~/hooks/use-logout-mutation";
import { useUser } from "~/hooks/use-user";
import {
  complianceNavigation,
  isComplianceNavigationActive,
} from "~/lib/compliance-navigation";
import { cn } from "~/lib/utils";
import type { UserData } from "~/types/auth";

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ─── Menus fixos por role administrativa ───────────────────────────────────────

const adminMenuItems: MenuItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: PieChart },
  { label: "Usuários", href: "/admin/users", icon: Users },
  { label: "Startups", href: "/admin/startups", icon: Briefcase },
  { label: "Planos", href: "/admin/plans", icon: Package },
  { label: "Cupons", href: "/admin/coupons", icon: Ticket },
  { label: "Afiliados", href: "/admin/affiliate", icon: Handshake },
  { label: "Ordens e Pagamentos", href: "/admin/payments", icon: Receipt },
  { label: "Histórico", href: "/admin/history", icon: Receipt },
  { label: "Gestão de Repasse", href: "/admin/payouts", icon: Wallet },
  {
    label: "Split Repasse × Lucro",
    href: "/admin/financeiro/split",
    icon: Scale,
  },
  { label: "Serviços", href: "/admin/servicos", icon: Package },
  { label: "Configurações", href: "/admin/config", icon: Percent },
  { label: "Templates de Email", href: "/admin/email-templates", icon: Mail },
];

const complianceMenuItems: MenuItem[] = complianceNavigation;

const financeiroMenuItems: MenuItem[] = [
  { label: "Dashboard", href: "/financeiro/dashboard", icon: PieChart },
  { label: "Planos", href: "/financeiro/plans", icon: Package },
  { label: "Config Taxas", href: "/financeiro/config", icon: Percent },
  { label: "Transações", href: "/financeiro/transactions", icon: Receipt },
  { label: "Assas", href: "/financeiro/assas", icon: Landmark },
  { label: "Saques", href: "/financeiro/withdraws", icon: Wallet },
  { label: "Investimentos", href: "/financeiro/investments", icon: Briefcase },
];

// ─── Menu fixo do Fundador ────────────────────────────────────────────────────

function buildFounderMenu(activeSlugs: string[]): MenuItem[] {
  const items: MenuItem[] = [
    { label: "Home", href: "/home", icon: LayoutDashboard },
    { label: "Minhas Startups", href: "/founder/dashboard", icon: Building2 },
  ];

  // Triagem de afiliados e links de afiliação só aparecem se tem plano afiliado.
  // A carteira do afiliado (/wallet/affiliate) NAO aparece no sidebar — acesso
  // direto via card "Comissoes" do /wallet para usuarios com `plano-afiliado`.
  if (activeSlugs.includes("plano-afiliado")) {
    items.push({
      label: "Triagem de Afiliados",
      href: "/founder/affiliate/triagem",
      icon: Handshake,
    });
    items.push({ label: "Afiliação", href: "/affiliate", icon: Handshake });
  }

  return items;
}

// ─── Footer (inalterado) ──────────────────────────────────────────────────────

const footerItems = [{ icon: User, label: "Perfil", href: "/profile" }];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActivePlanSlugs(user: UserData): string[] {
  return (
    user.subscriptions
      ?.filter((sub) => sub.status === "ACTIVE")
      .map((sub) => sub.plan?.slug ?? "")
      .filter(Boolean) ?? []
  );
}

/**
 * Composição aditiva de menu para usuários com planos (Investidor/Afiliado).
 * Cada plano ativo adiciona seus itens ao menu.
 */
function buildPlanBasedMenu(activeSlugs: string[]): MenuItem[] {
  const items: MenuItem[] = [
    { label: "Home", href: "/home", icon: LayoutDashboard },
  ];

  if (activeSlugs.includes("plano-investidor")) {
    items.push({ label: "Transparência", href: "/transparencia", icon: Eye });
  }

  if (activeSlugs.includes("plano-afiliado")) {
    items.push({ label: "Afiliação", href: "/affiliate", icon: Handshake });
  }

  return items;
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();
  const { user } = useUser();

  if (!user) return null;

  // Determinar itens de navegação
  const activeSlugs = getActivePlanSlugs(user);
  const hasFundador = activeSlugs.includes("plano-fundador");

  let navItems: MenuItem[];

  if (user.role === "ADMIN") {
    navItems = adminMenuItems;
  } else if (user.role === "COMPLIANCE") {
    navItems = complianceMenuItems;
  } else if (user.role === "FINANCEIRO") {
    navItems = financeiroMenuItems;
  } else if (hasFundador) {
    navItems = buildFounderMenu(activeSlugs);
  } else {
    // Composição aditiva por plano (Investidor, Afiliado, ou ambos)
    navItems = buildPlanBasedMenu(activeSlugs);
  }

  const handleLogout = async () => {
    await logoutMutation.mutateAsync().catch(() => {
      // logout não rejeita externamente; cache já limpo via onError
    });
    navigate("/login");
  };

  return (
    <aside className="h-screen w-72 flex-col fixed left-0 top-0 bg-surface-dim z-50 flex p-6 gap-8 font-sans antialiased tracking-tight">
      <div className="flex items-center">
        <Link to="/home" onClick={onNavigate}>
          <h1 className="text-2xl font-black tracking-tighter text-primary">
            iSelfToken
          </h1>
        </Link>
      </div>

      <nav className="flex-1 flex flex-col gap-2 mt-4 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = item.href.startsWith("/compliance/")
            ? isComplianceNavigationActive(location.pathname, item.href)
            : location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-4 py-3 px-4 rounded-xl transition-all duration-300",
                isActive
                  ? "bg-surface-container text-primary-dim font-bold shadow-[0_0_15px_rgba(213,0,249,0.15)]"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60",
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 pt-6">
        {footerItems.map((item) => (
          <Link
            key={item.label}
            to={item.href}
            onClick={onNavigate}
            className="flex items-center gap-4 py-2 px-4 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container/60 transition-all duration-300"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm">{item.label}</span>
          </Link>
        ))}

        <button
          onClick={handleLogout}
          className="flex items-center gap-4 py-2 px-4 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all duration-300 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Logout</span>
        </button>

        <Link
          to="/wallet"
          onClick={onNavigate}
          className="w-full py-3.5 mt-4 bg-gradient-to-r from-primary to-primary-container text-on-primary-fixed font-bold rounded-full text-xs uppercase tracking-wider scale-95 active:scale-90 transition-transform shadow-[0_0_24px_rgba(213,0,249,0.35)] text-center block"
        >
          Minha Carteira
        </Link>
      </div>
    </aside>
  );
}
