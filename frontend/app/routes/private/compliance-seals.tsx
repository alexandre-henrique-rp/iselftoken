import type { Route } from "./+types/compliance-seals";
import { Form } from "react-router";
import { useState } from "react";
import { Award, Plus } from "lucide-react";
import type { SealItem } from "~/lib/seal-types";
import { SealCard } from "~/components/compliance/seal-card";
import { SealAssignModal } from "~/components/compliance/seal-assign-modal";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Compliance Seals | iSelfToken" },
    { name: "description", content: "Gestão de selos de compliance." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const res = await fetch("/api/admin/seals");
  const json = await res.json().catch(() => null);
  const seals: SealItem[] = json?.data ?? [];
  return { seals };
}

export default function ComplianceSealsPage({
  loaderData,
}: Route.ComponentProps) {
  const { seals } = loaderData;
  const [assignOpen, setAssignOpen] = useState(false);

  const ativos = seals.filter((s) => s.active).length;
  const inativos = seals.length - ativos;

  return (
    <div className="relative max-w-[1600px] mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
            Compliance
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-none">
            Selos <span className="text-primary italic">Compliance</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl">
            Catálogo de selos de confiança atribuídos a startups. Crie,
            ative/desative e gerencie o ciclo de vida.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest">
            {ativos} ativos
          </span>
          <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-muted-foreground text-xs font-black uppercase tracking-widest">
            {inativos} inativos
          </span>
        </div>
      </header>

      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled
          title="Upload de novo selo será implementado em sprint futura (multipart + AdminGuard)"
          className="px-5 py-2.5 rounded-full bg-accent/30 text-muted-foreground/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" /> Novo Selo (em breve)
        </button>
      </div>

      {seals.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center">
          <Award className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-lg font-black text-foreground">
            Nenhum selo cadastrado.
          </p>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Os selos são cadastrados via seed ou pelo backend POST /admin/seals
            (multipart). Assim que houver um cadastro, ele aparecerá aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seals.map((seal) => (
            <SealCard key={seal.id} seal={seal} adminActions />
          ))}
        </div>
      )}

      <section className="glass-panel rounded-3xl p-6 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
            Atribuir selo a uma startup
          </h2>
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            disabled={seals.filter((s) => s.active).length === 0}
            className="px-4 py-2 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" /> Nova atribuição
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Selecione uma startup específica na próxima tela (a partir da página
          de detalhe) para escolher o selo e definir metadata opcional.
        </p>
        <Form
          method="post"
          action="/compliance/startups"
          className="flex items-center gap-2"
        >
          <input
            type="search"
            name="q"
            placeholder="Buscar startup por nome ou CNPJ…"
            className="flex-1 bg-accent/30 border border-white/10 rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-full bg-accent/40 text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-primary/15 transition-all"
          >
            Buscar
          </button>
        </Form>
      </section>

      {assignOpen && (
        <SealAssignModal
          startupId={0}
          availableSeals={seals}
          currentAssignments={[]}
          onClose={() => setAssignOpen(false)}
        />
      )}
    </div>
  );
}
