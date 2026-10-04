import type { CaptacaoCampaign } from "~/lib/captacao-shared";

interface ProgressItem {
  label: string;
  complete: boolean;
  value?: string;
}

const RESOURCE_CATEGORIES = [
  "FUNDADOR",
  "DESENVOLVIMENTO",
  "COMERCIAL",
  "MARKETING",
  "NUVEM",
  "JURIDICO",
  "RESERVA_CAIXA",
] as const;

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function buildProgressItems(campaign: CaptacaoCampaign): ProgressItem[] {
  const resources = campaign.resources ?? [];
  const resourcesTotal = RESOURCE_CATEGORIES.reduce(
    (sum, category) =>
      sum + Number(resources.find((item) => item.categoria === category)?.percentual ?? 0),
    0,
  );
  const profitsEnabled =
    campaign.participacaoLucros === true || campaign.participacaoLucros === "true";
  const benefitsEnabled =
    campaign.beneficiosAdicionais === true || campaign.beneficiosAdicionais === "true";

  return [
    { label: "O que a startup espera alcançar", complete: hasText(campaign.oQueEsperaAlcancar) },
    {
      label: "Distribuição dos Recursos (soma = 100%)",
      complete: Math.abs(resourcesTotal - 100) < 0.01,
      value: `${resourcesTotal.toFixed(0)}%`,
    },
    { label: "Problema que resolve", complete: hasText(campaign.problema) },
    { label: "Solução proposta", complete: hasText(campaign.solucao) },
    { label: "Diferencial competitivo", complete: hasText(campaign.diferencial) },
    { label: "Modelo de receita", complete: hasText(campaign.modeloReceita) },
    { label: "Mercado-alvo", complete: hasText(campaign.mercadoAlvo) },
    {
      label: "Quantidade de sócios/fundadores",
      complete: Number(campaign.sociosCount ?? 0) > 0,
      value: String(Number(campaign.sociosCount ?? 0)),
    },
    { label: "Tempo de dedicação dos fundadores", complete: hasText(campaign.dedicacao) },
    { label: "Potenciais compradores", complete: hasText(campaign.compradores) },
    { label: "Concorrência", complete: hasText(campaign.concorrencia) },
    {
      label: "Opção de participação nos lucros",
      complete: !profitsEnabled || hasText(campaign.politicaLucros),
      value: profitsEnabled ? undefined : "OK",
    },
    {
      label: "Opção de benefícios adicionais",
      complete: !benefitsEnabled || hasText(campaign.beneficiosDescricao),
      value: benefitsEnabled ? undefined : "OK",
    },
  ];
}

export function CaptacaoProgressRail({
  campaign,
}: {
  campaign: CaptacaoCampaign | null;
}) {
  const items = buildProgressItems(campaign ?? ({} as CaptacaoCampaign));
  const completed = items.filter((item) => item.complete).length;
  const percent = Math.round((completed / items.length) * 100);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">
            Progresso do formulário
          </h3>
          <span className="text-xs font-bold text-primary">{percent}%</span>
        </div>
        <div
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do formulário de captação"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between border-b border-border pb-3 text-xs text-muted-foreground">
          <span>{completed} de {items.length} preenchidos</span>
          <span className="font-bold text-primary">{percent}%</span>
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.label} className="flex items-start justify-between gap-3 text-[10px]">
            <span className={item.complete ? "font-semibold text-foreground" : "font-semibold text-muted-foreground"}>
              {item.label}
            </span>
            <span className={item.complete ? "shrink-0 font-bold text-primary" : "shrink-0 font-semibold text-muted-foreground/70"}>
              {item.value ?? (item.complete ? "OK" : "Pendente")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
