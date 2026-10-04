/**
 * User Coupons — Meus cupons (investidor)
 * Rota: /user/coupons
 */

import { MyCouponsGrid } from "~/components/coupons/my-coupons-grid";

export function meta() {
  return [
    { title: "Meus Cupons | iSelfToken" },
    { name: "description", content: "Cupons de desconto disponíveis." },
  ];
}

export default function UserCouponsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <nav
            className="flex items-center gap-2 text-sm text-on-surface-variant mb-2"
            aria-label="Breadcrumb"
          >
            <span>Meu Painel</span>
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-on-surface font-medium">Cupons</span>
          </nav>
          <h1 className="text-display-sm font-black text-on-surface">
            Meus Cupons
          </h1>
          <p className="text-on-surface-variant mt-1">
            Cupons de desconto disponíveis para suas próximas aquisições.
          </p>
        </header>

        {/* Coupons grid */}
        <MyCouponsGrid />
      </div>
    </div>
  );
}
