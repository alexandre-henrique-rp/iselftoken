import { useState } from "react";
import { useRouteLoaderData, useRevalidator } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { FileCheck, CheckCircle, XCircle, RefreshCw, Image } from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import type { loader } from "./compliance-user-detail";

const KYC_TYPE_LABELS: Record<string, string> = {
  avatar: "Avatar (Foto)",
  comprovante: "Comprovante de Residência",
  documento: "Documento de Identidade",
  biofacial: "Selfie Biométrica",
};

const KYC_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente", color: "text-yellow-400" },
  UNDER_REVIEW: { label: "Em Análise", color: "text-blue-400" },
  APPROVED: { label: "Aprovado", color: "text-green-400" },
  REJECTED: { label: "Rejeitado", color: "text-red-400" },
  NEEDS_RESUBMISSION: { label: "Reenviar", color: "text-orange-400" },
};

interface KYCDocument {
  id: number;
  status: string;
  url: string;
}

export function meta() {
  return [
    { title: "KYC / Documentos | Compliance | iSelfToken" },
  ];
}

async function decideKyc(
  kycId: number,
  decision: "APPROVED" | "REJECTED",
): Promise<unknown> {
  const res = await fetch(`/api/compliance/kyc/${kycId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Falha ${res.status}`,
    );
  }
  return res.json();
}

export default function ComplianceUserDetailKYCPage() {
  const user = useRouteLoaderData<typeof loader>("routes/private/compliance-user-detail");
  const revalidator = useRevalidator();
  const [loading, setLoading] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({
      kycId,
      decision,
    }: {
      kycId: number;
      decision: "APPROVED" | "REJECTED";
    }) => decideKyc(kycId, decision),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.decision === "APPROVED"
          ? "Documento aprovado"
          : "Documento rejeitado",
      );
      revalidator.revalidate();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao decidir KYC");
    },
  });

  if (!user) {
    return <div>Carregando...</div>;
  }

  const documents: { key: string; doc: KYCDocument | null }[] = [
    { key: "avatar", doc: user.avatar },
    { key: "comprovante", doc: user.comprovante },
    { key: "documento", doc: user.documento },
    { key: "biofacial", doc: user.biofacial },
  ];

  const submitDecision = (type: string, docId: number, decision: "APPROVED" | "REJECTED") => {
    setLoading(type);
    mutation.mutate(
      { kycId: docId, decision },
      { onSettled: () => setLoading(null) },
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8 space-y-6">
        <section className="rounded-3xl p-6 lg:p-8 bg-black/30 border border-white/5 space-y-6">
          <h2 className="text-xl font-black tracking-tight italic flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-primary" />
            Documentos KYC
          </h2>

          <div className="space-y-4">
            {documents.map(({ key, doc }) => {
              const statusInfo = doc?.status ? KYC_STATUS_LABELS[doc.status] : { label: "Não enviado", color: "text-muted-foreground" };
              const isLoading = loading === key;

              return (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <Image className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest">
                        {KYC_TYPE_LABELS[key]}
                      </h3>
                      <p className={cn("text-xs font-medium", statusInfo.color)}>
                        {statusInfo.label}
                      </p>
                    </div>
                  </div>

                  {doc ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => submitDecision(key, doc.id, "APPROVED")}
                        disabled={isLoading || doc.status === "APPROVED"}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          doc.status === "APPROVED"
                            ? "bg-green-500/20 text-green-400 cursor-not-allowed"
                            : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        )}
                      >
                        {isLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => submitDecision(key, doc.id, "REJECTED")}
                        disabled={isLoading || doc.status === "REJECTED"}
                        className={cn(
                          "p-2 rounded-lg transition-colors",
                          doc.status === "REJECTED"
                            ? "bg-red-500/20 text-red-400 cursor-not-allowed"
                            : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        )}
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aguardando upload</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border border-white/5 space-y-4">
          <span className="text-[9px] font-black uppercase tracking-widest text-primary">
            KYC
          </span>
          <p className="text-xs text-muted-foreground/60">
            Aprovar ou rejeitar documentos de verificação de identidade do usuário.
          </p>
        </div>
      </aside>
    </div>
  );
}