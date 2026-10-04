import { NavLink } from "react-router";
import { User, MapPin, FileCheck, Building, Megaphone, TrendingUp, Award, History } from "lucide-react";
import { cn } from "~/lib/utils";

interface ComplianceUserDetailNavProps {
  id: number | string;
}

const TABS = [
  { path: "identidade", label: "Dados Pessoais", icon: User },
  { path: "endereco", label: "Endereço", icon: MapPin },
  { path: "kyc", label: "KYC / Documentos", icon: FileCheck },
  { path: "startups", label: "Startups", icon: Building },
  { path: "campanhas", label: "Campanhas", icon: Megaphone },
  { path: "investimentos", label: "Investimentos", icon: TrendingUp },
  { path: "notas-selos", label: "Notas e Selos", icon: Award },
  { path: "auditoria", label: "Auditoria", icon: History },
];

export function ComplianceUserDetailNav({ id }: ComplianceUserDetailNavProps) {
  return (
    <nav className="mb-8 border-b border-white/10">
      <ul className="flex overflow-x-auto gap-1 pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <li key={tab.path}>
              <NavLink
                to={tab.path}
                end={tab.path === "identidade"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-colors",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}