import { useState } from "react";
import {
  FileText,
  Presentation,
  ExternalLink,
  CheckCircle2,
  Ban,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ReviewRejectionDialog } from "./review-rejection-dialog";

export interface PhaseDocument {
  id: number;
  categoria: string;
  nome: string;
  mimetype: string;
  sizeBytes: number;
  url: string | null;
  reviewStatus?: string;
  reviewNote?: string | null;
  naoSeAplica?: boolean;
}

interface PhaseDocumentsProps {
  startupId: number | string;
  documents: PhaseDocument[];
  /**
   * Fase da avaliação. Controla quais documentos aparecem:
   * - `1`: SOMENTE o Pitch Deck (os demais são enviados/avaliados na Fase 2).
   * - `2` (ou ausente): todos os documentos + marcadores "Não se aplica".
   */
  phase?: 1 | 2 | 3;
  naoSeAplica?: Array<{
    id: number;
    categoria: string;
    justificativa: string;
    reviewStatus?: string;
    reviewNote?: string | null;
  }>;
}

const CATEGORY_LABEL: Record<string, string> = {
  PITCH_DECK: "Pitch Deck",
  MIE: "Material Informativo (MIE)",
  CONTRATO_SOCIAL: "Contrato Social",
  CNPJ: "Cartão CNPJ",
  BALANCO_ATUAL: "Balanço atual",
  BALANCO_ANTERIOR: "Balanço anterior",
  DECLARACAO_VERACIDADE: "Declaração de Veracidade",
  ATA_ELEICAO: "Ata de Eleição",
  PROCURACAO: "Procuração",
  CV_SOCIOS: "CV dos Sócios",
  PROJECOES: "Projeções financeiras",
  MODELO_CONTRATO_OFERTA: "Modelo do contrato da oferta",
  COMPROVANTE_ENDERECO: "Comprovante de endereço",
  DECLARACAO_RECEITA: "Declaração de receita",
  TERMO_PLATAFORMA: "Termo de adesão",
  OUTRO: "Outro documento",
};

function humanSize(bytes: number): string {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DocRow({
  doc,
  startupId,
  highlight,
}: {
  doc: PhaseDocument;
  startupId: number | string;
  highlight?: boolean;
}) {
  const label = CATEGORY_LABEL[doc.categoria] ?? doc.categoria;
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(doc.reviewStatus ?? "PENDING_REVIEW");
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const approved = status === "APPROVED";
  const Icon = doc.naoSeAplica
    ? Ban
    : highlight
      ? Presentation
      : FileText;

  // Marcador "Não se aplica" não tem aprovação/rejeição — é apenas leitura.
  const isReadOnly = Boolean(doc.naoSeAplica);

  async function approve() {
    setSaving("approve");
    setError(null);
    const previous = status;
    setStatus("APPROVED"); // otimista
    try {
      const res = await fetch(
        `/api/admin/startups/${startupId}/documents/${doc.id}/review`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ decision: "APPROVED" }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        setStatus(previous);
        const message = body?.message ?? "Falha ao aprovar.";
        setError(message);
        toast.error(message);
      } else {
        toast.success(`${label} aprovado.`);
        // Invalida caches do admin (lista de docs / payment status / fase)
        void queryClient.invalidateQueries({ queryKey: ["admin", "startup", startupId] });
        void queryClient.invalidateQueries({ queryKey: ["startup", startupId, "documents"] });
      }
    } catch {
      setStatus(previous);
      setError("Falha de rede.");
      toast.error("Falha de rede ao aprovar.");
    } finally {
      setSaving(null);
    }
  }

  async function submitRejection(justification: string): Promise<boolean> {
    setSaving("reject");
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/startups/${startupId}/documents/${doc.id}/review`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            decision: "REJECTED",
            note: justification,
          }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        const message = body?.message ?? "Falha ao reprovar.";
        setError(message);
        toast.error(message);
        return false;
      }
      toast.success(`${label} rejeitado e removido. O founder foi notificado.`);
      // Invalida caches — doc sumiu da lista (hard-delete), rejection aparece
      // para o founder via /founder/startups/:id/edit/documentos
      void queryClient.invalidateQueries({ queryKey: ["admin", "startup", startupId] });
      void queryClient.invalidateQueries({ queryKey: ["startup", startupId, "documents"] });
      void queryClient.invalidateQueries({ queryKey: ["startup", startupId, "rejections"] });
      return true;
    } catch {
      const message = "Falha de rede ao reprovar.";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(null);
    }
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
        doc.naoSeAplica
          ? "border-warning/20 bg-warning/5"
          : highlight
            ? "border-primary/30 bg-primary/5"
            : "border-white/10 bg-black/20"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon
          className={`h-5 w-5 shrink-0 ${
            doc.naoSeAplica
              ? "text-warning"
              : highlight
                ? "text-primary"
                : "text-muted-foreground"
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {label}
          </p>
          {doc.naoSeAplica ? (
            <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-warning">
              Não se aplica
            </span>
          ) : (
            <p className="truncate text-[11px] text-muted-foreground">
              {doc.nome}
              {humanSize(doc.sizeBytes) ? ` · ${humanSize(doc.sizeBytes)}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {/* Preview — apenas para documentos reais (não para o marcador N/A) */}
        {!doc.naoSeAplica &&
          (doc.url ? (
            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary transition hover:bg-primary hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              Visualizar
            </a>
          ) : (
            <span className="text-[10px] text-muted-foreground">
              Sem visualização
            </span>
          ))}

        {/* Badge de status atual (entre os botões) */}
        {!isReadOnly && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
              approved
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/5 text-muted-foreground"
            }`}
            aria-live="polite"
          >
            {approved ? (
              <>
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Aprovado
              </>
            ) : (
              "Pendente"
            )}
          </span>
        )}

        {/* Botão Aprovar (verde) — apenas docs reais, não-readonly */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={approve}
            disabled={saving !== null || approved}
            aria-label={`Aprovar ${label}`}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving === "approve" ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3 w-3" aria-hidden="true" />
            )}
            Aprovar
          </button>
        )}

        {/* Botão Reprovar (vermelho) — apenas docs reais, não-readonly */}
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setRejectDialogOpen(true)}
            disabled={saving !== null}
            aria-label={`Reprovar ${label}`}
            className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-300 transition hover:bg-red-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            Reprovar
          </button>
        )}
      </div>

      {error && (
        <span role="alert" className="text-[10px] text-destructive">
          {error}
        </span>
      )}

      {!isReadOnly && (
        <ReviewRejectionDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          docName={doc.nome}
          categoriaLabel={label}
          onConfirm={submitRejection}
          pending={saving === "reject"}
        />
      )}
    </div>
  );
}

