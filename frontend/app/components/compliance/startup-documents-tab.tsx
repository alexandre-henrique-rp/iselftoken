import { CheckCircle2, Download, FileText, Upload, XCircle } from "lucide-react";
import type { StartupDocumentItem } from "~/lib/audit-types";
import { cn } from "~/lib/utils";

interface StartupDocumentsTabProps {
  documents: StartupDocumentItem[];
}

const CATEGORY_LABEL: Record<string, { label: string; required: boolean }> = {
  MIE: { label: "Material Informativo ao Investidor (MIE)", required: true },
  CONTRATO_SOCIAL: { label: "Contrato Social", required: true },
  CARTAO_CNPJ: { label: "Cartão CNPJ", required: true },
  BALANCO: { label: "Balanço Atual", required: true },
  DECLARACAO_VERACIDADE: { label: "Declaração de Veracidade", required: true },
  ATA_ELEICAO: { label: "Ata de Eleição", required: true },
  PITCH_DECK: { label: "Pitch Deck", required: false },
  PROJECOES_FINANCEIRAS: { label: "Projeções Financeiras", required: false },
  OTHER: { label: "Outro", required: false },
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/**
 * Checklist CVM de documentos obrigatórios + opcionais.
 * Mostra status (✓ enviado / ❌ ausente) e botão de download.
 */
export function StartupDocumentsTab({ documents }: StartupDocumentsTabProps) {
  const byCategory = new Map<string, StartupDocumentItem[]>();
  for (const doc of documents) {
    const list = byCategory.get(doc.categoria) ?? [];
    list.push(doc);
    byCategory.set(doc.categoria, list);
  }

  const requiredKeys = Object.keys(CATEGORY_LABEL).filter(
    (k) => CATEGORY_LABEL[k].required,
  );
  const optionalKeys = Object.keys(CATEGORY_LABEL).filter(
    (k) => !CATEGORY_LABEL[k].required,
  );

  const totalRequired = requiredKeys.length;
  const fulfilledRequired = requiredKeys.filter((k) => (byCategory.get(k)?.length ?? 0) > 0).length;

  function Row({ keyName, info }: { keyName: string; info: { label: string; required: boolean } }) {
    const docs = byCategory.get(keyName) ?? [];
    const ok = docs.length > 0;
    return (
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-accent/15 border border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          {ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{info.label}</p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">
              {ok
                ? `${docs.length} documento${docs.length !== 1 ? "s" : ""} enviado${docs.length !== 1 ? "s" : ""}`
                : info.required ? "Obrigatório · pendente" : "Recomendado · opcional"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {docs.slice(0, 1).map((doc) => (
            <a
              key={doc.id}
              href={`/api/startup/${doc.uploadedById}/documents/${doc.id}/download`}
              target="_blank"
              rel="noreferrer"
              title={doc.nome}
              className="px-3 py-2 rounded-full bg-accent/40 text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-primary/15 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" /> Baixar
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
            Checklist de Documentos CVM
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Documentos obrigatórios para aprovação da oferta (Resolução CVM 88/2022).
          </p>
        </div>
        <span
          className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
            fulfilledRequired === totalRequired
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 border-amber-500/20",
          )}
        >
          {fulfilledRequired}/{totalRequired} obrigatórios
        </span>
      </div>

      <section className="space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
          Obrigatórios
        </h4>
        {requiredKeys.map((k) => (
          <Row key={k} keyName={k} info={CATEGORY_LABEL[k]} />
        ))}
      </section>

      <section className="space-y-2">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
          Recomendados
        </h4>
        {optionalKeys.map((k) => (
          <Row key={k} keyName={k} info={CATEGORY_LABEL[k]} />
        ))}
      </section>

      {documents.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
            Todos os documentos ({documents.length})
          </h4>
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-4 px-5 py-3 border-b border-white/5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
              <span>Documento</span>
              <span>Categoria</span>
              <span>Tipo</span>
              <span>Tamanho</span>
              <span>Enviado em</span>
            </div>
            {documents.map((doc) => {
              const cat = CATEGORY_LABEL[doc.categoria] ?? { label: doc.categoria, required: false };
              return (
                <div
                  key={doc.id}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)] gap-4 px-5 py-3 border-b border-white/5 last:border-0 items-center text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-bold truncate">{doc.nome}</span>
                  </div>
                  <span className="text-muted-foreground truncate">{cat.label}</span>
                  <span className="text-muted-foreground font-mono text-[10px]">{doc.mimetype}</span>
                  <span className="text-muted-foreground tabular-nums">{formatBytes(doc.sizeBytes)}</span>
                  <span className="text-muted-foreground tabular-nums">{formatDate(doc.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
