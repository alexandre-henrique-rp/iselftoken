import { Download, FileCheck, FileX, AlertTriangle } from "lucide-react";
import type { DocumentoVerificacao } from "~/lib/documento-verificacao-types";

interface DocumentoVerificacaoCardProps {
  data: DocumentoVerificacao;
}

/**
 * Card de verificacao de documento assinado.
 *
 * Exibe status de validacao, detalhes tecnicos, signatarios e logs de auditoria.
 * Estilo premium verde/azul institucional com suporte a 3 estados.
 */
export function DocumentoVerificacaoCard({ data }: DocumentoVerificacaoCardProps) {
  const isValid = data.valid === true;
  const hasWarning = !isValid && data.exists;

  const statusConfig = isValid
    ? {
        icon: FileCheck,
        label: "Documento Valido",
        color: "text-emerald-400",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/30",
        badgeBg: "bg-emerald-500/15",
      }
    : hasWarning
      ? {
          icon: AlertTriangle,
          label: "Atencao",
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          badgeBg: "bg-amber-500/15",
        }
      : {
          icon: FileX,
          label: "Documento Invalido",
          color: "text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          badgeBg: "bg-red-500/15",
        };

  const StatusIcon = statusConfig.icon;

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`rounded-2xl border-2 ${statusConfig.borderColor} ${statusConfig.bgColor} p-6 space-y-6`}
    >
      {/* Header com status */}
      <div className="flex items-start gap-4">
        <div
          className={`w-14 h-14 rounded-2xl ${statusConfig.badgeBg} flex items-center justify-center shrink-0`}
        >
          <StatusIcon className={`w-7 h-7 ${statusConfig.color}`} />
        </div>
        <div>
          <h2 className={`text-xl font-black ${statusConfig.color}`}>
            {statusConfig.label}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {data.document?.type ?? "Termo de Adesao"}
          </p>
        </div>
      </div>

      {/* Validacao tecnica */}
      {data.validation && (
        <div className="rounded-xl bg-black/40 border border-border/20 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Validacao Tecnica
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ValidationItem
              label="Hash PDF"
              ok={data.validation.hashMatches}
            />
            <ValidationItem
              label="Certificados ativos"
              ok={data.validation.certificatesActive}
            />
            <ValidationItem
              label="Assinaturas no prazo"
              ok={data.validation.signedWithinValidity}
            />
          </div>
        </div>
      )}

      {/* Detalhes do documento */}
      {data.document && (
        <div className="rounded-xl bg-black/40 border border-border/20 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Detalhes do Documento
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Tipo</dt>
            <dd className="font-semibold text-foreground">
              {data.document.type}
            </dd>
            <dt className="text-muted-foreground">Assinado em</dt>
            <dd className="font-mono text-xs text-foreground">
              {formatDate(data.document.signedAt)}
            </dd>
            <dt className="text-muted-foreground">Versao</dt>
            <dd className="font-mono text-xs text-foreground">
              {data.document.templateVersion}
            </dd>
          </dl>
        </div>
      )}

      {/* Signatarios */}
      {data.signataries && data.signataries.length > 0 && (
        <div className="rounded-xl bg-black/40 border border-border/20 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Signatarios
          </p>
          <div className="space-y-3">
            {data.signataries.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {s.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.role === "founder" ? "Fundador" : "Startup"}
                  </p>
                  <p className="text-xs font-mono text-muted-foreground/70">
                    {s.document.masked}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Cert
                  </p>
                  <p className="text-xs font-mono text-muted-foreground/70">
                    {s.certificate.serialNumber.slice(0, 16)}...
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logs de auditoria */}
      {data.audits && data.audits.length > 0 && (
        <div className="rounded-xl bg-black/40 border border-border/20 p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Logs de Auditoria
          </p>
          <ul className="space-y-2">
            {data.audits.map((log, i) => (
              <li key={i} className="flex items-center justify-between gap-4">
                <span className="text-xs text-foreground">{log.action}</span>
                <span className="text-xs font-mono text-muted-foreground/70 shrink-0">
                  {formatDate(log.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botao de download */}
      {isValid && data.presignedUrl && (
        <a
          href={data.presignedUrl}
          download={`termo-adesao-verificado.pdf`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold transition-colors"
        >
          <Download className="w-5 h-5" />
          Baixar PDF Assinado
        </a>
      )}
    </div>
  );
}

function ValidationItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          ok ? "bg-emerald-500/20" : "bg-red-500/20"
        }`}
      >
        <span className={`text-xs font-black ${ok ? "text-emerald-400" : "text-red-400"}`}>
          {ok ? "\u2713" : "\u2717"}
        </span>
      </div>
      <span className={`text-xs ${ok ? "text-emerald-300" : "text-red-300"}`}>
        {label}
      </span>
    </div>
  );
}
