/** Orquestra o workspace administrativo da Central de Cupons. */

import { useState } from "react";
import { Navigate } from "react-router";
import {
  CouponEditModal,
  type CouponTabId,
} from "~/components/coupons/coupon-edit-modal";
import { CouponGeneratorForm } from "~/components/coupons/coupon-generator-form";
import { CouponsList } from "~/components/coupons/coupons-list";
import { useCouponPermissions } from "~/hooks/use-coupon-permissions";
import { useUser } from "~/hooks/use-user";
import type { Coupon } from "~/lib/api/coupons";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administração",
  COMPLIANCE: "Compliance",
  FINANCEIRO: "Financeiro",
};

export function CentralCouponsContent() {
  const { isLoading } = useUser();
  const { canAccess, canManage, role } = useCouponPermissions();
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [modalTab, setModalTab] = useState<CouponTabId>("dados");

  if (isLoading) {
    return <CentralCouponsSkeleton />;
  }

  if (!canAccess) {
    return <Navigate to="/home" replace />;
  }

  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "";
  const openCoupon = (coupon: Coupon, tab: CouponTabId = "dados") => {
    setModalTab(tab);
    setEditCoupon(coupon);
  };

  return (
    <main className="relative min-h-screen py-3 md:py-4">
      <div className="relative z-10 w-full max-w-7xl xl:max-w-[1400px]">
        <header className="mb-6 md:mb-8">
          <nav
            className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <span>{roleLabel}</span>
            <span aria-hidden="true">/</span>
            <span className="text-primary">Cupons</span>
          </nav>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Central de cupons
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                {canManage
                  ? "Crie, edite e acompanhe campanhas de desconto com rastreabilidade."
                  : "Consulte cupons e acompanhe o histórico de uso com segurança."}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
              Gestão operacional
            </div>
          </div>
        </header>

        {canManage ? (
          <section
            className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-5"
            aria-label="Workspace de cupons"
          >
            <div className="lg:col-span-2">
              <CouponGeneratorForm />
            </div>
            <div className="min-w-0 lg:col-span-3">
              <CouponsList
                onEditCoupon={(coupon) => openCoupon(coupon, "dados")}
                onViewHistory={(coupon) => openCoupon(coupon, "auditoria")}
                onCreateCoupon={() =>
                  document
                    .getElementById("coupon-generator")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              />
            </div>
          </section>
        ) : (
          <section aria-label="Workspace de cupons">
            <CouponsList
              onViewHistory={(coupon) => openCoupon(coupon, "auditoria")}
            />
          </section>
        )}
      </div>

      <CouponEditModal
        key={editCoupon?.id ?? "closed"}
        coupon={editCoupon}
        open={!!editCoupon}
        initialTab={modalTab}
        canManage={canManage}
        onClose={() => setEditCoupon(null)}
      />
    </main>
  );
}

function CentralCouponsSkeleton() {
  return (
    <main
      className="min-h-screen py-3 md:py-4"
      aria-busy="true"
      aria-label="Carregando Central de Cupons"
    >
      <div className="mb-8 h-24 animate-pulse rounded-2xl bg-white/5" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="h-96 animate-pulse rounded-2xl bg-white/5 lg:col-span-2" />
        <div className="h-96 animate-pulse rounded-2xl bg-white/5 lg:col-span-3" />
      </div>
    </main>
  );
}
