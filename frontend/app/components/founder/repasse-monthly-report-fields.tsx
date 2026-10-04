/**
 * RepasseMonthlyReportFields (FIN-11 §8.2).
 *
 * Sub-formulario dentro do RepasseInstallmentForm. Captura o "Relatorio
 * do Mes" preenchido pelo fundador:
 *
 *   1. Mensagem aos investidores (max 5000 chars) - publicada na Transparencia
 *      se a solicitacao for APROVADA.
 *   2. Uso do recurso (max 2000 chars) - publicado junto com a alocacao %.
 *   3. Teve lucro no periodo? (boolean).
 *   4. Atingiu algum marco do produto? (boolean + descricao condicional).
 *
 * Validacao cross-field (defense-in-depth): marcoDescricao so faz sentido
 * se marcoAlcancado === true. Backend tambem valida no service.
 *
 * LGPD: nenhum dado pessoal/bancario entra aqui. bankInfoSnapshot
 * continua sendo tirado da Startup pelo backend.
 */
import { CheckCircle2, Loader2, MessageSquare, Target, TrendingUp } from "lucide-react";
import { useState } from "react";
import { cn } from "~/lib/utils";

export interface MonthlyReportValues {
  mensagemInvestidores: string;
  usoRecurso: string;
  teveLucro: boolean | null;
  marcoAlcancado: boolean | null;
  marcoDescricao: string;
}

export interface RepasseMonthlyReportFieldsProps {
  /**
   * Valores iniciais (defaultValue). Usado para pre-preencher em re-submits
   * (caso o fundador queira editar a mensagem).
   */
  defaultValues?: Partial<MonthlyReportValues>;
  /**
   * Callback disparado a cada mudanca (estado controlado pelo pai).
   * Se omitido, o componente gerencia estado interno.
   */
  onChange?: (values: MonthlyReportValues) => void;
  /**
   * Quando true, mostra skeleton/spinner (apos submit bem-sucedido).
   */
  isSubmitting?: boolean;
  /**
   * Desabilita todos os campos (ex.: aguardando aprovacao).
   */
  disabled?: boolean;
}

const MESSAGE_MAX = 5000;
const USO_MAX = 2000;
const MARCO_DESC_MAX = 2000;

