import type { Route } from "./+types/verificar-token.$hash";
import { ShieldCheck, ShieldX, Coins, Building2, Calendar, Hash, User } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

interface TokenInfo {
  hash: string;
  investidor: string;
  startup: string;
  campanha: string;
  quantidadeLote: number;
  valorUnitario: number;
  emitidoEm: string;
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verificação de Token - iSelfToken" },
    {
      name: "description",
      content: "Valide a autenticidade de um token de equity crowdfunding emitido na plataforma iSelfToken.",
    },
  ];
}

export async function loader({ params }: Route.LoaderArgs): Promise<{
  hash: string;
  valid: boolean;
  token: TokenInfo | null;
  erro: boolean;
}> {
  const hash = params.hash;
  try {
    const res = await fetch(`${BACKEND_URL}/tokens/verify/${encodeURIComponent(hash)}`, {
      headers: { accept: "application/json" },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) {
      return { hash, valid: false, token: null, erro: true };
    }
    return {
      hash,
      valid: Boolean(json.data?.valid),
      token: json.data?.token ?? null,
      erro: false,
    };
  } catch {
    return { hash, valid: false, token: null, erro: true };
  }
}

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const dataPtBr = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export default function VerificarToken({ loaderData }: Route.ComponentProps) {
  const { hash, valid, token, erro } = loaderData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col">
      <PublicHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {valid && token ? (
            <ValidCard token={token} />
          ) : (
            <InvalidCard hash={hash} erro={erro} />
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

function ValidCard({ token }: { token: TokenInfo }) {
  const total = token.valorUnitario * token.quantidadeLote;
  return (
    <div className="rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/[0.04] overflow-hidden">
      {/* Faixa de status */}
      <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-8 py-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-emerald-400 leading-tight">Token Autêntico</h2>
          <p className="text-sm text-emerald-200/70">Emitido e registrado na plataforma iSelfToken.</p>
        </div>
      </div>

      {/* Quadro de posição */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
        <Metric label="Tokens" value={String(token.quantidadeLote)} />
        <Metric label="Valor unitário" value={brl(token.valorUnitario)} />
        <Metric label="Valor total" value={brl(total)} />
      </div>

      {/* Detalhes */}
      <div className="p-8 space-y-5">
        <Field icon={Building2} label="Startup" value={token.startup} />
        <Field icon={Coins} label="Rodada / Campanha" value={token.campanha} />
        <Field icon={User} label="Investidor" value={token.investidor} />
        <Field icon={Calendar} label="Emitido em" value={dataPtBr(token.emitidoEm)} />
        <Field icon={Hash} label="Hash do token" value={token.hash} mono />
      </div>
    </div>
  );
}

function InvalidCard({ hash, erro }: { hash: string; erro: boolean }) {
  return (
    <div className="rounded-3xl border-2 border-red-500/30 bg-red-500/[0.04] p-10 text-center space-y-5">
      <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
        <ShieldX className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h2 className="text-xl font-black text-red-400">
          {erro ? "Não foi possível verificar" : "Token não encontrado"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {erro
            ? "Ocorreu um erro ao consultar a autenticidade. Tente novamente em instantes."
            : "Nenhum token com este código foi encontrado na plataforma. Verifique se o código está correto."}
        </p>
      </div>
      <p className="text-[11px] font-mono text-muted-foreground/50 break-all bg-black/30 rounded-xl px-4 py-3 border border-white/5">
        {hash}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{label}</p>
      <p className="text-lg font-black text-emerald-400 tracking-tighter">{value}</p>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-emerald-400/80" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</p>
        <p className={`text-foreground ${mono ? "font-mono text-xs break-all mt-1" : "font-bold text-[15px]"}`}>{value}</p>
      </div>
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="w-full border-b border-border/20 bg-slate-950/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 border border-emerald-500/30 flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-lg font-black text-foreground">Verificação de Token</h1>
          <p className="text-sm text-muted-foreground">Plataforma iSelfToken</p>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="w-full border-t border-border/20 bg-slate-950/80 py-6">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Sistema iSelfToken &middot; Tokens de equity crowdfunding &middot;{" "}
          <span className="text-violet-400/80">Resolução CVM 88/2022</span>
        </p>
      </div>
    </footer>
  );
}
