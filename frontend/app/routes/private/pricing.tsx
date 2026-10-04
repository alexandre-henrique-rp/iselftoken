import {
  BadgeCheck,
  BarChart3,
  Crown,
  Handshake,
  Rocket,
  Sparkles,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { toast } from "sonner";
import { PricingCard } from "~/components/pricing/pricing-card";
import { PricingHeader } from "~/components/pricing/pricing-header";
import { usePricingSubscriptionMutation } from "~/hooks/use-pricing-subscription-mutation";
import { useUser } from "~/hooks/use-user";
import type { Route } from "./+types/pricing";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Planos e Preços | iSelfToken" },
    {
      name: "description",
      content:
        "Conheça os planos investidor e fundador da iSelfToken e impulsione seus resultados.",
    },
  ];
}

interface Plan {
  id: number;
  nome: string;
  slug: string;
  descricao: string | null;
  preco: number;
  periodo: string;
  periodoMeses: number;
  icon: string | null;
  beneficios: string[] | null;
  visivel: boolean;
  isActive: boolean;
  recomendado: boolean;
  textoBotao?: string | null;
}

interface LoaderData {
  planos: Plan[];
  error: string | null;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Rocket,
  BarChart3,
  Sparkles,
  Crown,
  BadgeCheck,
  Handshake,
  TrendingUp,
};

function getPlanIcon(name: string | null): LucideIcon {
  if (!name) return Sparkles;
  return ICON_MAP[name] ?? Sparkles;
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value || 0);
}

const PLAN_EYEBROW: Record<string, string> = {
  "plano-fundador": "Para Captar",
  "plano-investidor": "Para Investir",
  "plano-afiliado": "Para Conectar Oportunidades",
};

export async function loader({
  request,
}: Route.LoaderArgs): Promise<LoaderData> {
  const url = new URL(request.url);
  const cookie = request.headers.get("cookie") ?? "";

  const res = await fetch(`${url.protocol}//${url.host}/api/plans`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) {
    return {
      planos: [],
      error:
        "Não foi possível carregar os planos. Tente novamente em instantes.",
    };
  }

  const body = (await res.json()) as { data?: Plan[] } | Plan[];
  const list = Array.isArray(body) ? body : (body?.data ?? []);
  const planos = list.filter((p) => p.visivel && p.isActive);

  return { planos, error: null };
}

export default function PricingPage() {
  const { planos, error } = useLoaderData<LoaderData>();
  const { user } = useUser();
  const navigate = useNavigate();
  const [submittingPlanId, setSubmittingPlanId] = useState<number | null>(null);

  // A mutation cria uma assinatura PENDING e o pagamento do plano escolhido.
  // Planos ACTIVE diferentes coexistem; nenhum deles é cancelado aqui.
  const subscriptionMutation = usePricingSubscriptionMutation();

  const isSubmitting = (planId: number) =>
    subscriptionMutation.isPending && submittingPlanId === planId;

  const activePlanIds = new Set(
    (user?.subscriptions ?? [])
      .filter((sub) => sub.status === "ACTIVE" && sub.planId != null)
      .map((sub) => sub.planId as number),
  );

  const handlePlanClick = (plan: Plan) => {
    if (subscriptionMutation.isPending) return;

    // CASE.md §Planos — bloqueia apenas o plano que já está ativo.
    if (activePlanIds.has(plan.id)) {
      toast.info("Você já possui este plano ativo.", {
        description: `Seu plano "${plan.nome}" já está ativo. Escolha outro plano para adicionar ao seu perfil.`,
        duration: 5000,
      });
      return;
    }

    void handleCheckout(plan);
  };

  const handleCheckout = async (plan: Plan) => {
    if (!user) return;
    setSubmittingPlanId(plan.id);

    try {
      await subscriptionMutation.mutateAsync({
        plan: { id: plan.id, preco: plan.preco, nome: plan.nome },
        currentSubscription: null,
        userId: Number(user.id),
        navigateToCheckout: (paymentId) =>
          navigate(`/checkout/payment/${paymentId}`),
      });
    } finally {
      setSubmittingPlanId(null);
    }
  };

  return (
    <div className="relative min-h-[80vh] flex flex-col items-center justify-center">
      {/* Background Watermark */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10 opacity-[0.02]">
        <div className="absolute -top-[10%] -left-[5%] text-[30vw] font-black tracking-tighter select-none">
          iS
        </div>
        <div className="absolute -bottom-[10%] -right-[5%] text-[30vw] font-black tracking-tighter select-none">
          TK
        </div>
      </div>

      {/* Decorative Side Element */}
      <div className="hidden lg:block fixed left-12 top-1/2 -translate-y-1/2 h-64 w-px bg-linear-to-b from-transparent via-primary/40 to-transparent">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/20"></div>
      </div>

      <div className="w-full max-w-6xl mx-auto py-4">
        <PricingHeader />

        {error ? (
          <div className="text-center text-muted-foreground py-12">{error}</div>
        ) : planos.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            Nenhum plano disponível no momento.
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4 lg:gap-6 items-stretch px-4">
            {planos.map((plano) => {
              const isCurrent = activePlanIds.has(plano.id);
              const badge = isCurrent
                ? "Perfil atual"
                : plano.recomendado
                  ? "Recomendado"
                  : plano.periodo;
              const eyebrow = PLAN_EYEBROW[plano.slug];
              const cta = isCurrent
                ? "Perfil atual"
                : isSubmitting(plano.id)
                  ? "Ativando..."
                  : plano.textoBotao?.trim() ||
                    (activePlanIds.size > 0 ? "Adicionar plano" : "Começar agora");
              return (
                <div
                  key={plano.id}
                  className="w-full sm:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-1rem)] max-w-sm flex"
                >
                  <PricingCard
                    title={plano.nome}
                    badge={badge}
                    eyebrow={eyebrow}
                    price={formatPrice(plano.preco)}
                    period={plano.periodo}
                    description={plano.descricao ?? ""}
                    icon={getPlanIcon(plano.icon)}
                    isFeatured={false}
                    cta={cta}
                    features={plano.beneficios ?? []}
                    onClick={() => handlePlanClick(plano)}
                    disabled={isCurrent || subscriptionMutation.isPending}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
