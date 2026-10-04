/**
 * Admin Installments — Gestão de parcelas (admin/financeiro)
 * Rota: /admin/installments
 */

import { NoItemsEmpty } from "~/components/ui/empty-states";

export function meta() {
  return [
    { title: "Parcelas | iSelfToken Admin" },
    { name: "description", content: "Gestão de parcelas e repasses." },
  ];
}

export default function AdminInstallmentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-2" aria-label="Breadcrumb">
            <span>Admin</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-on-surface font-medium">Parcelas</span>
          </nav>
          <h1 className="text-display-sm font-black text-on-surface">Gestão de Parcelas</h1>
          <p className="text-on-surface-variant mt-1">
            Acompanhe e gerencie parcelas de investimento.
          </p>
        </header>

        <NoItemsEmpty
          title="Nenhuma parcela encontrada"
          description="Parcelas aparecerão aqui quando houverem investimentos parcelados."
          cta={{ label: "Voltar ao Dashboard", onClick: () => window.location.href = "/admin/dashboard" }}
        />
      </div>
    </div>
  );
}
