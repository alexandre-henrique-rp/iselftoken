/**
 * Campos CVM (Comissão de Valores Mobiliários) para o formulário de rodada.
 *
 * Agrupa 9 campos obrigatórios/regulatórios em 3 sub-grupos colapsáveis:
 * 1. Lançamento e objetivo (data, objetivo, metas)
 * 2. Lucros e benefícios (participação, faturamento mínimo, benefícios)
 * 3. Termos e declarações (aceite de repasse, veracidade)
 *
 * Componente 100% controlado — todos os valores vêm e vão via `value`/`onChange`.
 *
 * @param props - Props do componente
 * @param props.value - Objeto com todos os 9 campos CVM (todos opcionais)
 * @param props.onChange - Callback chamado ao alterar qualquer campo
 * @param props.errors - Mapa de erros por nome de campo (ex: `{ objetivoCaptacao: "Mínimo 10 caracteres" }`)
 * @returns Componente JSX dos campos CVM
 * @example
 * <RoundCvmFields value={cvmData} onChange={setCvmData} errors={errors} />
 */
import { AlertTriangle, Calendar, CircleDollarSign, FileText } from "lucide-react";
import { cn } from "~/lib/utils";

export interface CvmFields {
  dataLancamentoRodada?: string;
  objetivoCaptacao?: string;
  oQueEsperaAlcancar?: string;
  participacaoLucros?: boolean;
  faturamentoMinimoLucros?: number;
  beneficiosAdicionais?: boolean;
  beneficiosDescricao?: string;
  aceiteTermoRepasse?: boolean;
  declaracaoVeracidade?: boolean;
}

interface RoundCvmFieldsProps {
  value: CvmFields;
  onChange: (value: CvmFields) => void;
  errors?: Record<string, string>;
}

const t = (key: string) => {
  const strings: Record<string, string> = {
    "campaign.cvm.lancamento": "Lan\u00e7amento e Objetivo",
    "campaign.cvm.lancamento.data": "Data de Lan\u00e7amento da Rodada",
    "campaign.cvm.lancamento.objetivo": "Objetivo da Capta\u00e7\u00e3o",
    "campaign.cvm.lancamento.objetivo.placeholder":
      "Descreva para que existe esta rodada (10-500 caracteres)",
    "campaign.cvm.lancamento.alcancar": "O que espera alcan\u00e7ar",
    "campaign.cvm.lancamento.alcancar.placeholder":
      "Metas concretas que pretende atingir (10-500 caracteres)",
    "campaign.cvm.lucros": "Lucros e Benef\u00edcios",
    "campaign.cvm.lucros.participacao": "Participa\u00e7\u00e3o nos Lucros",
    "campaign.cvm.lucros.faturamentoMinimo":
      "Faturamento M\u00ednimo para Lucros (R$)",
    "campaign.cvm.lucros.faturamentoWarning":
      "Aten\u00e7\u00e3o: faturamento m\u00ednimo definido, mas participa\u00e7\u00e3o nos lucros est\u00e1 desativada",
    "campaign.cvm.lucros.beneficios": "Benef\u00edcios Adicionais",
    "campaign.cvm.lucros.beneficiosDescricao": "Descri\u00e7\u00e3o dos Benef\u00edcios",
    "campaign.cvm.lucros.beneficiosDescricao.placeholder":
      "Descreva os benef\u00edcios adicionais (10-500 caracteres)",
    "campaign.cvm.termos": "Termos e Declara\u00e7\u00f5es",
    "campaign.cvm.termos.aceiteRepasse": "Aceito o termo de repasse",
    "campaign.cvm.termos.lerTermo": "Ler termo de repasse",
    "campaign.cvm.termos.declaracaoVeracidade":
      "Declaro que as informa\u00e7\u00f5es s\u00e3o verdadeiras",
  };
  return strings[key] ?? key;
};

/**
 * Seção colapsável padrão para agrupar campos CVM relacionados.
 */
function CollapsibleGroup({
  title,
  icon,
  defaultOpen,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center gap-3 cursor-pointer list-none select-none py-3 px-1 rounded-xl hover:bg-white/5 transition-colors">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-sm font-black tracking-tight">{title}</span>
        <span className="ml-auto text-muted-foreground text-xs group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <div className="pt-4 pb-2 space-y-5">{children}</div>
    </details>
  );
}

/**
 * Campo de entrada de texto com label e mensagem de erro opcional.
 */
function TextField({
  id,
  label,
  type = "text",
  value,
  placeholder,
  error,
  onChange,
  min,
  max,
  step,
  isCurrency,
}: {
  id: string;
  label: string;
  type?: string;
  value: string | number | undefined;
  placeholder?: string;
  error?: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  step?: number;
  isCurrency?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      <div className="relative">
        {isCurrency && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            R$
          </span>
        )}
        <input
          id={id}
          type={type}
          value={value ?? ""}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "input-field text-sm",
            isCurrency && "!pl-10",
            error && "border-red-400",
          )}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-red-400 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Campo de textarea com label e placeholder.
 */
function TextAreaField({
  id,
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string | undefined;
  placeholder?: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value ?? ""}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "input-field text-sm resize-y min-h-[80px]",
          error && "border-red-400",
        )}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} className="text-red-400 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Toggle switch controlado.
 */
function ToggleField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <label
        htmlFor={id}
        className="text-sm font-medium text-foreground cursor-pointer"
      >
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          checked ? "bg-primary" : "bg-muted",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

