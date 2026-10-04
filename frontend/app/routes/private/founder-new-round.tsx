import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "react-router";
import { NewCaptacaoFromStep3 } from "~/components/founder/new-captacao-from-step3";
import type { Route } from "./+types/founder-new-round";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:7077";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Abrir nova rodada | iSelfToken" },
    { name: "description", content: "Abra uma nova rodada de captação." },
  ];
}

// ==========================================
// GATE COMPLETO — PRD CAPTACAO.md §4.11
// A página NÃO é renderizada se qualquer pré-condição falha.
// Redirect para dashboard com toast explicativo.
// ==========================================

interface LoaderData {
  startupId: string;
  nome: string | null;
  status: string | null;
  blocked: false;
}

/**
 * Mensagens de bloqueio conforme PRD §3.4 e §4.11
 */
const BLOCK_MESSAGES: Record<string, string> = {
  STATUS_INVALIDO:
    "Esta startup ainda não concluiu todo o fluxo. A abertura de rodada só é liberada após a aprovação.",
  CAMPANHA_ATIVA:
    "Sua captação atual ainda está em andamento. Finalize-a antes de abrir uma nova rodada.",
  CAMPANHA_DRAFT:
    "Sua captação está aguardando aprovação. Não é possível abrir outra rodada.",
  TOKENS_NAO_VENDIDOS:
    "A rodada anterior precisa estar 100% vendida para iniciar uma nova.",
  CARENCIA_3_MESES:
    "É preciso esperar 3 meses desde o encerramento da rodada anterior.",
  SEM_CAMPANHA_ANTERIOR:
    "Não há campanha anterior finalizada. Não é possível abrir nova rodada.",
  // REPASSE_PENDENTE é construído dinamicamente pelo useBlockedRoundToast
  // com base no param `?paid=N` (progresso de parcelas). Mantemos fallback
  // aqui apenas para o caso de o param não vir (defesa).
  REPASSE_PENDENTE:
    "O repasse de fundos da rodada anterior está em andamento. Conclua as parcelas para abrir nova captação.",
};

