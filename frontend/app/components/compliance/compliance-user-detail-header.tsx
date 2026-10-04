import { Mail, Phone, Calendar, Shield, User as UserIcon } from "lucide-react";

interface ComplianceUserDetailHeaderProps {
  nome: string;
  email: string;
  role: string;
  isActive: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  USER: "Usuário",
  ADMIN: "Administrador",
  FINANCEIRO: "Financeiro",
  COMPLIANCE: "Compliance",
};

export function ComplianceUserDetailHeader({ nome, email, role, isActive }: ComplianceUserDetailHeaderProps) {
  return (
    <header className="mb-12 lg:mb-16 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <span className="text-primary font-black tracking-[0.3em] text-[10px] uppercase mb-4 block italic">
            Sistema de Compliance
          </span>
          <h1 className="text-5xl lg:text-7xl font-black tracking-tighter text-foreground leading-none italic">
            {nome || "Usuário"}
          </h1>
          <div className="flex items-center gap-4">
            <span className="px-4 py-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30">
              {ROLE_LABELS[role] || role}
            </span>
            <span
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                isActive
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              }`}
            >
              {isActive ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-6 text-muted-foreground">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4" />
          <span className="text-sm">{email}</span>
        </div>
      </div>
    </header>
  );
}