export function RoundCvmFields({
  value,
  onChange,
  errors,
}: RoundCvmFieldsProps) {
  const update = (patch: Partial<CvmFields>) =>
    onChange({ ...value, ...patch });

  const showFaturamento =
    value.participacaoLucros === true &&
    value.faturamentoMinimoLucros != null &&
    value.faturamentoMinimoLucros > 0 &&
    value.participacaoLucros !== true;

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-6">
      <header>
        <h2 className="text-2xl font-black tracking-tight italic">
          Campos CVM / Compliance
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Informações regulatórias para a Comissão de Valores Mobiliários.
        </p>
      </header>

      <div className="divide-y divide-white/10">
        {/* Grupo 1 — Lançamento e objetivo */}
        <CollapsibleGroup
          title={t("campaign.cvm.lancamento")}
          icon={<Calendar className="w-4 h-4" />}
          defaultOpen
        >
          <TextField
            id="cvm-data-lancamento"
            label={t("campaign.cvm.lancamento.data")}
            type="date"
            value={value.dataLancamentoRodada}
            error={errors?.dataLancamentoRodada}
            onChange={(v) => update({ dataLancamentoRodada: v || undefined })}
          />
          <TextAreaField
            id="cvm-objetivo-captacao"
            label={t("campaign.cvm.lancamento.objetivo")}
            value={value.objetivoCaptacao}
            placeholder={t("campaign.cvm.lancamento.objetivo.placeholder")}
            error={errors?.objetivoCaptacao}
            onChange={(v) => update({ objetivoCaptacao: v || undefined })}
          />
          <TextAreaField
            id="cvm-o-que-espera-alcancar"
            label={t("campaign.cvm.lancamento.alcancar")}
            value={value.oQueEsperaAlcancar}
            placeholder={t("campaign.cvm.lancamento.alcancar.placeholder")}
            error={errors?.oQueEsperaAlcancar}
            onChange={(v) => update({ oQueEsperaAlcancar: v || undefined })}
          />
        </CollapsibleGroup>

        {/* Grupo 2 — Lucros e benefícios */}
        <CollapsibleGroup
          title={t("campaign.cvm.lucros")}
          icon={<CircleDollarSign className="w-4 h-4" />}
        >
          <ToggleField
            id="cvm-participacao-lucros"
            label={t("campaign.cvm.lucros.participacao")}
            checked={value.participacaoLucros === true}
            onChange={(v) =>
              update({
                participacaoLucros: v,
                faturamentoMinimoLucros:
                  !v && value.faturamentoMinimoLucros != null
                    ? undefined
                    : value.faturamentoMinimoLucros,
              })
            }
          />

          {value.participacaoLucros === true && (
            <TextField
              id="cvm-faturamento-minimo"
              label={t("campaign.cvm.lucros.faturamentoMinimo")}
              type="number"
              value={value.faturamentoMinimoLucros}
              isCurrency
              min={0}
              step={0.01}
              error={errors?.faturamentoMinimoLucros}
              onChange={(v) =>
                update({
                  faturamentoMinimoLucros: v ? Number(v) : undefined,
                })
              }
            />
          )}

          {/* Warning inline: faturamento definido mas participação desligada */}
          {!value.participacaoLucros &&
            value.faturamentoMinimoLucros != null &&
            value.faturamentoMinimoLucros > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                <p className="text-yellow-300 text-xs">
                  {t("campaign.cvm.lucros.faturamentoWarning")}
                </p>
              </div>
            )}

          <ToggleField
            id="cvm-beneficios-adicionais"
            label={t("campaign.cvm.lucros.beneficios")}
            checked={value.beneficiosAdicionais === true}
            onChange={(v) =>
              update({
                beneficiosAdicionais: v,
                beneficiosDescricao: !v ? undefined : value.beneficiosDescricao,
              })
            }
          />

          {value.beneficiosAdicionais === true && (
            <TextAreaField
              id="cvm-beneficios-descricao"
              label={t("campaign.cvm.lucros.beneficiosDescricao")}
              value={value.beneficiosDescricao}
              placeholder={t(
                "campaign.cvm.lucros.beneficiosDescricao.placeholder",
              )}
              error={errors?.beneficiosDescricao}
              onChange={(v) =>
                update({ beneficiosDescricao: v || undefined })
              }
            />
          )}
        </CollapsibleGroup>

        {/* Grupo 3 — Termos e declarações */}
        <CollapsibleGroup
          title={t("campaign.cvm.termos")}
          icon={<FileText className="w-4 h-4" />}
        >
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value.aceiteTermoRepasse === true}
                onChange={(e) =>
                  update({ aceiteTermoRepasse: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-muted accent-primary"
                aria-describedby={
                  errors?.aceiteTermoRepasse ? "cvm-aceite-error" : undefined
                }
              />
              <span className="text-sm">
                {t("campaign.cvm.termos.aceiteRepasse")}{" "}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  {t("campaign.cvm.termos.lerTermo")}
                </a>
              </span>
            </label>
            {errors?.aceiteTermoRepasse && (
              <p id="cvm-aceite-error" className="text-red-400 text-xs ml-7">
                {errors.aceiteTermoRepasse}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={value.declaracaoVeracidade === true}
                onChange={(e) =>
                  update({ declaracaoVeracidade: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-muted accent-primary"
                aria-describedby={
                  errors?.declaracaoVeracidade
                    ? "cvm-declaracao-error"
                    : undefined
                }
              />
              <span className="text-sm">
                {t("campaign.cvm.termos.declaracaoVeracidade")}
              </span>
            </label>
            {errors?.declaracaoVeracidade && (
              <p id="cvm-declaracao-error" className="text-red-400 text-xs ml-7">
                {errors.declaracaoVeracidade}
              </p>
            )}
          </div>
        </CollapsibleGroup>
      </div>
    </section>
  );
}
