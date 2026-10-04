import {
  Award,
  Briefcase,
  FileText,
  LayoutDashboard,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

export interface ComplianceNavigationItem {
  label: string;
  href: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

/** Fonte única da navegação operacional do Compliance. */
export const complianceNavigation: ComplianceNavigationItem[] = [
  {
    label: "Dashboard",
    href: "/compliance/dashboard",
    description: "Visão geral das filas e indicadores.",
    icon: LayoutDashboard,
  },
  {
    label: "Usuários",
    href: "/compliance/users",
    description: "Análise de perfis e status KYC.",
    icon: Users,
  },
  {
    label: "Startups",
    href: "/compliance/startups",
    description: "Curadoria e aprovação de startups.",
    icon: Briefcase,
  },
  {
    label: "Campanhas",
    href: "/compliance/campaigns",
    description: "Revisão de rodadas de captação.",
    icon: ShieldCheck,
  },
  {
    label: "Solicitações de alteração",
    href: "/compliance/change-requests",
    description: "Revisão de alterações cadastrais.",
    icon: FileText,
  },
  {
    label: "Repasses",
    href: "/compliance/repasses",
    description: "Deliberação de parcelas de repasse.",
    icon: Scale,
  },
  {
    label: "Selos",
    href: "/compliance/seals",
    description: "Gestão de selos de confiança.",
    icon: Award,
  },
];

export function isComplianceNavigationActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
