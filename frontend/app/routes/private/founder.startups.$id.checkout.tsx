import { useLoaderData, useNavigate, useLocation } from "react-router";
import { useState } from "react";
import { QrCode, CreditCard, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export function meta() {
  return [
    { title: "Pagamento da Startup | iSelfToken" },
    { name: "description", content: "Escolha PIX ou Cartão de Crédito para finalizar o pagamento." },
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
}

export async function loader({ params, request }: any): Promise<LoaderData | Response> {
  const { id } = params;
  if (!id) {
    return Response.json({ error: "ID da campanha não fornecido" }, { status: 400 });
  }

  // Os produtos vêm do state do navigate, mas precisamos validar a campanha
  const cookie = request.headers.get("cookie") ?? "";
  const res = await fetch(`${BACKEND_URL}/campaigns/${id}`, {
    headers: { Cookie: cookie },
  });

  if (!res.ok) {
    if (res.status === 401) {
      return new Response(null, { status: 302, headers: { Location: "/login" } });
    }
    return Response.json({ error: "Campanha não encontrada" }, { status: 404 });
  }

  const campaign = await res.json();

  return {
    campaignId: id,
    products: [], // Será preenchido pelo state do navigate
    totalAmount: 0, // Será preenchido pelo state do navigate
    campaign: campaign.data || campaign,
  };
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

type PaymentMethod = "PIX" | "CREDIT_CARD";

export default function StartupCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const loaderData = useLoaderData<typeof loader>();
  
  // Produtos vêm do state do navigate
  const stateProducts = (location.state as { products?: Product[] })?.products || [];
  const products = stateProducts.length > 0 ? stateProducts : loaderData.products;
  
  const totalAmount = products.reduce((sum, p) => sum + p.amount, 0);
  const [method, setMethod] = useState<PaymentMethod>("PIX");
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method,
          products,
          campaignId: loaderData.campaignId,
        }),
      });
      
      const json = await res.json();
      
      if (!res.ok || json.error) {
        throw new Error(json.message || json.error || "Falha ao criar pagamento");
      }
      
      const paymentId = json.data?.id || json.id;
      toast.success("Pagamento criado com sucesso!");
      navigate(`/checkout/payment/${paymentId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar pagamento");
    } finally {
      setIsProcessing(false);
    }
  };

  if (products.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-muted-foreground">Nenhum produto encontrado para pagamento.</p>
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

      {/* Resumo dos produtos */}
      <div className="rounded-2xl border border-border bg-accent/5 p-6 space-y-4">
        <h2 className="font-bold text-lg">Resumo do pagamento</h2>
        <div className="space-y-2">
          {products.map((product, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {product.purpose === "TOKEN_RESERVATION" ? "Reserva de Tokens" : "Fast Track Review"}
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

      {/* Seleção de método de pagamento */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg">Escolha o método de pagamento</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={() => setMethod("PIX")}
            disabled={isProcessing}
            className={`flex-1 flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
              method === "PIX"
                ? "bg-primary/5 border-primary/40 text-primary"
                : "bg-accent/20 border-transparent hover:bg-accent/30 text-muted-foreground"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <QrCode className="w-6 h-6" />
            <span className="font-black uppercase tracking-widest text-[10px]">PIX</span>
          </button>
          <button
            onClick={() => setMethod("CREDIT_CARD")}
            disabled={isProcessing}
            className={`flex-1 flex items-center gap-4 p-6 rounded-2xl border-2 transition-all ${
              method === "CREDIT_CARD"
                ? "bg-primary/5 border-primary/40 text-primary"
                : "bg-accent/20 border-transparent hover:bg-accent/30 text-muted-foreground"
            } ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <CreditCard className="w-6 h-6" />
            <span className="font-black uppercase tracking-widest text-[10px]">Cartão de Crédito</span>
          </button>
        </div>
      </div>

      {/* Botão de confirmar */}
      <button
        onClick={handlePayment}
        disabled={isProcessing}
        className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Processando..." : `Pagar ${formatBRL(totalAmount)} com ${method === "PIX" ? "PIX" : "Cartão de Crédito"}`}
      </button>
    </div>
  );
}
