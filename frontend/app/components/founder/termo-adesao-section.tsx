import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  BadgeCheck,
  Download,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import { Switch } from "radix-ui";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalTrigger,
} from "~/components/ui/animated-modal";
import { TermoAdesaoContent } from "~/components/founder/termo-adesao-content";
import { TermoAdesaoLegalBanner } from "~/components/founder/termo-adesao-legal-banner";
import { getTermoAdesaoBody } from "~/lib/termo-adesao-text";
import { toast } from "sonner";
import { useTermoAdesaoMutation } from "~/hooks/use-termo-adesao-mutation";
import { useTermoAdesaoStatus } from "~/hooks/use-termo-adesao-status";

export interface TermoAdesaoSectionProps {
  startupId: number | string;
  /** Quando true, o checkbox fica desabilitado (p.ex., durante save geral da aba). */
  disabled?: boolean;
  /**
   * Callback chamado quando o usuário salva a aba com checkbox marcado.
   * Útil para a página coordination.
   */
  onSaveWithAceito?: (aceito: boolean) => void;
}

/**
 * Handle exposto via ref para que a página pai possa disparar a assinatura
 * no momento do save da aba documentos.
 */
export interface TermoAdesaoSectionHandle {
  /** Dispara a mutation se checkbox está marcado e termo ainda não existe. Retorna Promise. */
  signIfNeeded: () => Promise<void>;
  /** true enquanto a mutation de assinatura está em curso. */
  isSigning: boolean;
  /** Estado atual do checkbox. */
  isAceito: boolean;
}

interface TermoStartupIdentity {
  nome?: string;
  name?: string;
  cnpj?: string;
  founder?: { nome?: string };
}

interface TermoUserIdentity {
  nome?: string;
  reg_documento?: string | null;
}

function unwrapData<T>(payload: unknown): T {
  const value = payload as { data?: T } | T;
  return (value && typeof value === "object" && "data" in value
    ? value.data
    : value) as T;
}

/**
 * Secao de termo de adesao digital.
 *
 * Comportamentos:
 * - `exists: false`  → mostra checkbox de aceite + link "ler termo completo"
 * - `exists: true`   → mostra 3 elementos: Ler / Baixar / Selo visual
 * - loading          → skeleton
 * - error            → toast de erro PT-BR
 *
 * A página pai obtém ref e chama `ref.current.signIfNeeded()` no handler
 * de save da aba documentos, APÓS verificar que `ref.current.isAceito === true`.
 */
