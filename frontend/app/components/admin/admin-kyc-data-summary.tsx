import { Activity, UserRound } from "lucide-react";

interface KycUser {
  nome?: string;
  email?: string;
  tipo_documento?: string | null;
  reg_documento?: string | null;
}

interface KycActivity {
  investmentsCount?: number;
  tokensCount?: number;
  totalInvested?: number;
}

interface AdminKycDataSummaryProps {
  user?: KycUser | null;
  riskScore?: number;
  activity?: KycActivity | null;
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Conferência dos dados reais devolvidos pelo detalhe KYC.
 * O backend chama o campo de `riskScore`, mas seu cálculo representa
 * completude dos documentos aprovados; a UI usa um rótulo não ambíguo.
 */
export function AdminKycDataSummary({
  user,
  riskScore = 0,
  activity,
}: AdminKycDataSummaryProps) {
  const data = [
    { label: "Nome completo", value: user?.nome || "—" },
    { label: "E-mail", value: user?.email || "—" },
    { label: "Tipo de documento", value: user?.tipo_documento || "—" },
    {
      label: "Nº do documento",
      value: user?.reg_documento || "—",
      mono: true,
    },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-card p-5 shadow-lg md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserRound className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
            Cadastro
          </p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-foreground">
            Conferência de dados
          </h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              {item.label}
            </p>
            <p
              className={`mt-2 break-words text-sm font-bold text-foreground ${
                item.mono ? "font-mono tracking-wide text-primary" : ""
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {riskScore > 0 && (
        <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Completude do KYC
            </p>
            <span className="text-xs font-black text-primary">
              {riskScore}%
            </span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Completude do KYC"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={riskScore}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.min(100, Math.max(0, riskScore))}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Percentual calculado a partir dos documentos aprovados.
          </p>
        </div>
      )}

      {activity && (
        <div className="mt-5 border-t border-white/10 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Atividade da conta
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-black/20 p-2">
              <p className="text-base font-black text-foreground">
                {activity.investmentsCount ?? 0}
              </p>
              <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                Investimentos
              </p>
            </div>
            <div className="rounded-lg bg-black/20 p-2">
              <p className="text-base font-black text-foreground">
                {activity.tokensCount ?? 0}
              </p>
              <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                Tokens
              </p>
            </div>
            <div className="rounded-lg bg-black/20 p-2">
              <p className="truncate text-xs font-black text-foreground">
                {currencyFormatter.format(activity.totalInvested ?? 0)}
              </p>
              <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                Investido
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