export function RepasseMonthlyReportFields({
  defaultValues,
  onChange,
  isSubmitting = false,
  disabled = false,
}: RepasseMonthlyReportFieldsProps) {
  const [mensagem, setMensagem] = useState(defaultValues?.mensagemInvestidores ?? "");
  const [uso, setUso] = useState(defaultValues?.usoRecurso ?? "");
  const [lucro, setLucro] = useState<boolean | null>(defaultValues?.teveLucro ?? null);
  const [marco, setMarco] = useState<boolean | null>(defaultValues?.marcoAlcancado ?? null);
  const [marcoDesc, setMarcoDesc] = useState(defaultValues?.marcoDescricao ?? "");

  function emit(
    next: Partial<{
      mensagemInvestidores: string;
      usoRecurso: string;
      teveLucro: boolean | null;
      marcoAlcancado: boolean | null;
      marcoDescricao: string;
    }>,
  ) {
    const merged: MonthlyReportValues = {
      mensagemInvestidores: next.mensagemInvestidores ?? mensagem,
      usoRecurso: next.usoRecurso ?? uso,
      teveLucro: next.teveLucro ?? lucro,
      marcoAlcancado: next.marcoAlcancado ?? marco,
      marcoDescricao: next.marcoDescricao ?? marcoDesc,
    };
    onChange?.(merged);
  }

  function handleMensagem(v: string) {
    const t = v.slice(0, MESSAGE_MAX);
    setMensagem(t);
    emit({ mensagemInvestidores: t });
  }

  function handleUso(v: string) {
    const t = v.slice(0, USO_MAX);
    setUso(t);
    emit({ usoRecurso: t });
  }

  function handleLucro(v: boolean) {
    setLucro(v);
    emit({ teveLucro: v });
  }

  function handleMarco(v: boolean) {
    setMarco(v);
    // Limpa a descricao se o fundador mudar para "Nao"
    if (!v) {
      setMarcoDesc("");
      emit({ marcoAlcancado: v, marcoDescricao: "" });
    } else {
      emit({ marcoAlcancado: v });
    }
  }

  function handleMarcoDesc(v: string) {
    const t = v.slice(0, MARCO_DESC_MAX);
    setMarcoDesc(t);
    emit({ marcoDescricao: t });
  }

  return (
    <section
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.03] to-card/40 p-5 space-y-5"
      data-testid="repasse-monthly-report"
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
            Relatorio do Mes
          </h3>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">
            FIN-11
          </span>
        </div>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </header>

      <p className="text-[11px] text-muted-foreground -mt-2">
        Conte o que aconteceu este mes para os investidores. Se a solicitacao for
        <strong className="text-foreground"> aprovada</strong>, este relatorio sera publicado
        na pagina de transparencia da startup.
      </p>

      {/* Mensagem aos investidores */}
      <div>
        <label
          htmlFor="monthly-msg"
          className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5"
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            Mensagem aos investidores
            <span className="ml-1 text-[8px] text-primary/80 normal-case tracking-wider font-bold">
              recomendado
            </span>
          </span>
          <span
            className={cn(
              "tabular-nums font-bold",
              MESSAGE_MAX - mensagem.length < 200
                ? "text-amber-400"
                : "text-muted-foreground",
            )}
          >
            {MESSAGE_MAX - mensagem.length} restantes
          </span>
        </label>
        <textarea
          id="monthly-msg"
          value={mensagem}
          onChange={(e) => handleMensagem(e.target.value)}
          maxLength={MESSAGE_MAX}
          rows={4}
          disabled={disabled}
          placeholder="Ex: Este mes lancamos o produto em beta para 100 usuarios. Conversao de trial para pago em 12%."
          data-testid="monthly-msg-input"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none disabled:opacity-50"
        />
      </div>

      {/* Uso do recurso */}
      <div>
        <label
          htmlFor="monthly-uso"
          className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5"
        >
          <span className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            Para onde o recurso sera utilizado
            <span className="ml-1 text-[8px] text-primary/80 normal-case tracking-wider font-bold">
              recomendado
            </span>
          </span>
          <span
            className={cn(
              "tabular-nums font-bold",
              USO_MAX - uso.length < 50 ? "text-amber-400" : "text-muted-foreground",
            )}
          >
            {USO_MAX - uso.length} restantes
          </span>
        </label>
        <textarea
          id="monthly-uso"
          value={uso}
          onChange={(e) => handleUso(e.target.value)}
          maxLength={USO_MAX}
          rows={2}
          disabled={disabled}
          placeholder="Ex: Captacao para contratacao de 1 dev senior + 1 designer."
          data-testid="monthly-uso-input"
          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none disabled:opacity-50"
        />
      </div>

      {/* Teve lucro */}
      <fieldset>
        <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
          A startup teve lucro neste periodo?
        </legend>
        <div className="flex gap-2" role="radiogroup">
          {[
            { value: true, label: "Sim" },
            { value: false, label: "Nao" },
          ].map((opt) => {
            const active = lucro === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                disabled={disabled}
                onClick={() => handleLucro(opt.value)}
                aria-pressed={active}
                data-testid={`monthly-lucro-${opt.value ? "sim" : "nao"}`}
                className={cn(
                  "flex-1 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                  active
                    ? "border-primary bg-primary/15 text-primary shadow-[0_0_12px_rgba(213,0,249,0.2)]"
                    : "border-white/10 bg-card/40 text-muted-foreground hover:border-white/20 hover:text-foreground",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Marco */}
      <fieldset>
        <legend className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
          Atingiu algum marco do produto?
        </legend>
        <div className="flex gap-2" role="radiogroup">
          {[
            { value: true, label: "Sim" },
            { value: false, label: "Nao" },
          ].map((opt) => {
            const active = marco === opt.value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                disabled={disabled}
                onClick={() => handleMarco(opt.value)}
                aria-pressed={active}
                data-testid={`monthly-marco-${opt.value ? "sim" : "nao"}`}
                className={cn(
                  "flex-1 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition",
                  "focus-visible:ring-2 focus-visible:ring-primary/40",
                  active
                    ? "border-primary bg-primary/15 text-primary shadow-[0_0_12px_rgba(213,0,249,0.2)]"
                    : "border-white/10 bg-card/40 text-muted-foreground hover:border-white/20 hover:text-foreground",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {marco === true && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <label
              htmlFor="monthly-marco-desc"
              className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5"
            >
              <span className="flex items-center gap-1.5">
                <Target className="h-3 w-3 text-primary" />
                Detalhe do marco atingido
              </span>
              <span
                className={cn(
                  "tabular-nums font-bold",
                  MARCO_DESC_MAX - marcoDesc.length < 50
                    ? "text-amber-400"
                    : "text-muted-foreground",
                )}
              >
                {MARCO_DESC_MAX - marcoDesc.length} restantes
              </span>
            </label>
            <textarea
              id="monthly-marco-desc"
              value={marcoDesc}
              onChange={(e) => handleMarcoDesc(e.target.value)}
              maxLength={MARCO_DESC_MAX}
              rows={3}
              disabled={disabled}
              placeholder="Ex: Beta fechada com 100 usuarios ativos, NPS 45."
              data-testid="monthly-marco-desc-input"
              className="w-full bg-black/40 border border-primary/30 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 resize-none disabled:opacity-50"
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Sera publicado na pagina de transparencia se aprovado
            </p>
          </div>
        )}
      </fieldset>
    </section>
  );
}