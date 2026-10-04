import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useRouteLoaderData } from "react-router";
import { toast } from "sonner";
import { BankingDetails } from "~/components/founder/banking-details";
import { bankingSchema } from "~/lib/banking-schema";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";
import type { Route } from "./+types/edit-startup-bancario";
import type { loader as layoutLoader } from "./edit-startup-layout";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bancário | Editar Startup | iSelfToken" },
    {
      name: "description",
      content: "Dados bancários para payout da campanha.",
    },
  ];
}

interface BankingForm {
  titular: string;
  documentoTitular: string;
  banco: string;
  tipoConta: "corrente" | "poupanca" | "";
  agencia: string;
  conta: string;
  digito: string;
  chavePix: string;
}

function coerceStartupId(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function unwrapLayoutData(value: unknown): {
  id: number;
  banking: Partial<BankingForm>;
  campaignActive: boolean;
} {
  if (!value || typeof value !== "object")
    return { id: 0, banking: {}, campaignActive: false };
  const v = value as Record<string, unknown>;
  const campaignStatus =
    typeof v.campaignStatus === "string" ? v.campaignStatus : "";
  const nestedBanking =
    v.banking && typeof v.banking === "object"
      ? (v.banking as Record<string, unknown>)
      : v;
  const rawAccount = pickStr(nestedBanking, ["conta", "account"]);
  const explicitDigit = pickStr(nestedBanking, ["digito", "accountDigit"]);
  const accountParts = rawAccount.split("-");
  const conta =
    accountParts.length > 1
      ? accountParts.slice(0, -1).join("-").trim()
      : rawAccount;
  const digito = explicitDigit ||
    (accountParts.length > 1 ? accountParts.at(-1)?.trim() ?? "" : "");

  return {
    id: coerceStartupId(v.id),
    campaignActive: campaignStatus === "open",
    banking: {
      titular: pickStr(nestedBanking, ["titular"]),
      documentoTitular: pickStr(nestedBanking, [
        "documentoTitular",
        "documento_titular",
      ]),
      banco: pickStr(nestedBanking, ["banco"]),
      tipoConta: pickEnum(nestedBanking, ["tipoConta", "tipo_conta"]),
      agencia: pickStr(nestedBanking, ["agencia"]),
      conta,
      digito,
      chavePix: pickStr(nestedBanking, ["chavePix", "pix_key"]),
    },
  };
}

function pickStr(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const val = obj[k];
    if (typeof val === "string") return val;
  }
  return "";
}

function pickEnum(
  obj: Record<string, unknown>,
  keys: string[],
): "corrente" | "poupanca" | "" {
  for (const k of keys) {
    const val = obj[k];
    if (val === "corrente" || val === "poupanca") return val;
  }
  return "";
}

