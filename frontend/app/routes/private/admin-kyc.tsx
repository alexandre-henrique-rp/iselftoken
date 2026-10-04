import { AlertCircle, ArrowLeft, RefreshCcw } from "lucide-react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { AdminKycBiofacial } from "~/components/admin/admin-kyc-biofacial";
import { AdminKycDataSummary } from "~/components/admin/admin-kyc-data-summary";
import {
  AdminKycLivenessTelemetry,
  type FaceMatch,
  type LivenessTelemetry,
} from "~/components/admin/admin-kyc-liveness-telemetry";
import { AdminKycDecisionPanel } from "~/components/admin/admin-kyc-decision-panel";
import { AdminKycDocs } from "~/components/admin/admin-kyc-docs";
import { AdminKycHeader } from "~/components/admin/admin-kyc-header";
import { AdminKycList } from "~/components/admin/admin-kyc-list";
import { AdminKycListEmptyState } from "~/components/admin/admin-kyc-list-empty-state";
import { AdminKycListFilters } from "~/components/admin/admin-kyc-list-filters";
import { AdminKycListHeader } from "~/components/admin/admin-kyc-list-header";
import { AdminKycListSkeleton } from "~/components/admin/admin-kyc-list-skeleton";
import { AdminKycResidence } from "~/components/admin/admin-kyc-residence";
import { DashboardBackgroundWatermark } from "~/components/founder/dashboard-background-watermark";
import { useAdminKycQueueQuery } from "~/hooks/use-admin-kyc";
import type { KycDoc } from "~/lib/kyc-status";
import { serverFetch } from "~/lib/server-fetch";
import type { Route } from "./+types/admin-kyc";

interface KycDocuments {
  avatar: KycDoc | null;
  comprovante: KycDoc | null;
  documento: KycDoc | null;
  biofacial: KycDoc | null;
}

const EMPTY_DOCS: KycDocuments = {
  avatar: null,
  comprovante: null,
  documento: null,
  biofacial: null,
};

export function meta() {
  return [
    { title: "KYC | Admin | iSelfToken" },
    {
      name: "description",
      content:
        "Verificação e aprovação de identidade dos usuários cadastrados.",
    },
  ];
}

function detailError(message: string) {
  return {
    mode: "detail" as const,
    user: null,
    documents: EMPTY_DOCS,
    riskScore: 0,
    activity: null,
    livenessTelemetry: null,
    faceMatch: null,
    detailError: message,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (userId) {
    try {
      // serverFetch propaga o cookie do browser para o backend.
      const res = await serverFetch(
        request,
        `/api/admin/kyc/${encodeURIComponent(userId)}`,
      );
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.error) {
        const status = json?.codigo ?? res.status;
        return detailError(
          status === 404
            ? "Usuário não encontrado para revisão de KYC."
            : "Não foi possível carregar os dados KYC deste usuário.",
        );
      }

      const data = json?.data ?? {};
      return {
        mode: "detail" as const,
        user: data.user ?? null,
        documents: (data.documents ?? EMPTY_DOCS) as KycDocuments,
        riskScore: data.riskScore ?? 0,
        activity: data.activity ?? null,
        livenessTelemetry: data.livenessTelemetry ?? null,
        faceMatch: data.faceMatch ?? null,
        detailError: null,
      };
    } catch {
      return detailError("Não foi possível conectar ao serviço de KYC.");
    }
  }

  return {
    mode: "list" as const,
    filters: {
      search: url.searchParams.get("search") || "",
      kycStatus: url.searchParams.get("kycStatus") || "",
    },
  };
}

const DECISIONS = {
  "approve-kyc": "APPROVED",
  "request-resubmit": "NEEDS_RESUBMISSION",
  "reject-kyc": "REJECTED",
  "revoke-kyc": "REVOKE",
} as const;

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const kycProfileId = String(formData.get("kycProfileId") || "");
  const intent = String(formData.get("intent") || "") as keyof typeof DECISIONS;
  const decision = DECISIONS[intent];
  const reason = String(formData.get("justification") || "").trim();

  if (!kycProfileId || !decision) {
    return Response.json(
      { success: false, error: "Dados da decisão incompletos." },
      { status: 400 },
    );
  }

  if (
    (decision === "REJECTED" || decision === "NEEDS_RESUBMISSION") &&
    !reason
  ) {
    return Response.json(
      {
        success: false,
        error: "Informe o motivo para rejeitar ou solicitar reenvio.",
      },
      { status: 400 },
    );
  }

  const response = await serverFetch(
    request,
    `/api/admin/kyc/${encodeURIComponent(kycProfileId)}/decide`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason: reason || undefined }),
    },
  );
  const payload = await response.json().catch(() => null);
  const failed = !response.ok || payload?.error;

  return Response.json(
    failed
      ? {
          success: false,
          error: payload?.message || "Não foi possível registrar a decisão.",
        }
      : { success: true, message: payload?.message || "Decisão registrada." },
    { status: failed ? payload?.codigo || response.status : 200 },
  );
}

function deriveKycStatus(documents: KycDocuments) {
  const statuses = Object.values(documents)
    .map((doc) => doc?.status)
    .filter((status): status is string => !!status);
  if (statuses.includes("REJECTED")) return "REJECTED";
  if (statuses.includes("NEEDS_RESUBMISSION")) return "NEEDS_RESUBMISSION";
  if (
    statuses.some((status) => status === "PENDING" || status === "UNDER_REVIEW")
  )
    return "PENDING";
  if (statuses.length > 0 && statuses.every((status) => status === "APPROVED"))
    return "APPROVED";
  return "PENDING";
}

