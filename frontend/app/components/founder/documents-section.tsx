import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { validateFile } from "~/hooks/use-file-validation";
import { Drawer, DrawerBody, DrawerFooter } from "~/components/ui/drawer";

export type DocCategory =
  | "MIE"
  | "CONTRATO_SOCIAL"
  | "CNPJ"
  | "BALANCO_ATUAL"
  | "DECLARACAO_VERACIDADE"
  | "ATA_ELEICAO"
  | "BALANCO_ANTERIOR"
  | "PROCURACAO"
  | "CV_SOCIOS"
  | "PITCH_DECK"
  | "PROJECOES"
  | "MODELO_CONTRATO_OFERTA"
  | "COMPROVANTE_ENDERECO"
  | "DECLARACAO_RECEITA"
  | "TERMO_PLATAFORMA"
  | "OUTRO";

export interface DocumentRow {
  id: number;
  categoria: DocCategory;
  nome: string;
  mimetype: string;
  sizeBytes: number;
  createdAt: string;
  legacy?: boolean;
  legacyUrl?: string;
}

export interface ComplianceStatus {
  required: number;
  present: number;
  missing: DocCategory[];
}

/** Marcação "Não se aplica" estruturada (por categoria) vinda do backend. */
export interface DocumentNARow {
  id: number;
  categoria: DocCategory;
  justificativa: string;
  reviewStatus?: string;
  reviewNote?: string | null;
}

/** Rejeição em aberto vinda de `BackendNode.startupDocumentRejection` table.
 *  Aparece como banner vermelho no slot da categoria até o founder re-upload. */
export interface DocumentRejectionRow {
  id: number;
  categoria: DocCategory;
  documentName: string;
  reason: string;
  rejectedAt: string;
}

/** Categorias essenciais (CVM) — NÃO permitem "Não se aplica". */
const ESSENTIAL_CATEGORIES: ReadonlySet<DocCategory> = new Set<DocCategory>([
  "MIE",
  "CONTRATO_SOCIAL",
  "CNPJ",
  "BALANCO_ATUAL",
  "DECLARACAO_VERACIDADE",
  "ATA_ELEICAO",
]);

/**
 * BUG-FT-006: limite canônico da justificativa do "Não se aplica" (espelha
 * `startup-extras.service.ts:514` no backend). Hard-cap no DOM para impedir
 * digitar/pastar mais que o limite e dar feedback visual imediato.
 */
const JUSTIFICATIVA_MAX_LENGTH = 1000;

/** Quando o contador passa deste valor, destaca em cor destrutiva. */
const JUSTIFICATIVA_NEAR_LIMIT = 900;

interface DocumentsSectionProps {
  startupId: number;
  documents: DocumentRow[];
  naoSeAplica?: DocumentNARow[];
  /** Rejeições em aberto — fonte de verdade do banner vermelho no slot da categoria. */
  rejections?: DocumentRejectionRow[];
  compliance: ComplianceStatus | null;
  onChange: () => void;
}

interface SlotDef {
  categoria: Exclude<DocCategory, "OUTRO">;
  label: string;
  hint: string;
}

interface GroupDef {
  id: string;
  title: string;
  description: string;
  tone: "obrigatorio" | "condicional" | "recomendado" | "outro";
  slots: SlotDef[];
}

/**
 * Agrupamento dos slots conforme CVM Resolução 88/2022:
 *  - obrigatórios: necessários pra publicar a oferta
 *  - condicionais: necessários em certos cenários (empresa > 1 ano, etc)
 *  - recomendados: boas práticas, não bloqueiam
 *  - plataforma + livre: contrato de adesão e demais avulsos
 */