/**
 * PhaseDocuments — TODOS os documentos enviados pelo founder para avaliação
 * do Admin/Compliance na Fase (fluxo §2). Cada documento tem:
 *  - pré-visualização (link, exceto o marcador "Não se aplica");
 *  - checkbox de aprovação que persiste via PATCH .../documents/:docId/review;
 *  - label "Não se aplica" quando o founder marcou a categoria como N/A.
 * Pitch Deck é destacado no topo.
 */
export function PhaseDocuments({
  startupId,
  documents,
  phase,
  naoSeAplica = [],
}: PhaseDocumentsProps) {
  const pitchAll = documents.filter((d) => d.categoria === "PITCH_DECK");
  const othersAll = documents.filter((d) => d.categoria !== "PITCH_DECK");

  // Fase 1 avalia SOMENTE o Pitch Deck; os demais documentos e os marcadores
  // "Não se aplica" são avaliados na Fase 2. Quando `phase` não é informado,
  // mantém o comportamento antigo (mostra tudo).
  const onlyPitch = phase === 1;
  const pitch = pitchAll;
  const others = onlyPitch ? [] : othersAll;
  const nas = onlyPitch ? [] : naoSeAplica;

  if (
    pitch.length === 0 &&
    others.length === 0 &&
    (!nas || nas.length === 0)
  ) {
    return (
      <section className="rounded-3xl border border-white/10 bg-card p-4 sm:p-8">
        <h2 className="text-sm font-bold text-foreground">Documentos</h2>
        <p className="mt-3 rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-muted-foreground">
          {onlyPitch
            ? "Nenhum Pitch Deck enviado até o momento."
            : "Nenhum documento enviado até o momento."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-card p-4 sm:p-8 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary/70" aria-hidden="true" />
        <h2 className="text-sm font-bold text-foreground">
          Documentos para avaliação
        </h2>
      </div>

      {pitch.length > 0 && (
        <div className="space-y-2">
          {pitch.map((d) => (
            <DocRow key={d.id} doc={d} startupId={startupId} highlight />
          ))}
        </div>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          {others.map((d) => (
            <DocRow key={d.id} doc={d} startupId={startupId} />
          ))}
        </div>
      )}

      {nas.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-warning">
            Marcados como "Não se aplica"
          </p>
          {nas.map((na) => (
            <div
              key={na.id}
              className="rounded-xl border border-warning/20 bg-warning/5 p-3"
            >
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span className="text-sm font-semibold text-foreground">
                  {CATEGORY_LABEL[na.categoria] ?? na.categoria}
                </span>
                <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-warning">
                  Não se aplica
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Justificativa:
                </span>{" "}
                {na.justificativa}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
