/**
 * Pagina: Compliance Repasses.
 * Path: /compliance/repasses
 *
 * Lista campanhas FUNDED com repasse pendente + delibernes ja aprovadas.
 * Modal para deliberar aciona `useComplianceDeliberate`.
 */
import { useState } from "react";
import { useLoaderData } from "react-router";
import { Scale, Shield } from "lucide-react";
import { serverFetch } from "~/lib/server-fetch";
import { RepasseDeliberationModal } from "~/components/compliance/repasse-deliberation-modal";
import { cn } from "~/lib/utils";
import type { Repasse } from "~/types/repasse";

interface PendingCampaign {
  id: number;
  startup: { id: number; nome: string } | null;
  repasse: Repasse | null;
}

interface ApprovedDeliberation {
  id: number;
  startup: { id: number; nome: string } | null;
  repasse: Repasse;
}

interface ComplianceRepassesData {
  pending: PendingCampaign[];
  approved: ApprovedDeliberation[];
}

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

export function meta() {
  return [{ title: "Compliance · Repasses | iSelfToken" }];
}

export async function loader({ request }: { request: Request }) {
  const cookie = request.headers.get("cookie") ?? "";
  const headers = { Accept: "application/json", ...(cookie && { cookie }) };

  const [pendingRes, approvedRes] = await Promise.all([
    fetch(`${BACKEND_URL}/compliance/repasses/pending`, {
      headers,
      credentials: "include",
    }).catch(() => null),
    fetch(`${BACKEND_URL}/compliance/repasses/approved`, {
      headers,
      credentials: "include",
    }).catch(() => null),
  ]);

  const safe = async (res: Response | null): Promise<unknown> => {
    if (!res) return [];
    if (!res.ok) return [];
    const body = (await res.json().catch(() => null)) as { data?: unknown } | null;
    return body?.data ?? [];
  };

  const [pending, approved] = await Promise.all([safe(pendingRes), safe(approvedRes)]);

  // sem backend real, mantem arrays vazios
  void serverFetch;

  return {
    pending: Array.isArray(pending) ? (pending as PendingCampaign[]) : [],
    approved: Array.isArray(approved) ? (approved as ApprovedDeliberation[]) : [],
  };
}

export default function ComplianceRepassesPage() {
  const { pending, approved } = useLoaderData() as ComplianceRepassesData;
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<PendingCampaign | null>(null);

  function openDeliberation(campaign: PendingCampaign) {
    setSelected(campaign);
    setModalOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-primary" />
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            compliance · repasses
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
            Deliberacoes
          </h1>
        </div>
      </header>

      <section className="space-y-3" data-testid="compliance-pending">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Repasses pendentes
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
            Nenhuma campanha FUNDED aguardando deliberacao.
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pending.map((c) => (
              <li
                key={c.id}
                data-testid={`pending-campaign-${c.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-card/60 p-4"
              >
                <div>
                  <p className="text-sm font-bold">{c.startup?.nome ?? `Startup #${c.id}`}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {c.repasse ? "Repasse ja criado (sem deliberacao)" : "Aguardando deliberacao"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openDeliberation(c)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-widest",
                    "bg-primary text-primary-foreground hover:opacity-90 active:scale-95",
                  )}
                  data-testid={`deliberate-${c.id}`}
                >
                  <Scale className="h-4 w-4" /> Deliberar Parcelas
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" data-testid="compliance-approved">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Deliberacoes aprovadas
        </h2>
        {approved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 p-6 text-center text-sm text-muted-foreground">
            Nenhuma deliberacao aprovada ate o momento.
          </div>
        ) : (
          <ul className="rounded-2xl border border-border/40 bg-card/40 divide-y divide-border/40 overflow-hidden">
            {approved.map((c) => (
              <li
                key={c.repasse.id}
                data-testid={`approved-campaign-${c.repasse.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-bold">{c.startup?.nome ?? `Startup #${c.id}`}</p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {c.repasse.numeroParcelas} parcelas · valor total R${" "}
                    {Number(c.repasse.valorTotalCaptacao).toFixed(2)}
                  </p>
                </div>
                {c.repasse.complianceApprovedAt && (
                  <span className="text-[10px] uppercase tracking-widest text-emerald-300">
                    {new Date(c.repasse.complianceApprovedAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <RepasseDeliberationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            /* repassa por invalidação via TanStack Query no hook */
          }}
          campaign={{
            id: selected.id,
            startup: selected.startup,
            repasse: selected.repasse,
          }}
        />
      )}
    </div>
  );
}
