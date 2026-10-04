import { WithdrawForm } from "~/components/wallet/withdraw-form";
import { WithdrawHeader } from "~/components/wallet/withdraw-header";
import { WithdrawSummary } from "~/components/wallet/withdraw-summary";
import { BACKEND_URL } from "~/lib/api-config";
import type { Route } from "./+types/withdraw";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Solicitar Resgate | iSelfToken" },
    {
      name: "description",
      content:
        "Solicite o resgate do seu saldo disponível com segurança e rapidez.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get("cookie") || "";

  try {
    const res = await fetch(`${BACKEND_URL}/wallet`, { headers: { cookie } });
    if (!res.ok) return { balance: 0, blocked: 0 };
    const json = await res.json();
    if (json?.error) return { balance: 0, blocked: 0 };
    return {
      balance: Number(json.data?.balance ?? 0),
      blocked: Number(json.data?.blocked ?? 0),
    };
  } catch {
    return { balance: 0, blocked: 0 };
  }
}

export default function WithdrawPage({ loaderData }: Route.ComponentProps) {
  const { balance, blocked } = loaderData;

  const availableFormatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(balance);

  return (
    <div className="relative max-w-5xl mx-auto">
      {/* Background Watermark */}
      <div className="fixed inset-0 z-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none overflow-hidden">
        <h1 className="text-[20vw] font-black italic tracking-tighter">
          iSelfToken
        </h1>
      </div>

      <WithdrawHeader />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10">
        <div className="lg:col-span-5">
          <WithdrawSummary availableBalance={availableFormatted} />
        </div>
        <div className="lg:col-span-7">
          <WithdrawForm />
        </div>
      </div>
    </div>
  );
}