const GROUPS: GroupDef[] = [
  {
    id: "obrigatorios",
    title: "Obrigatórios CVM",
    description: "Exigidos pela Resolução 88/2022 pra publicar a oferta.",
    tone: "obrigatorio",
    slots: [
      { categoria: "MIE", label: "Material Informativo Essencial", hint: "Peça-mãe da oferta — plano de negócios + riscos + uso dos recursos." },
      { categoria: "CONTRATO_SOCIAL", label: "Contrato Social / Estatuto", hint: "Última versão consolidada e registrada." },
      { categoria: "CNPJ", label: "Cartão CNPJ", hint: "Emitido pela Receita Federal." },
      { categoria: "BALANCO_ATUAL", label: "Balanço — exercício atual", hint: "DRE + BP do último exercício." },
      { categoria: "DECLARACAO_VERACIDADE", label: "Declaração de Veracidade", hint: "Assinada pelos administradores." },
      { categoria: "ATA_ELEICAO", label: "Ata de Eleição", hint: "Eleição dos administradores atuais." },
    ],
  },
  {
    id: "condicionais",
    title: "Condicionais",
    description: "Necessários em cenários específicos — anexe se aplicável.",
    tone: "condicional",
    slots: [
      { categoria: "BALANCO_ANTERIOR", label: "Balanço — exercício anterior", hint: "Necessário se a empresa tem +1 ano de vida." },
      { categoria: "PROCURACAO", label: "Procuração", hint: "Se quem assina não é administrador formalmente eleito." },
      { categoria: "CV_SOCIOS", label: "Histórico / CV dos sócios", hint: "Resumo profissional e antecedentes dos fundadores." },
    ],
  },
  {
    id: "recomendados",
    title: "Recomendados",
    description: "Não obrigatórios, mas elevam a confiança da oferta.",
    tone: "recomendado",
    slots: [
      { categoria: "PITCH_DECK", label: "Pitch Deck", hint: "Apresentação em PDF." },
      { categoria: "PROJECOES", label: "Projeções financeiras", hint: "Estudo de viabilidade / projeções." },
      { categoria: "MODELO_CONTRATO_OFERTA", label: "Modelo do contrato da oferta", hint: "Instrumento conversível, debênture ou equivalente." },
      { categoria: "COMPROVANTE_ENDERECO", label: "Comprovante de endereço da PJ", hint: "Conta de luz, IPTU ou similar — últimos 90 dias." },
      { categoria: "DECLARACAO_RECEITA", label: "Declaração de receita anual", hint: "Confirma enquadramento ≤ R$ 15M/ano." },
    ],
  },

];

/** Display labels pros chips do banner. */
const CATEGORY_LABELS: Record<DocCategory, string> = (() => {
  const acc: Record<string, string> = { OUTRO: "Outros" };
  for (const g of GROUPS) for (const s of g.slots) acc[s.categoria] = s.label;
  return acc as Record<DocCategory, string>;
})();