export const TermoAdesaoSection = forwardRef<TermoAdesaoSectionHandle, TermoAdesaoSectionProps>(
  function TermoAdesaoSection({ startupId, disabled, onSaveWithAceito }, ref) {
    const [checked, setChecked] = useState(false);
    const [hasReadTermo, setHasReadTermo] = useState(false);
    const [isTermoLoading, setIsTermoLoading] = useState(false);
    const termoScrollRef = useRef<HTMLDivElement>(null);
    const [termoHtml, setTermoHtml] = useState("");
    const [termoError, setTermoError] = useState<string | null>(null);

    const statusQuery = useTermoAdesaoStatus(startupId);
    const mutation = useTermoAdesaoMutation();

    useEffect(() => {
      if (!termoHtml || !termoScrollRef.current) return;
      const element = termoScrollRef.current;
      if (element.scrollHeight <= element.clientHeight + 16) {
        setHasReadTermo(true);
      }
    }, [termoHtml]);

    const handleTermoScroll = (event: React.UIEvent<HTMLDivElement>) => {
      const element = event.currentTarget;
      const reachedEnd =
        element.scrollHeight - element.scrollTop - element.clientHeight <= 16;
      if (reachedEnd) setHasReadTermo(true);
    };

    const handleOpenTermo = async () => {
      setHasReadTermo(false);
      setTermoError(null);
      setIsTermoLoading(true);
      try {
        const [startupResponse, userResponse] = await Promise.all([
          fetch(`/api/startups/${encodeURIComponent(String(startupId))}`),
          fetch("/api/users/me"),
        ]);
        if (!startupResponse.ok || !userResponse.ok) {
          throw new Error("Não foi possível carregar os dados do termo.");
        }

        const startup = unwrapData<TermoStartupIdentity>(
          await startupResponse.json(),
        );
        const user = unwrapData<TermoUserIdentity>(await userResponse.json());
        setTermoHtml(
          getTermoAdesaoBody({
            startupName: startup.nome ?? startup.name ?? "Não informado",
            startupCnpj: startup.cnpj ?? "Não informado",
            founderName: startup.founder?.nome ?? user.nome ?? "Não informado",
            founderCpf: user.reg_documento ?? "Não informado",
          }),
        );
      } catch (error) {
        setTermoError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o termo.",
        );
      } finally {
        setIsTermoLoading(false);
      }
    };

    const handleSwitchChange = (value: boolean) => {
      setChecked(value);
      onSaveWithAceito?.(value);
    };

    const signIfNeeded = async (): Promise<void> => {
      if (!checked) return;
      if (statusQuery.data?.exists) return; // já assinado — idempotente

      try {
        await mutation.mutateAsync({ startupId });
        toast.success("Termo de adesão assinado com sucesso.");
        setChecked(false); // reset após sucesso
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido.";
        toast.error(`Falha ao assinar termo: ${msg}`);
        throw err;
      }
    };

    useImperativeHandle(ref, () => ({
      signIfNeeded,
      isSigning: mutation.isPending,
      isAceito: checked,
    }), [checked, mutation, startupId, statusQuery.data]);

    // ─── Loading ────────────────────────────────────────────────────────────
    if (statusQuery.isLoading) {
      return (
        <div className="rounded-2xl border-2 border-border/30 bg-accent/10 p-6 space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10" />
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-primary/10" />
              <div className="h-3 w-32 rounded bg-primary/5" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-primary/5" />
          <div className="h-3 w-3/4 rounded bg-primary/5" />
        </div>
      );
    }

    // ─── Erro ───────────────────────────────────────────────────────────────
    if (statusQuery.isError) {
      return (
        <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive font-semibold">
            Não foi possível carregar o status do termo de adesão.
          </p>
          <button
            type="button"
            onClick={() => statusQuery.refetch()}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    const { data: status } = statusQuery;

    // ─── Assinado (existe) ───────────────────────────────────────────────────
    if (status?.exists) {
      const signedDate = status.signedAt
        ? new Date(status.signedAt).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null;

      return (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-emerald-400">
                Termo de Adesão Assinado Digitalmente
              </h3>
              {signedDate && (
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                  Assinado em {signedDate}
                </p>
              )}
            </div>
          </div>

          {/* Ações do documento assinado */}
          <div className="flex flex-wrap gap-3">
            {/* Ler */}
            {status.presignedUrl && (
              <a
                href={status.presignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/40 hover:bg-accent/60 text-sm font-bold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Ler termo assinado
              </a>
            )}

            {/* Baixar */}
            {status.presignedUrl && (
              <a
                href={status.presignedUrl}
                download={`termo-adesao-${startupId}.pdf`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/40 hover:bg-accent/60 text-sm font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                Baixar termo assinado
              </a>
            )}

          </div>

          {/* Info */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Este documento foi assinado eletronicamente com certificado digital X.509
            e assinatura PAdES (PDF Advanced Electronic Signature), em conformidade
            com a Lei nº 14.063/2020. O PDF assinado está disponível para visualização
            e download.
          </p>
        </div>
      );
    }

    // ─── Não assinado (checkbox) ─────────────────────────────────────────────
    return (
      <>
        <div className="rounded-2xl border-2 border-border/30 bg-accent/10 p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-black text-foreground">
                Termo de Adesão Digital
              </h3>
              <span
                aria-label="Campo obrigatório"
                className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-400 ring-1 ring-inset ring-red-500/20"
              >
                <span aria-hidden="true" className="text-red-400">*</span>
                Obrigatório
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aceite o termo para habilitar a publicação da oferta.
            </p>
          </div>
        </div>

        {/* Switch de aceite */}
        <div className="flex items-start gap-3">
          <Switch.Root
            checked={checked}
            onCheckedChange={handleSwitchChange}
            disabled={disabled || mutation.isPending || !hasReadTermo}
            required
            aria-label="Li e aceito o Termo de Adesão"
            className="group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-white/10 mt-0.5"
          >
            <Switch.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform group-data-[state=checked]:translate-x-5 group-data-[state=unchecked]:translate-x-0" />
          </Switch.Root>
          <span className="text-sm leading-relaxed text-foreground select-none">
            <span aria-hidden="true" className="text-red-400 mr-0.5">*</span>
            Li e aceito o{" "}
            <Modal>
              <ModalTrigger
                onClick={handleOpenTermo}
                className="h-auto rounded-none bg-transparent p-0 font-bold text-primary underline underline-offset-2 hover:bg-transparent hover:text-primary-light"
              >
                Termo de Adesão
              </ModalTrigger>
              <ModalBody className="w-[calc(100%-1rem)] max-w-6xl !bg-background shadow-[0_0_40px_rgba(213,0,249,0.18)] sm:w-[calc(100%-3rem)]">
                <ModalContent className="min-h-0 p-3 pt-10 sm:p-5 sm:pt-12 md:p-7 md:pt-14">
                  <div
                    ref={termoScrollRef}
                    onScroll={handleTermoScroll}
                    className="min-h-0 flex-1 overflow-y-auto"
                  >
                    <div className="mx-auto w-full max-w-5xl space-y-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">
                        Documento legal
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-foreground">
                        Termo de Adesão
                      </h2>
                    </div>
                    {isTermoLoading && (
                      <div className="space-y-4 py-12" role="status" aria-label="Carregando termo">
                        <div className="mx-auto h-6 w-2/3 animate-pulse rounded bg-accent/40" />
                        <div className="h-24 animate-pulse rounded-2xl bg-accent/30" />
                        <div className="h-56 animate-pulse rounded-2xl bg-accent/20" />
                      </div>
                    )}
                    {termoError && !isTermoLoading && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                        {termoError}
                      </div>
                    )}
                    {termoHtml && !isTermoLoading && !termoError && (
                      <>
                        <TermoAdesaoLegalBanner />
                        <TermoAdesaoContent html={termoHtml} />
                      </>
                    )}
                    </div>
                  </div>
                </ModalContent>
              </ModalBody>
            </Modal>{" "}
            da plataforma iSelftoken, entender que este documento será assinado
            eletronicamente com certificado digital X.509, produzindo plenos
            efeitos jurídicos conforme Lei nº 14.063/2020.
          </span>
        </div>
        {!hasReadTermo && (
          <p className="text-xs text-muted-foreground">
            Leia o documento até o final para liberar o aceite.
          </p>
        )}

        {/* Estado de loading da mutation */}
        {mutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Gerando e assinando termo…
          </div>
        )}

        {/* Erro da mutation */}
        {mutation.isError && (
          <p className="text-sm text-destructive">
            Falha ao assinar termo. Tente novamente.
          </p>
        )}
      </div>

      </>
    );
  },
);
