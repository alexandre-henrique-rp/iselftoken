import { useActionData, useNavigation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Building2, Clock, Users } from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/founder-affiliate-triagem";
import { serverFetch } from "~/lib/server-fetch";
import type { Candidatura } from "~/lib/affiliate-types";
import { AffiliateCandidaturaCard } from "~/components/affiliate/affiliate-candidatura-card";
import { AffiliateTriagemModal } from "~/components/affiliate/affiliate-triagem-modal";
import { AffiliateHistoryTable } from "~/components/affiliate/affiliate-history-table";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Triagem de Afiliados | iSelfToken" },
    {
      name: "description",
      content: "Aprove afiliados e defina os tokens à venda.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const startupIdParam = url.searchParams.get("startupId");
  const qs = startupIdParam
    ? `?startupId=${encodeURIComponent(startupIdParam)}`
    : "";

  try {
    const res = await serverFetch(request, `/api/founder/affiliate/affiliations${qs}`);
    const json = await res.json().catch(() => null);
    const data: Candidatura[] = json?.data ?? [];
    if (!res.ok || json?.error) {
      return {
        candidaturas: data,
        startupFiltrada: null,
        erro: json?.message ?? "Não foi possível carregar as candidaturas.",
      };
    }
    return {
      candidaturas: data,
      startupFiltrada: startupIdParam ? (data[0]?.startup ?? null) : null,
      erro: null,
    };
  } catch {
    return {
      candidaturas: [] as Candidatura[],
      startupFiltrada: null,
      erro: "Erro de conexão.",
    };
  }
}

export async function action({ request }: Route.ActionArgs) {
  const fd = await request.formData();
  const id = fd.get("id");
  const intent = fd.get("intent");
  if (!id) return { success: false, error: "Candidatura inválida." };

  const body: Record<string, unknown> = {};
  if (intent === "approve") {
    const tokens = Number(fd.get("tokensAllocated"));
    if (!tokens || tokens < 1) {
      return { success: false, error: "Informe uma quantidade de tokens válida." };
    }
    body.decision = "APPROVED";
    body.tokensAllocated = tokens;
  } else if (intent === "reject") {
    const reason = String(fd.get("reason") || "").trim();
    if (!reason) return { success: false, error: "Informe o motivo da rejeição." };
    body.decision = "REJECTED";
    body.reason = reason;
  } else {
    return { success: false, error: "Ação inválida." };
  }

  try {
    const res = await serverFetch(
      request,
      `/api/founder/affiliate/affiliations/${id}/decide`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) {
      return {
        success: false,
        error: json?.message ?? "Não foi possível concluir a decisão.",
      };
    }
    return { success: true, message: json?.message ?? "Decisão registrada!" };
  } catch {
    return { success: false, error: "Erro de conexão." };
  }
}

export default function FounderAffiliateTriagemPage({
  loaderData,
}: Route.ComponentProps) {
  const { candidaturas, startupFiltrada, erro } = loaderData;
  const nav = useNavigation();
  const actionData = useActionData<typeof action>();
  const enviando = nav.state !== "idle";
  const ultimo = useRef<unknown>(null);
  const [modal, setModal] = useState<{
    id: number;
    tipo: "approve" | "reject";
  } | null>(null);

  useEffect(() => {
    if (!actionData || actionData === ultimo.current) return;
    ultimo.current = actionData;
    if (actionData.success) {
      toast.success(actionData.message ?? "Decisão registrada!");
      setModal(null);
    } else if (actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  const pendentes = candidaturas.filter((c) => c.status === "PENDING_FOUNDER");
  const historico = candidaturas.filter((c) => c.status !== "PENDING_FOUNDER");
  const alvo = modal ? candidaturas.find((c) => c.id === modal.id) ?? null : null;

  return (
    <div className="relative max-w-[1400px] mx-auto space-y-10">
      <header>
        <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
          Programa de Afiliados
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
          Triagem de Afiliados
        </h1>
        <p className="text-muted-foreground text-sm mt-3 max-w-xl">
          Analise quem quer divulgar suas startups. Ao aprovar, defina quantos tokens
          ficam disponíveis para o afiliado vender.
        </p>
      </header>

      {startupFiltrada && (
        <div className="mb-4 flex items-center gap-3 px-5 py-3 rounded-2xl bg-primary/5 border border-primary/20">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-sm">
            Filtrando por: <strong>{startupFiltrada.nome}</strong>
          </span>
          <Link
            to="/founder/affiliate/triagem"
            className="ml-auto text-[10px] text-primary hover:underline uppercase tracking-widest font-black"
          >
            Ver todas as startups
          </Link>
        </div>
      )}

      {erro ? (
        <div className="glass-panel rounded-3xl p-12 text-center">
          <p className="text-muted-foreground font-medium">{erro}</p>
        </div>
      ) : (
        <>
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground">
                Aguardando sua decisão ({pendentes.length})
              </h2>
            </div>

            {pendentes.length === 0 ? (
              <div className="glass-panel rounded-3xl p-12 text-center">
                <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma candidatura pendente no momento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pendentes.map((c) => (
                  <AffiliateCandidaturaCard
                    key={c.id}
                    candidatura={c}
                    onAprovar={() => setModal({ id: c.id, tipo: "approve" })}
                    onRejeitar={() => setModal({ id: c.id, tipo: "reject" })}
                  />
                ))}
              </div>
            )}
          </section>

          {historico.length > 0 && <AffiliateHistoryTable rows={historico} />}
        </>
      )}

      {modal && alvo && (
        <AffiliateTriagemModal
          candidatura={alvo}
          intent={modal.tipo}
          loading={enviando}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
