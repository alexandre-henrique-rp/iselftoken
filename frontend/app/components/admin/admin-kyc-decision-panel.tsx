import { Ban, Loader2, RotateCcw, ShieldCheck, ShieldOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Form, useActionData, useNavigation } from "react-router";
import { toast } from "sonner";
import { AdminKycRevokeDialog } from "~/components/admin/admin-kyc-revoke-dialog";
import { docStatusUI, type KycDoc } from "~/lib/kyc-status";
import { cn } from "~/lib/utils";

interface AdminKycDecisionPanelProps {
  documents?: {
    avatar?: KycDoc | null;
    comprovante?: KycDoc | null;
    documento?: KycDoc | null;
    biofacial?: KycDoc | null;
  } | null;
}

type RevokeTarget = {
  documentLabel: string;
  kycProfileId: number;
};

const SLOTS: Array<{
  key: "documento" | "avatar" | "comprovante" | "biofacial";
  label: string;
}> = [
  { key: "documento", label: "Documento de identidade" },
  { key: "avatar", label: "Selfie / foto" },
  { key: "comprovante", label: "Comprovante de residência" },
  { key: "biofacial", label: "Biometria facial" },
];

/** Decisão independente para cada perfil de documento KYC enviado. */
export function AdminKycDecisionPanel({
  documents,
}: AdminKycDecisionPanelProps) {
  const nav = useNavigation();
  const enviando = nav.state !== "idle";
  const submittedProfileId = String(nav.formData?.get("kycProfileId") ?? "");
  const submittedIntent = String(nav.formData?.get("intent") ?? "");
  const actionData = useActionData<{
    success?: boolean;
    message?: string;
    error?: string;
  }>();
  const ultimo = useRef<unknown>(null);
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);

  const closeRevokeDialog = useCallback(() => {
    if (!enviando) setRevokeTarget(null);
  }, [enviando]);

  const isSubmittingFor = (doc: KycDoc, intent: string) =>
    enviando &&
    submittedProfileId === String(doc.id) &&
    submittedIntent === intent;

  useEffect(() => {
    if (!actionData || actionData === ultimo.current) return;
    ultimo.current = actionData;
    if (actionData.success) {
      setRevokeTarget(null);
      toast.success(actionData.message ?? "Decisão registrada");
    } else if (actionData.error) {
      toast.error(actionData.error);
    }
  }, [actionData]);

  const presentes = SLOTS.map((slot) => ({
    ...slot,
    doc: documents?.[slot.key],
  })).filter((slot): slot is typeof slot & { doc: KycDoc } => !!slot.doc);

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
              Ação administrativa
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
              Decisão por documento
            </h2>
          </div>
        </div>

        {presentes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-sm text-muted-foreground">
            Este usuário ainda não enviou documentos para revisão.
          </p>
        ) : (
          <div className="space-y-3">
            {presentes.map(({ key, label, doc }) => {
              const ui = docStatusUI(doc.status);
              const isApproved = doc.status === "APPROVED";
              const resubmitSubmitting = isSubmittingFor(
                doc,
                "request-resubmit",
              );
              const approveSubmitting = isSubmittingFor(doc, "approve-kyc");
              const rejectSubmitting = isSubmittingFor(doc, "reject-kyc");

              return (
                <Form
                  method="post"
                  key={key}
                  className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <input type="hidden" name="kycProfileId" value={doc.id} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-foreground">
                      {label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-widest",
                        ui.className,
                      )}
                    >
                      {ui.label}
                    </span>
                  </div>

                  {isApproved ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Documento aprovado. Revogue a decisão somente se for
                        necessário realizar uma nova análise.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setRevokeTarget({
                            documentLabel: label,
                            kycProfileId: doc.id,
                          })
                        }
                        disabled={enviando}
                        aria-haspopup="dialog"
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-red-500/70 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                        Revogar decisão
                      </button>
                    </div>
                  ) : (
                    <>
                      <label
                        htmlFor={`justification-${key}`}
                        className="sr-only"
                      >
                        Motivo da decisão para {label}
                      </label>
                      <input
                        id={`justification-${key}`}
                        name="justification"
                        placeholder="Motivo obrigatório para reenvio ou rejeição"
                        className="h-10 w-full rounded-lg border border-white/10 bg-card px-3 text-xs font-medium text-foreground outline-none transition placeholder:text-muted-foreground/60 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          type="submit"
                          name="intent"
                          value="approve-kyc"
                          disabled={enviando}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[9px] font-black uppercase tracking-widest text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {approveSubmitting ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <ShieldCheck
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          )}
                          {approveSubmitting ? "Aprovando..." : "Aprovar"}
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value="request-resubmit"
                          disabled={enviando}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-amber-500/70 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-amber-300 transition hover:bg-amber-500 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {resubmitSubmitting ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <RotateCcw
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          )}
                          {resubmitSubmitting ? "Enviando..." : "Reenvio"}
                        </button>
                        <button
                          type="submit"
                          name="intent"
                          value="reject-kyc"
                          disabled={enviando}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-red-500/70 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {rejectSubmitting ? (
                            <Loader2
                              className="h-3.5 w-3.5 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Ban className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {rejectSubmitting ? "Rejeitando..." : "Rejeitar"}
                        </button>
                      </div>
                    </>
                  )}
                </Form>
              );
            })}
          </div>
        )}
      </section>

      {revokeTarget ? (
        <AdminKycRevokeDialog
          documentLabel={revokeTarget.documentLabel}
          kycProfileId={revokeTarget.kycProfileId}
          submitting={enviando}
          onClose={closeRevokeDialog}
        />
      ) : null}
    </>
  );
}
