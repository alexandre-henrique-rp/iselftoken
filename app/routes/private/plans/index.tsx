import { useMemo, useState } from "react";
import { useLoaderData, useNavigate, useNavigation } from "react-router";
import { toast } from "sonner";
import type { Route } from "./+types";
import {
  EmptyState,
  PlansGrid,
  PlansHeader,
  PlansSkeleton,
  PromoBanner,
  type PlansResponse,
} from "./components";

interface PlansLoaderData extends PlansResponse {
  error?: string | null;
}

/**
 * @name meta
 * @description Define metadados da página de planos.
 *
 * @returns {Route.MetaDescriptors} Lista de metadados.
 */
export function meta({}: Route.MetaArgs) {
  return [
    { title: "Planos | iSelfToken" },
    {
      name: "description",
      content: "Selecione o plano ideal para sua jornada",
    },
  ];
}

/**
 * @name loader
 * @description Carrega a lista de planos usando a rota interna de API.
 *
 * @param {Route.LoaderArgs} args - Argumentos do loader da rota
 * @returns {Promise<Response>} Resposta JSON com planos e promoção
 */
export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const response = await fetch(`${baseUrl}/api/plans/findall`, {
    method: "GET",
    headers: {
      Cookie: request.headers.get("cookie") ?? "",
    },
  });

  const data = await response.json();
  const payload = data?.data ?? data;
  const planos = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.planos)
      ? payload.planos
      : [];
  const planosVisiveis = planos.filter(
    (plano: PlansResponse["planos"][number]) =>
      Boolean(plano?.visivel) && Boolean(plano?.isActive),
  );

  if (!response.ok || payload?.error) {
    return Response.json(
      {
        planos: [],
        planoAtual: null,
        promocao: null,
        error: payload?.message ?? "Não foi possível carregar os planos.",
      },
      { status: response.status },
    );
  }

  if (!planosVisiveis.length) {
    return Response.json(
      {
        planos: [],
        planoAtual: null,
        promocao: payload?.promocao ?? null,
        error: "Lista de planos indisponível no momento.",
      },
      { status: 200 },
    );
  }

   const user_api = await fetch(`${baseUrl}/api/user/me`, {
    method: "GET",
    headers: {
      Cookie: request.headers.get("cookie") ?? "",
    },
  });

  const user_data = await user_api.json();

  return Response.json(
    {
      planos: planosVisiveis,
      planoAtual: payload?.planoAtual ?? null,
      promocao: payload?.promocao ?? null,
      user: user_data.data,
    },
    { status: 200 },
  );
}

/**
 * @name PlansPage
 * @description Renderiza a página de seleção de planos.
 *
 * @returns {JSX.Element} Página completa de planos.
 */
export default function PlansPage() {
  const data = useLoaderData<PlansLoaderData>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const { user } = data;
  const [selectedPlan, setSelectedPlan] = useState<string | null>(
    data?.planoAtual
      ? String(data.planoAtual)
      : data?.planos?.[0]?.id
        ? String(data.planos[0].id)
        : null,
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoading = navigation.state === "loading";
  const plans = useMemo(() => data?.planos ?? [], [data]);
  const hasError = Boolean(data?.error);

  const parsePlanPrice = (value: string) => {
    const numeric = Number(value.replace(/[^0-9,.-]/g, "").replace(",", "."));
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const handleCheckout = async (plan: PlansResponse["planos"][number]) => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    const unitPrice = parsePlanPrice(plan.preco);

    toast.loading("Iniciando checkout...", {
      id: "checkout-init",
    });

    const response = await fetch("/api/plans/subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        userId: Number(user?.id) ?? 0,
        planId: Number(plan.id),
        planName: plan.nome,
        description: plan.descricao,
        unitPrice,
        quantity: 1,
        currency: "BRA",
        buyer: {
          id: user?.id,
          name: user?.nome ?? "Cliente",
          email: user?.email ?? "cliente@iselftoken.com",
          document: user?.reg_documento ?? "000.000.000-00",
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok || payload?.error) {
      toast.dismiss("checkout-init");
      toast.error(payload?.message ?? "Não foi possível iniciar o checkout.", {
        duration: 5000,
      });
      setIsSubmitting(false);
      return;
    }

    const token = payload?.token ?? payload?.data?.token;

    if (!token) {
      toast.dismiss("checkout-init");
      toast.error("Token de checkout indisponível.", {
        duration: 5000,
      });
      setIsSubmitting(false);
      return;
    }

    toast.dismiss("checkout-init");
    toast.success("Checkout iniciado! Redirecionando...", {
      duration: 2000,
    });

    navigate(`/payment/checkout/${token}`);
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);

    if (typeof window === "undefined") return;

    const analyticsWindow = window as Window & {
      dataLayer?: Array<Record<string, unknown>>;
    };

    analyticsWindow.dataLayer?.push({
      event: "plan_selected",
      planId,
      source: "plans_page",
    });
  };

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-12 text-stone-50 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <PlansHeader
          titulo="Escolha sua taxa de adesão"
          subtitulo="Compare benefícios e escolha o plano que acelera sua jornada"
          validadeMeses={12}
        />

        {isLoading ? (
          <PlansSkeleton />
        ) : hasError ? (
          <EmptyState
            titulo="Não foi possível carregar os planos"
            mensagem={data?.error ?? "Tente novamente em alguns instantes."}
          />
        ) : plans.length ? (
          <PlansGrid
            planos={plans}
            selectedPlan={selectedPlan}
            currentPlan={data?.planoAtual ? String(data.planoAtual) : null}
            onSelect={handleSelectPlan}
            onCheckout={handleCheckout}
          />
        ) : (
          <EmptyState
            titulo="Nenhum plano disponível"
            mensagem="Novos planos serão lançados em breve."
          />
        )}

        {data?.promocao?.codigo ? (
          <PromoBanner
            codigo={data.promocao.codigo}
            desconto={data.promocao.desconto}
          />
        ) : null}
      </div>
    </div>
  );
}
