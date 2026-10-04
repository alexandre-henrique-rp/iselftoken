import { Link } from "react-router";
import { Download } from "lucide-react";

export function AdminHistoryHeader({ qs }: { qs: string }) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
      <div>
        <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
          Auditoria
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
          Histórico de Transações
        </h1>
        <p className="text-muted-foreground text-sm mt-3 max-w-xl">
          Timeline unificado de tudo: investimentos, pagamentos, reservas,
          comissões, saques e decisões de afiliação/compliance.
        </p>
      </div>
      <a
        href={`/api/admin/history/export${qs || ""}`}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-black hover:opacity-90 transition-all text-[11px] font-black uppercase tracking-widest shrink-0"
      >
        <Download className="w-4 h-4" /> Exportar CSV
      </a>
    </header>
  );
}