export default function EditStartupBancarioPage() {
  const layoutData = useRouteLoaderData<typeof layoutLoader>(
    "routes/private/edit-startup-layout",
  );
  const startup = unwrapLayoutData(layoutData);
  const isCampaignActive = startup.campaignActive;
  const navigate = useNavigate();
  const { onSave } = useEditStartupForm();
  const [isSubmittingStage2, setIsSubmittingStage2] = useState(false);

  const form = useForm<BankingForm>({
    resolver: zodResolver(bankingSchema) as unknown as never,
    defaultValues: {
      titular: "",
      documentoTitular: "",
      banco: "",
      tipoConta: "",
      agencia: "",
      conta: "",
      digito: "",
      chavePix: "",
    },
  });

  // O loader do layout é a fonte dos dados da startup. O reset explícito
  // garante que os valores sejam aplicados também após a hidratação SSR.
  useEffect(() => {
    form.reset({
      titular: startup.banking.titular ?? "",
      documentoTitular: startup.banking.documentoTitular ?? "",
      banco: startup.banking.banco ?? "",
      tipoConta: (startup.banking.tipoConta as BankingForm["tipoConta"]) ?? "",
      agencia: startup.banking.agencia ?? "",
      conta: startup.banking.conta ?? "",
      digito: startup.banking.digito ?? "",
      chavePix: startup.banking.chavePix ?? "",
    });
  }, [layoutData]);

  // STATE-02D — TanStack Mutation substitui o fetch inline do PATCH /api/startup/:id/banking.
  const bankingMutation = useMutation<unknown, Error, BankingForm>({
    mutationFn: async (values) => {
      const res = await fetch(`/api/startup/${startup.id}/banking`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          titular: values.titular || null,
          documentoTitular: values.documentoTitular || null,
          banco: values.banco || null,
          tipoConta: values.tipoConta || null,
          agencia: values.agencia || null,
          conta: values.conta || null,
          digito: values.digito || null,
          chavePix: values.chavePix || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? `Falha ao salvar (${res.status})`);
      }
      return body;
    },
    onSuccess: () => {
      toast.success("Dados bancários atualizados.");
      form.reset(form.getValues());
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    if (!startup.id) {
      toast.error("Startup não identificada — recarregue a página.");
      return;
    }
    if (isCampaignActive) {
      toast.error(
        "Dados bancários não podem ser alterados com captação ativa.",
      );
      return;
    }
    bankingMutation.mutate(values);
  });

  async function handleCompleteStage2() {
    if (!startup.id || isSubmittingStage2 || isCampaignActive) return;
    setIsSubmittingStage2(true);
    try {
      const valid = await form.trigger();
      if (!valid) {
        toast.error("Revise os dados bancários antes de enviar a Etapa 2.");
        return;
      }
      if (form.formState.isDirty) {
        await bankingMutation.mutateAsync(form.getValues());
      }
      await onSave();
      const response = await fetch(`/api/startup/${startup.id}/complete-stage2`, {
        method: "POST",
        credentials: "include",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.error) {
        throw new Error(body?.message ?? "Não foi possível enviar a Etapa 2.");
      }
      toast.success("Etapa 2 enviada para análise do Compliance.");
      navigate("/founder/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível finalizar o cadastro.",
      );
    } finally {
      setIsSubmittingStage2(false);
    }
  }

  const submitting = bankingMutation.isPending;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-5">
      {isCampaignActive && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300">
          <strong>Captação ativa.</strong> Os dados bancários não podem ser
          alterados enquanto a campanha estiver em andamento.
        </div>
      )}

      <fieldset disabled={isCampaignActive}>
        <BankingDetails form={form} />
      </fieldset>

      <footer
        aria-hidden={!form.formState.isDirty}
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-2 py-3 backdrop-blur transition-transform duration-300 ease-out lg:left-72 ${
          form.formState.isDirty
            ? "translate-y-0"
            : "pointer-events-none translate-y-full"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl justify-end xl:max-w-[1400px]">
          <button
            type="submit"
            disabled={submitting || !form.formState.isDirty || isCampaignActive}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:px-5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Salvar alterações
              </>
            )}
          </button>
        </div>
      </footer>
      </form>

      <section className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-5 shadow-[0_0_24px_rgba(213,0,249,0.08)] md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
              Finalizar cadastro
            </p>
            <h2 className="mt-1 text-lg font-black text-foreground">
              Tudo pronto para enviar a Etapa 2?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Revise as abas anteriores e clique em{" "}
              <strong className="text-foreground">Aplicar e enviar</strong>.
              O Compliance fará a pré-análise em até 3 dias úteis. Após a aprovação,
              a Etapa 3 será liberada para você.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCompleteStage2}
            disabled={isSubmittingStage2 || submitting || isCampaignActive}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-[0_0_18px_rgba(213,0,249,0.25)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {isSubmittingStage2 ? "Enviando…" : "Aplicar e enviar"}
          </button>
        </div>
      </section>
    </div>
  );
}
