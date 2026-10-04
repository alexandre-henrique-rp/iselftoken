import { redirect } from "react-router";
import type { Route } from "./+types/referral";

/**
 * Link público de divulgação do afiliado: /r/:code
 *
 * O afiliado divulga esta URL. Quem chega por ela tem o código gravado num
 * cookie (`aff_ref`, 30 dias) e é levado ao cadastro já com `?ref=`. Ao se
 * cadastrar, o novo usuário fica vinculado à indicação do afiliado
 * (AffiliateReferral source=LINK) — ver auth.service.registerAffiliateReferral.
 *
 * O cookie NÃO é httpOnly de propósito: o formulário de cadastro o lê no
 * cliente como fallback caso o `?ref=` se perca durante a navegação.
 */
export async function loader({ params }: Route.LoaderArgs) {
  const raw = params.code ?? "";
  // Sanitiza: os códigos de afiliação são alfanuméricos com hífen (ex.: AFL-2B576EF0).
  const code = raw.replace(/[^A-Za-z0-9-]/g, "").slice(0, 64).toUpperCase();

  if (!code) {
    throw redirect("/register");
  }

  const cookie = `aff_ref=${encodeURIComponent(code)}; Path=/; Max-Age=2592000; SameSite=Lax`;
  return redirect(`/register?ref=${encodeURIComponent(code)}`, {
    headers: { "Set-Cookie": cookie },
  });
}
