import { Loader2, Save } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useRouteLoaderData } from "react-router";
import {
  DocumentsSection,
  type ComplianceStatus,
  type DocumentRow,
  type DocumentNARow,
  type DocumentRejectionRow,
} from "~/components/founder/documents-section";
import {
  TermoAdesaoSection,
  type TermoAdesaoSectionHandle,
} from "~/components/founder/termo-adesao-section";
import { useStartupDocumentsQuery } from "~/hooks/use-startup-documents";
import type { Route } from "./+types/edit-startup-documentos";
import type { loader as layoutLoader } from "./edit-startup-layout";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Documentos | Editar Startup | iSelfToken" },
    {
      name: "description",
      content: "Uploads de documentos legais, financeiros e marketing.",
    },
  ];
}

function pickStartupId(value: unknown): number {
  if (!value || typeof value !== "object") return 0;
  const id = (value as Record<string, unknown>).id;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string") {
    const parsed = Number(id);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

export default function EditStartupDocumentosPage() {
  const layoutData = useRouteLoaderData<typeof layoutLoader>(
    "routes/private/edit-startup-layout",
  );
  const startupId = pickStartupId(layoutData);

  // Ref para o componente de termo de adesão — usado no save desta aba.
  const termoRef = useRef<TermoAdesaoSectionHandle>(null);
  const [termoDirty, setTermoDirty] = useState(false);
  const [isSavingTermo, setIsSavingTermo] = useState(false);

  const handleSaveDocuments = async () => {
    if (!termoDirty || isSavingTermo) return;
    setIsSavingTermo(true);
    try {
      await termoRef.current?.signIfNeeded();
      setTermoDirty(false);
      toast.success("Termo de adesão salvo e assinado com sucesso.");
    } catch {
      // A seção já exibe o erro específico da assinatura.
    } finally {
      setIsSavingTermo(false);
    }
  };

  // TanStack Query (STATE-02D) — substitui o reloadDocs() com useState+fetch.
  const startupDocsQuery = useStartupDocumentsQuery(startupId);

  const documents = (startupDocsQuery.data?.documents ?? []) as DocumentRow[];
  const naoSeAplica = (startupDocsQuery.data?.naoSeAplica ??
    []) as DocumentNARow[];
  const rejections = (startupDocsQuery.data?.rejections ??
    []) as DocumentRejectionRow[];
  const compliance = (startupDocsQuery.data?.compliance ??
    null) as ComplianceStatus | null;
  const isLoading = startupDocsQuery.isLoading;
  const errorMessage =
    startupDocsQuery.isError && startupDocsQuery.error
      ? startupDocsQuery.error.message
      : null;

  return (
    <div className="space-y-5">
      {/* Termo de Adesao Digital — nova secao com checkbox */}
      <TermoAdesaoSection
        startupId={startupId}
        ref={termoRef}
        onSaveWithAceito={setTermoDirty}
      />

      {isLoading ? (
        <div className="glass-card rounded-3xl p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : errorMessage ? (
        <div className="glass-card rounded-3xl p-8 text-center space-y-2">
          <p className="font-bold text-destructive">{errorMessage}</p>
          <button
            type="button"
            onClick={() => startupDocsQuery.refetch()}
            className="text-sm text-primary hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <DocumentsSection
          startupId={startupId}
          documents={documents}
          naoSeAplica={naoSeAplica}
          rejections={rejections}
          compliance={compliance}
          onChange={() => startupDocsQuery.refetch()}
        />
      )}

      <footer
        aria-hidden={!termoDirty}
        className={`fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-2 py-3 backdrop-blur transition-transform duration-300 ease-out lg:left-72 ${
          termoDirty
            ? "translate-y-0"
            : "pointer-events-none translate-y-full"
        }`}
      >
        <div className="mx-auto flex w-full max-w-7xl justify-end xl:max-w-[1400px]">
          <button
            type="button"
            onClick={handleSaveDocuments}
            disabled={!termoDirty || isSavingTermo}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:px-5"
          >
          {isSavingTermo ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
            {isSavingTermo ? "Salvando…" : "Salvar alterações"}
          </button>
        </div>
      </footer>
    </div>
  );
}