export async function loader({
  request,
  params,
}: Route.LoaderArgs): Promise<LoaderData> {
  const cookie = request.headers.get("cookie") || "";
  const dashUrl = `/founder/dashboard`;

  // 1. Buscar dados da startup + campanhas
  let startupData: any = null;
  try {
    const res = await fetch(`${BACKEND_URL}/startup/${params.id}`, {
      headers: { accept: "application/json", cookie },
    });
    const j = await res.json().catch(() => null);
    startupData = j?.data ?? j;
  } catch {
    // Se não conseguiu buscar, redireciona
    throw redirect(`${dashUrl}?blocked=STATUS_INVALIDO`);
  }

  if (!startupData) {
    throw redirect(`${dashUrl}?blocked=STATUS_INVALIDO`);
  }

  const nome = startupData?.nome ?? null;
  const status = startupData?.status ?? null;

  // Gate 1: Startup com status APPROVED ou LIVE
  if (!status || !["APPROVED", "LIVE"].includes(status)) {
    throw redirect(`${dashUrl}?blocked=STATUS_INVALIDO`);
  }

  // Buscar campanhas da startup
  let campaigns: any[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/campaigns?startupId=${params.id}`, {
      headers: { accept: "application/json", cookie },
    });
    const j = await res.json().catch(() => null);
    campaigns = j?.data ?? j ?? [];
    if (!Array.isArray(campaigns)) campaigns = [];
  } catch {
    campaigns = [];
  }

  // Gate 2: Nenhuma campanha ativa (OPEN/PAUSED/DRAFT)
  const activeCampaign = campaigns.find((c: any) =>
    ["OPEN", "PAUSED", "DRAFT"].includes(c.status),
  );
  if (activeCampaign) {
    const reason =
      activeCampaign.status === "DRAFT" ? "CAMPANHA_DRAFT" : "CAMPANHA_ATIVA";
    throw redirect(`${dashUrl}?blocked=${reason}`);
  }

  // Gate 3: Existe pelo menos 1 campanha anterior FINALIZADA
  const finishedCampaigns = campaigns.filter((c: any) =>
    ["CLOSED", "FUNDED", "PAID_OUT"].includes(c.status),
  );
  if (finishedCampaigns.length === 0) {
    throw redirect(`${dashUrl}?blocked=SEM_CAMPANHA_ANTERIOR`);
  }

  // Gate 4: Última campanha 100% vendida
  const lastCampaign = finishedCampaigns.sort(
    (a: any, b: any) =>
      new Date(b.closedAt || b.updatedAt).getTime() -
      new Date(a.closedAt || a.updatedAt).getTime(),
  )[0];

  if (lastCampaign.tokensSold < lastCampaign.totalTokens) {
    throw redirect(`${dashUrl}?blocked=TOKENS_NAO_VENDIDOS`);
  }

  // Gate 5: Carência de 3 meses cumprida
  const closedAt = lastCampaign.closedAt
    ? new Date(lastCampaign.closedAt)
    : null;
  if (closedAt) {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    if (closedAt > threeMonthsAgo) {
      throw redirect(`${dashUrl}?blocked=CARENCIA_3_MESES`);
    }
  }

  // Gate 6: Repasse de fundos concluído (PAID_OUT). Enquanto a campanha
  // estiver com repasse em andamento (FUNDED com parcelas PENDING), a
  // abertura de nova captação fica bloqueada. Sprint S34-d: passamos
  // `&paid=N` no redirect para que o toast (`useBlockedRoundToast`)
  // mostre progresso concreto (N de 3 parcelas pagas).
  if (lastCampaign.status !== "PAID_OUT") {
    let paidCount = 0;
    try {
      const repasseRes = await fetch(
        `${BACKEND_URL}/founder/startups/${params.id}/repasse/dashboard`,
        { headers: { accept: "application/json", cookie } },
      );
      if (repasseRes.ok) {
        const j = await repasseRes.json().catch(() => null);
        const transfers = j?.data?.transfers ?? j?.transfers ?? [];
        if (Array.isArray(transfers)) {
          paidCount = transfers.filter(
            (t: any) => t.status === "COMPLETED" || t.status === "PAID",
          ).length;
        }
      }
    } catch {
      // Falha silenciosa — toast usa mensagem genérica.
    }
    throw redirect(
      `${dashUrl}?blocked=REPASSE_PENDENTE${paidCount > 0 ? `&paid=${paidCount}` : ""}`,
    );
  }

  // Todas as pré-condições passaram — renderiza a página
  return { startupId: String(params.id), nome, status, blocked: false };
}

// Status em que a startup já concluiu todo o fluxo (aprovação + taxas).
const FLUXO_CONCLUIDO = ["APPROVED", "LIVE"];

export async function action({ request, params }: Route.ActionArgs) {
  // NOTE: action() mantido para evitar regressão de endpoint em links antigos.
  // A mutation real (useCreateRoundMutation) é disparada pelo client-side Form.
  // Mantemos este action como no-op para que <Form method="post"> não quebre.
  void request;
  void params;
  return null;
}

export default function FounderNewRoundPage({
  loaderData,
}: Route.ComponentProps) {
  const { nome, startupId } = loaderData;

  // O gate no loader garante que se chegou aqui, todas as pré-condições passaram.
  return (
    <div className="relative max-w-3xl mx-auto space-y-8">
      <Link
        to="/founder/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-[11px] font-black uppercase tracking-widest"
      >
        <ArrowLeft className="w-4 h-4" /> Minhas startups
      </Link>

      <header>
        <span className="text-primary text-[10px] font-black tracking-[0.3em] uppercase mb-2 block">
          Captação
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-none">
          Abrir nova rodada
        </h1>
        {nome && (
          <p className="text-muted-foreground text-sm mt-3">
            Startup: <span className="text-foreground font-bold">{nome}</span>
          </p>
        )}
      </header>

      <NewCaptacaoFromStep3 startupId={startupId} startupName={nome} />
    </div>
  );
}