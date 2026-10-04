/**
 * Admin Coupons — Redireciona para a nova rota compartilhada /central-cupons.
 * Mantida para retrocompatibilidade de bookmarks e links antigos.
 */

import { Navigate } from "react-router";

export function meta() {
  return [
    { title: "Cupons | iSelfToken Admin" },
    { name: "description", content: "Gestão de cupons de desconto." },
  ];
}

export default function AdminCouponsPage() {
  return <Navigate to="/central-cupons" replace />;
}