const TONE_STYLES: Record<GroupDef["tone"], { border: string; text: string; badge: string }> = {
  obrigatorio: {
    border: "border-red-500/30",
    text: "text-red-300",
    badge: "bg-red-500/10 text-red-400",
  },
  condicional: {
    border: "border-amber-500/30",
    text: "text-amber-300",
    badge: "bg-amber-500/10 text-amber-400",
  },
  recomendado: {
    border: "border-blue-500/30",
    text: "text-blue-300",
    badge: "bg-blue-500/10 text-blue-400",
  },
  outro: {
    border: "border-border/30",
    text: "text-muted-foreground",
    badge: "bg-accent/40",
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsSection({
  startupId,
  documents,
  naoSeAplica = [],
  rejections = [],
  compliance,
  onChange,
}: DocumentsSectionProps) {
  const byCategoria = new Map<DocCategory, DocumentRow>();
  const outros: DocumentRow[] = [];
  for (const doc of documents) {
    if (doc.categoria === "OUTRO") outros.push(doc);
    else byCategoria.set(doc.categoria, doc);
  }
  const naByCategoria = new Map<DocCategory, DocumentNARow>();
  for (const na of naoSeAplica) naByCategoria.set(na.categoria, na);

  // Mapa de rejeições em aberto por categoria. Quando o founder re-upload,
  // o backend marca `resolvedAt` e essa categoria some do mapa (refetch).
  const rejectionByCategoria = new Map<DocCategory, DocumentRejectionRow>();
  for (const r of rejections) rejectionByCategoria.set(r.categoria, r);

  return (
    <section className="space-y-6">
      {compliance && <ComplianceBanner compliance={compliance} />}

      {rejections.length > 0 && (
        <RejectionsSummaryBanner rejections={rejections} />
      )}

      {GROUPS.map((group) => {
        const style = TONE_STYLES[group.tone];
        return (
          <div
            key={group.id}
            className={`glass-card rounded-3xl p-6 lg:p-8 border-2 ${style.border} space-y-5`}
          >
            <header className="flex items-baseline justify-between gap-4">
              <div>
                <h3 className={`text-lg font-black tracking-tight ${style.text}`}>
                  {group.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">{group.description}</p>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${style.badge}`}>
                {group.tone}
              </span>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.slots.map((slot) => (
                <DocSlot
                  key={slot.categoria}
                  startupId={startupId}
                  categoria={slot.categoria}
                  label={slot.label}
                  hint={slot.hint}
                  current={byCategoria.get(slot.categoria) ?? null}
                  naEntry={naByCategoria.get(slot.categoria) ?? null}
                  rejection={rejectionByCategoria.get(slot.categoria) ?? null}
                  onChange={onChange}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="glass-card rounded-3xl p-6 lg:p-8 border-2 border-border/30 space-y-4">
        <header className="flex items-baseline justify-between gap-4">
          <div>
            <h3 className="text-lg font-black tracking-tight">
              Outros documentos ({outros.length})
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Documentos avulsos que não cabem nos slots acima.
            </p>
          </div>
          <OutrosAddButton startupId={startupId} onChange={onChange} />
        </header>

        {outros.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">Nenhum documento extra anexado.</p>
        ) : (
          <ul className="space-y-2">
            {outros.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-accent/20 border border-border/20"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold truncate">{doc.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatSize(doc.sizeBytes)} · {doc.mimetype}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <DocActionButton
                    label="Baixar"
                    icon={<Download className="w-4 h-4" />}
                    onClick={() => downloadDoc(startupId, doc.id)}
                  />
                  <DeleteDocButton
                    startupId={startupId}
                    docId={doc.id}
                    nome={doc.nome}
                    onChange={onChange}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ComplianceBanner({ compliance }: { compliance: ComplianceStatus }) {
  const { required, present, missing } = compliance;
  const pct = required > 0 ? Math.round((present / required) * 100) : 100;
  const tone =
    present === required
      ? { wrap: "border-emerald-500/40 bg-emerald-500/5", bar: "bg-emerald-500" }
      : present >= required - 2
        ? { wrap: "border-amber-500/40 bg-amber-500/5", bar: "bg-amber-500" }
        : { wrap: "border-red-500/40 bg-red-500/5", bar: "bg-red-500" };

  return (
    <div className={`rounded-2xl border-2 ${tone.wrap} p-5 space-y-3`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest">Compliance CVM</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {present === required
              ? "Todos os documentos obrigatórios estão anexados."
              : `Faltam ${required - present} documento${required - present === 1 ? "" : "s"} obrigatório${required - present === 1 ? "" : "s"} pra publicar a oferta.`}
          </p>
        </div>
        <span className="text-2xl font-black tracking-tight">
          {present}/{required}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-accent/30 overflow-hidden">
        <div
          className={`h-full ${tone.bar} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {missing.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {missing.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/30 text-xs"
            >
              <Circle className="w-3 h-3 opacity-60" />
              {CATEGORY_LABELS[cat] ?? cat}
            </span>
          ))}
        </div>
      ) : (
        <div className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" /> Pronto pra publicar a oferta.
        </div>
      )}
    </div>
  );
}

/// Banner-resumo no topo da página (lista de todas as rejeições em aberto).
/// Aponta pro founder que existem N docs rejeitados sem repetir o detalhe de cada um.
function RejectionsSummaryBanner({
  rejections,
}: {
  rejections: DocumentRejectionRow[];
}) {
  return (
    <div className="rounded-2xl border-2 border-red-500/40 bg-red-500/5 p-5 space-y-2">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-300">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black uppercase tracking-widest text-red-300">
            {rejections.length === 1
              ? "1 documento rejeitado pelo Compliance"
              : `${rejections.length} documentos rejeitados pelo Compliance`}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Envie uma nova versão para cada categoria abaixo — o banner
            vermelho no slot mostra o motivo e desaparece após o re-envio.
          </p>
        </div>
      </div>
    </div>
  );
}

/// Banner vermelho inline no slot da categoria rejeitada. Mostra arquivo
/// anterior + instrução para re-upload. Some quando o founder envia substituto.
function RejectionBanner({ rejection }: { rejection: DocumentRejectionRow }) {
  const categoriaLabel = CATEGORY_LABELS[rejection.categoria] ?? rejection.categoria;
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 space-y-1.5 text-xs"
    >
      <div className="flex items-center gap-2 text-red-300">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="font-bold uppercase tracking-widest">
          Compliance rejeitou o documento anterior
        </span>
      </div>
      <p className="text-red-200/80">
        Categoria: <strong className="font-bold">{categoriaLabel}</strong>
      </p>
      <p className="text-red-200/80 truncate" title={rejection.documentName}>
        Arquivo: <span className="font-mono">{rejection.documentName}</span>
      </p>
      <p className="text-red-200/80">
        Motivo: <span className="italic">{rejection.reason}</span>
      </p>
      <p className="text-red-300/80 font-bold pt-1">
        Envie um novo arquivo no slot abaixo para nova análise.
      </p>
    </div>
  );
}

interface DocSlotProps {
  startupId: number;
  categoria: Exclude<DocCategory, "OUTRO">;
  label: string;
  hint: string;
  current: DocumentRow | null;
  naEntry: DocumentNARow | null;
  rejection: DocumentRejectionRow | null;
  onChange: () => void;
}

function DocSlot({ startupId, categoria, label, hint, current, naEntry, rejection, onChange }: DocSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canNA = !ESSENTIAL_CATEGORIES.has(categoria);
  const isNaoSeAplica = Boolean(naEntry);
  const [naOpen, setNaOpen] = useState(isNaoSeAplica);
  const [justificativa, setJustificativa] = useState(naEntry?.justificativa ?? "");
  // Rastreia o último valor efetivamente salvo (PUT) — usado para desabilitar
  // o botão "Salvar justificativa" enquanto o texto não diverge do que está no backend.
  const [savedJustificativa, setSavedJustificativa] = useState(
    naEntry?.justificativa ?? "",
  );

  const uploadMutation = useMutation({
    mutationFn: uploadDocFn,
    onSuccess: () => {
      toast.success("Documento enviado.");
      onChange();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro inesperado.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocFn,
    onSuccess: () => {
      toast.success("Documento removido.");
      onChange();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro inesperado.");
    },
  });

  // N/A estruturado — marca/desmarca a categoria como "Não se aplica".
  const setNaMutation = useMutation({
    mutationFn: async (texto: string) => {
      const res = await fetch(`/api/startup/${startupId}/documents/na`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categoria, justificativa: texto }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? "Falha ao marcar Não se aplica.");
      }
      return body;
    },
    onSuccess: (_data, variables) => {
      toast.success('Marcado como "Não se aplica".');
      setSavedJustificativa(variables);
      onChange();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erro inesperado."),
  });

  const removeNaMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/startup/${startupId}/documents/na/${categoria}`,
        { method: "DELETE", credentials: "include" },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? "Falha ao remover a marcação.");
      }
      return body;
    },
    onSuccess: () => {
      toast.success('Marcação "Não se aplica" removida.');
      setNaOpen(false);
      setJustificativa("");
      setSavedJustificativa("");
      onChange();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Erro inesperado."),
  });

  const uploading =
    uploadMutation.isPending ||
    deleteMutation.isPending ||
    setNaMutation.isPending ||
    removeNaMutation.isPending;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    uploadMutation.mutate({ startupId, categoria, file });
    event.target.value = "";
  };

  const handleNaToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setNaOpen(true); // abre o campo de justificativa; confirma no botão Salvar
    } else if (isNaoSeAplica) {
      removeNaMutation.mutate();
    } else {
      setNaOpen(false);
    }
  };

  return (
    <div className="rounded-2xl border-2 border-border/30 bg-accent/10 p-5 space-y-3">
      {rejection && <RejectionBanner rejection={rejection} />}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-sm font-black tracking-tight">{label}</h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{hint}</p>
          {canNA && !current && (
            <div className="pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isNaoSeAplica || naOpen}
                  disabled={uploading}
                  onChange={handleNaToggle}
                  className="rounded border-white/20 bg-black/40 text-primary focus:ring-0 cursor-pointer"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Não se aplica
                </span>
              </label>
            </div>
          )}
        </div>
        <FileText
          className={`w-5 h-5 shrink-0 ${
            current
              ? "text-emerald-400"
              : isNaoSeAplica
                ? "text-amber-500/80"
                : "text-muted-foreground/40"
          }`}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFile}
        className="sr-only"
      />

      {/* Campo de justificativa do "Não se aplica" (obrigatório) */}
      {canNA && !current && (naOpen || isNaoSeAplica) && (() => {
        const trimmed = justificativa.trim();
        const isDirty = trimmed !== savedJustificativa;
        const isMinLength = trimmed.length >= 3;
        // BUG-FT-006: defesa em profundidade — o maxLength do DOM já limita
        // a 1000, mas se um paste programático contornar (autofill, extensão),
        // o botão Salvar continua desabilitado para evitar 400 do backend.
        const exceedsMaxLength = trimmed.length > JUSTIFICATIVA_MAX_LENGTH;
        const canSave = isDirty && isMinLength && !exceedsMaxLength;
        return (
        <div className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
          <label className="block text-[11px] font-bold text-amber-300">
            Por que este documento não se aplica à sua startup?
          </label>
          <textarea
            rows={2}
            value={justificativa}
            disabled={uploading}
            // BUG-FT-006: limita o input no DOM a 1000 caracteres (mesmo
            // limite do backend em startup-extras.service.ts:514) para o usuário
            // não digitar/pastar mais do que o permitido.
            maxLength={JUSTIFICATIVA_MAX_LENGTH}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Ex.: empresa constituída há menos de 1 ano, sem exercício anterior."
            className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-xs text-foreground outline-none focus:border-amber-500/40"
          />
          {/* Contador X/1000 com aviso visual quando ≥900 chars (BUG-FT-006). */}
          <p
            className={`text-right text-[10px] ${
              justificativa.length >= JUSTIFICATIVA_NEAR_LIMIT
                ? "text-destructive"
                : "text-muted-foreground"
            }`}
            aria-label={
              justificativa.length >= JUSTIFICATIVA_NEAR_LIMIT
                ? `${justificativa.length} caracteres digitados — próximo do limite de ${JUSTIFICATIVA_MAX_LENGTH}`
                : undefined
            }
          >
            {justificativa.length}/{JUSTIFICATIVA_MAX_LENGTH}
          </p>
          {naEntry?.reviewStatus === "REJECTED" && naEntry?.reviewNote && (
            <p className="text-[10px] text-destructive">
              Compliance rejeitou: {naEntry.reviewNote}
            </p>
          )}
          <div className="flex items-center gap-2">
            <DocActionButton
              label={
                setNaMutation.isPending
                  ? "Salvando…"
                  : !isDirty && isNaoSeAplica
                    ? "Justificativa salva"
                    : "Salvar justificativa"
              }
              icon={<CheckCircle2 className="h-4 w-4" />}
              primary
              disabled={uploading || !canSave || exceedsMaxLength}
              onClick={() => setNaMutation.mutate(trimmed)}
            />
            {isNaoSeAplica && (
              <DocActionButton
                label="Desfazer"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                danger
                disabled={uploading}
                onClick={() => removeNaMutation.mutate()}
              />
            )}
          </div>
        </div>
        );
      })()}

      {current ? (
        <div className="space-y-2">
            <div className="text-sm font-bold truncate" title={current.nome}>
              {current.nome}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatSize(current.sizeBytes)} · {current.mimetype}
            </div>
            <div className="flex gap-2 pt-1">
              <DocActionButton
                label="Baixar"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={() => {
                  if (current.legacyUrl) {
                    window.open(current.legacyUrl, "_blank", "noopener,noreferrer");
                  } else {
                    downloadDoc(startupId, current.id);
                  }
                }}
              />
              <DocActionButton
                label={uploading ? "Enviando…" : "Substituir"}
                icon={
                  uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )
                }
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              />
              {!current.legacy && (
                <DeleteDocButton
                  startupId={startupId}
                  docId={current.id}
                  nome={current.nome}
                  onChange={onChange}
                  disabled={uploading}
                />
              )}
            </div>
          </div>
      ) : isNaoSeAplica ? null : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border/40 hover:bg-accent/30 text-sm disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Enviando…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" /> Anexar arquivo
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface OutrosAddButtonProps {
  startupId: number;
  onChange: () => void;
}

function OutrosAddButton({ startupId, onChange }: OutrosAddButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: uploadDocFn,
    onSuccess: () => {
      toast.success("Documento enviado.");
      onChange();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro inesperado.");
    },
  });

  const uploading = uploadMutation.isPending;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    uploadMutation.mutate({ startupId, categoria: "OUTRO" as DocCategory, file });
    event.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFile}
        className="sr-only"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <Plus className="w-3.5 h-3.5" /> Adicionar outro
          </>
        )}
      </button>
    </>
  );
}

interface DocActionButtonProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  primary?: boolean;
  disabled?: boolean;
}

function DocActionButton({ label, icon, onClick, danger, primary, disabled }: DocActionButtonProps) {
  // BUG-FT-009 — antes o variant `primary` tinha min-h-11 + px-4 + text-sm
  // (~44px) enquanto `danger`/`default` tinham py-1.5 + text-xs (~28px).
  // O "Salvar justificativa" ficava ~60% maior que "Desfazer" no mesmo
  // flex row. Fix unifica estrutura base de padding/tamanho; diferencia
  // visualmente só pela cor (magenta vs vermelho vs cinza) e mantém o
  // CTA destacado.
  const variantClass = primary
    ? "gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
    : danger
      ? "gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20"
      : "gap-1.5 px-2.5 py-1.5 text-xs font-bold bg-accent/40 hover:bg-accent/60";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variantClass}`}
    >
      {icon}
      {label}
    </button>
  );
}

interface DeleteDocButtonProps {
  startupId: number;
  docId: number;
  /** Nome do documento exibido no drawer de confirmação. */
  nome?: string;
  onChange: () => void;
  disabled?: boolean;
}

/**
 * Botão "Remover" + Drawer de confirmação do Design System (substitui o
 * `window.confirm()` nativo). Mantém a a11y e a animação do Drawer padrão.
 */
function DeleteDocButton({
  startupId,
  docId,
  nome,
  onChange,
  disabled,
}: DeleteDocButtonProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteDocRequest(startupId, docId, onChange);
      setOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DocActionButton
        label="Remover"
        icon={<Trash2 className="w-3.5 h-3.5" />}
        danger
        disabled={disabled}
        onClick={() => setOpen(true)}
      />
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Documentos"
        title="Remover documento"
        dismissible={!isDeleting}
      >
        <DrawerBody>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tem certeza que deseja remover
            {nome ? (
              <>
                {" "}
                <span className="font-bold text-foreground">{nome}</span>
              </>
            ) : (
              " este documento"
            )}
            ? Esta ação não pode ser desfeita.
          </p>
        </DrawerBody>
        <DrawerFooter>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={isDeleting}
            className="inline-flex min-h-10 items-center rounded-lg bg-accent/40 px-4 text-sm font-bold text-foreground transition-colors hover:bg-accent/60 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-500/90 px-4 text-sm font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            {isDeleting ? "Removendo…" : "Remover"}
          </button>
        </DrawerFooter>
      </Drawer>
    </>
  );
}

async function uploadDocFn({
  startupId,
  categoria,
  file,
}: {
  startupId: number;
  categoria: DocCategory;
  file: File;
}) {
  const form = new FormData();
  form.append("file", file);
  form.append("categoria", categoria);
  const res = await fetch(`/api/startup/${startupId}/documents`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    throw new Error(body?.message ?? "Não foi possível enviar o arquivo.");
  }
  return body;
}

async function deleteDocFn({
  startupId,
  docId,
}: {
  startupId: number;
  docId: number;
}) {
  const res = await fetch(`/api/startup/${startupId}/documents/${docId}`, {
    method: "DELETE",
    credentials: "include",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    throw new Error(body?.message ?? "Não foi possível remover.");
  }
  return body;
}

async function downloadDoc(startupId: number, docId: number) {
  try {
    const res = await fetch(
      `/api/startup/${startupId}/documents/${docId}/download`,
      { credentials: "include" },
    );
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.error) {
      toast.error(body?.message ?? "Não foi possível gerar o link de download.");
      return;
    }
    const url: string | undefined = body?.data?.url;
    if (!url) {
      toast.error("URL ausente na resposta.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Erro inesperado.");
  }
}

async function deleteDocRequest(
  startupId: number,
  docId: number,
  onChange: () => void,
) {
  try {
    const res = await fetch(`/api/startup/${startupId}/documents/${docId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || body?.error) {
      toast.error(body?.message ?? "Não foi possível remover.");
      return;
    }
    toast.success("Documento removido.");
    onChange();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Erro inesperado.");
  }
}