function formatReceivedAt(documents: KycDocuments) {
  const dates = Object.values(documents)
    .map((doc) => doc?.createdAt)
    .filter(Boolean)
    .map((date) => new Date(String(date)))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  return dates[0]?.toLocaleDateString("pt-BR") ?? "—";
}

export default function AdminKycPage() {
  const loaderData = useLoaderData() as
    | {
        mode: "list";
        filters: { search: string; kycStatus: string };
      }
    | {
        mode: "detail";
        user: any;
        documents: KycDocuments;
        riskScore: number;
        activity: any;
        livenessTelemetry: LivenessTelemetry | null;
        faceMatch: FaceMatch | null;
        detailError: string | null;
      };

  if (loaderData.mode === "list") {
    return <AdminKycListView filters={loaderData.filters} />;
  }

  return <AdminKycDetailView loaderData={loaderData} />;
}

function AdminKycListView({
  filters,
}: {
  filters: { search: string; kycStatus: string };
}) {
  const [params] = useSearchParams();
  const page = Number(params.get("page") || "1");
  const { data, isLoading, isError, refetch } = useAdminKycQueueQuery({
    page,
    search: filters.search,
    kycStatus: filters.kycStatus,
  });

  const users = (data?.users ?? []) as Array<{
    id: number;
    nome: string;
    email: string;
    role?: string;
    createdAt: string;
    kycStatus:
      | "aprovado"
      | "pendente"
      | "rejeitado"
      | "reenvio"
      | "nao_enviado";
  }>;
  const total = data?.total ?? 0;
  const currentPage = data?.pagina ?? page;
  const PAGE_LIMIT = 25;
  const hasActiveFilters = Boolean(filters.search || filters.kycStatus);

  return (
    <main className="min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
      <div className="relative w-full max-w-7xl xl:max-w-[1400px] mx-auto">
        <DashboardBackgroundWatermark />

        {isError ? (
          <div
            className="glass-panel rounded-3xl p-10 text-center space-y-4"
            role="alert"
          >
            <AlertCircle
              className="w-10 h-10 text-destructive mx-auto"
              aria-hidden
            />
            <p className="text-destructive text-sm font-bold">
              Não foi possível carregar a fila de KYC do banco de dados.
            </p>
            <p className="text-muted-foreground text-xs">
              Verifique a conexão com o backend e tente novamente.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 px-6 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition inline-flex items-center gap-2"
            >
              <RefreshCcw className="w-3.5 h-3.5" aria-hidden />
              Tentar novamente
            </button>
          </div>
        ) : isLoading ? (
          <AdminKycListSkeleton />
        ) : users.length === 0 && !hasActiveFilters ? (
          <div className="space-y-6 sm:space-y-8">
            <AdminKycListHeader total={0} />
            <AdminKycListFilters filters={filters} />
            <AdminKycListEmptyState hasActiveFilters={false} />
          </div>
        ) : (
          <AdminKycList
            users={users}
            filters={filters}
            pagination={{
              page: currentPage,
              limit: PAGE_LIMIT,
              total,
              totalPages: Math.max(1, Math.ceil(total / PAGE_LIMIT)),
            }}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </div>
    </main>
  );
}

function AdminKycDetailView({
  loaderData,
}: {
  loaderData: {
    user: any;
    documents: KycDocuments;
    riskScore: number;
    activity: any;
    livenessTelemetry: LivenessTelemetry | null;
    faceMatch: FaceMatch | null;
    detailError: string | null;
  };
}) {
  if (loaderData.detailError) {
    return (
      <main className="min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
        <div className="relative w-full max-w-7xl xl:max-w-[1400px] mx-auto">
          <DashboardBackgroundWatermark />
          <Link
            to="/admin/users"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-xs font-black uppercase tracking-widest mb-6 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden />
            Voltar
          </Link>
          <div
            className="glass-panel rounded-3xl p-10 text-center space-y-4"
            role="alert"
          >
            <AlertCircle
              className="w-10 h-10 text-destructive mx-auto"
              aria-hidden
            />
            <p className="text-destructive text-sm font-bold">
              {loaderData.detailError}
            </p>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 mt-2 px-6 py-2 rounded-full bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition"
            >
              Voltar à fila
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { user, documents, riskScore, activity, livenessTelemetry, faceMatch } =
    loaderData;
  const protocol = user?.publicId
    ? `#${String(user.publicId).slice(0, 8).toUpperCase()}`
    : "—";
  const name = user?.nome || "Usuário sem nome";
  const userType = user?.tipo_documento || "Perfil individual";

  return (
    <main className="min-h-screen pt-3 pb-6 px-1.5 md:pt-4 md:pb-8 md:px-0">
      <div className="relative w-full max-w-7xl xl:max-w-[1400px] mx-auto">
        <DashboardBackgroundWatermark />

        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-xs font-black uppercase tracking-widest mb-6 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          Voltar à fila
        </Link>

        <AdminKycHeader
          protocol={protocol}
          receivedAt={formatReceivedAt(documents)}
          name={name}
          userType={userType}
          status={deriveKycStatus(documents)}
        />

        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6">
          <div className="space-y-4 lg:col-span-8">
            <AdminKycDocs documents={documents} />
            <AdminKycBiofacial biofacial={documents?.biofacial} />
            <AdminKycResidence comprovante={documents?.comprovante} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:col-span-4">
            <AdminKycDataSummary
              user={user}
              riskScore={riskScore}
              activity={activity}
            />
            <AdminKycLivenessTelemetry
              telemetry={livenessTelemetry}
              faceMatch={faceMatch}
            />
            <AdminKycDecisionPanel documents={documents} />
          </aside>
        </div>

        <footer className="mt-8 border-t border-white/10 pt-5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/50">
          Revisão administrativa de identidade · iSelfToken
        </footer>
      </div>
    </main>
  );
}
