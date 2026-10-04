import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useLoaderData, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { BACKEND_URL } from "~/lib/api-config";

export function meta() {
  return [
    { title: "Pagamento da Startup | iSelfToken" },
    {
      name: "description",
      content:
        "Finalize o pagamento da sua startup com PIX ou Cartão de Crédito.",
    },
  ];
}

interface Product {
  purpose: string;
  amount: number;
}

interface LoaderData {
  campaignId: string;
  products: Product[];
  totalAmount: number;
  campaign?: any;
  startup?: any;
}

export async function loader({
  params,
  request,
}: any): Promise<LoaderData | Response> {
  const { id } = params;
  if (!id) {
    return Response.json(
      { error: "ID da startup não fornecido" },
      { status: 400 },
    );
  }

  const cookie = request.headers.get("cookie") ?? "";

  // Busca a startup para obter a campanha associada
  const startupRes = await fetch(`${BACKEND_URL}/startup/${id}`, {
    headers: { Cookie: cookie },
  });

  if (!startupRes.ok) {
    if (startupRes.status === 401) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/login" },
      });
    }
    return Response.json({ error: "Startup não encontrada" }, { status: 404 });
  }

  const startupData = await startupRes.json();
  const startup = startupData.data || startupData;

  // Buscar campaignId a partir da startup (campanha mais recente)
  const campaigns = startup.campaigns || [];
  const activeCampaign =
    campaigns.find((c: any) => c.status === "OPEN" || c.status === "DRAFT") ||
    campaigns[0];

  const campaignId = activeCampaign?.id;

  return {
    campaignId: campaignId ? String(campaignId) : id,
    products: [],
    totalAmount: 0,
    campaign: activeCampaign || null,
    startup,
  };
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function StartupCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loaderData = useLoaderData<typeof loader>();

  const stateProducts =
    (location.state as { products?: Product[]; paymentId?: number })
      ?.products || [];
  const statePaymentId = (location.state as { paymentId?: number })?.paymentId;
  const products =
    stateProducts.length > 0 ? stateProducts : loaderData.products;

  const totalAmount = products.reduce((sum, p) => sum + p.amount, 0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      // Simulação de pagamento: marca como PAID (usa paymentId existente se disponível)
      const res = await fetch("/api/payment/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method: "PIX",
          products,
          paymentId: statePaymentId || undefined,
          campaignId: !statePaymentId
            ? Number(loaderData.campaignId)
            : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(
          json.message ||
            json.detalhe?.message ||
            "Falha ao processar pagamento",
        );
      }

      toast.success(
        "Pagamento confirmado com sucesso! Sua startup será analisada pela curadoria.",
      );
      navigate("/founder/dashboard");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao processar pagamento";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (products.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-muted-foreground">
          Nenhum produto encontrado para pagamento.
        </p>
        <Link to="/founder/dashboard" className="text-primary hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative max-w-4xl mx-auto px-4 py-12 space-y-10">
      <header className="space-y-3">
        <Link
          to="/founder/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">
          Finalize o pagamento da sua startup
        </h1>
      </header>

      <div className="rounded-2xl border border-border bg-accent/5 p-6 space-y-4">
        <h2 className="font-bold text-lg">Resumo do pagamento</h2>
        <div className="space-y-2">
          {products.map((product, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {product.purpose === "TOKEN_RESERVATION"
                  ? "Reserva de Tokens"
                  : "Fast Track Review"}
              </span>
              <span className="font-bold">{formatBRL(product.amount)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-4 flex justify-between items-center">
          <span className="font-bold text-lg">Total</span>
          <span className="font-black text-xl">{formatBRL(totalAmount)}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-accent/10 p-5 text-sm text-muted-foreground space-y-1">
        <p className="font-semibold text-foreground">
          Simulação de pagamento (dev)
        </p>
        <p>
          Ao confirmar, o pagamento será processado automaticamente como{" "}
          <strong>PAGO</strong> e sua campanha será ativada.
        </p>
      </div>

      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Processando..." : `Pagar ${formatBRL(totalAmount)}`}
      </button>
    </div>
  );
}
