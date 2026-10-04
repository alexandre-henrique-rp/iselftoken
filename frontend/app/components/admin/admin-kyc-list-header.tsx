import { ShieldCheck } from "lucide-react";

interface AdminKycListHeaderProps {
  total: number;
}

/**
 * Header editorial da lista de KYC (`/admin/kyc`).
 * Mostra título + contagem total de usuários cadastrados (recurso sem filtro
 * direto — apenas informativo).
 */
export function AdminKycListHeader({ total }: AdminKycListHeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="w-12 h-px bg-primary" />
          <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px]">
            Compliance · Identidade
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tighter text-foreground leading-none">
          Verificação <span className="text-primary italic">KYC</span>
        </h1>
      </div>
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/30 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">
        <ShieldCheck className="w-3 h-3 text-primary" aria-hidden />
        {total.toLocaleString("pt-BR")} usuários cadastrados
      </div>
    </header>
  );
}
