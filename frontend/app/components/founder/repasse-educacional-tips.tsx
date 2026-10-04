import { Accordion } from "radix-ui";
import { Lightbulb, Megaphone, Code2, Users, PiggyBank, ChevronDown } from "lucide-react";
import { cn } from "~/lib/utils";

const TIPS = [
  {
    id: "marketing",
    icon: Megaphone,
    title: "Marketing",
    body:
      "Antes de escalar verba de marketing, valide o canal de aquisicao com um teste pequeno. Calcule o CAC real (custo por cliente) e projete LTV em 12-24 meses. Canais que nao fecham o payback em ate 6 meses raramente compensam em startups early stage.",
  },
  {
    id: "desenvolvimento",
    icon: Code2,
    title: "Desenvolvimento",
    body:
      "Priorize 1-2 features de maior impacto para a proxima milestone e mantenha o backlog enxuto. Differenciar 'must have' de 'nice to have' evita refactors caros. Reserve ao menos 10% da verba para debito tecnico e seguranca.",
  },
  {
    id: "pessoal",
    icon: Users,
    title: "Pessoal",
    body:
      "Considere contratar 1-2 seniores em vez de varios juniores — o custo por decisao tecnica e menor e a curva de aprendizado da equipe e mais curta. Use equity (entre 0,5% e 2% por senior) para reter os primeiros em posicoes-chave.",
  },
  {
    id: "reserva",
    icon: PiggyBank,
    title: "Reserva de caixa",
    body:
      "Mantenha no minimo 6 meses de burn rate em reserva. Essa folga cobre imprevistos (mercado, perda de cliente-chave, troca de fornecedor) e da tempo para pivotar sem pressao. Sem reserva, voce acaba captando em condicoes ruins.",
  },
];

export interface RepasseEducacionalTipsProps {
  defaultOpen?: string[];
}

/**
 * @description Accordion com 4 dicas educacionais para o fundador
 * preencher a solicitacao de repasse. Conteudo em PT-BR.
 */
export function RepasseEducacionalTips({
  defaultOpen,
}: RepasseEducacionalTipsProps = {}) {
  return (
    <Accordion.Root
      type="multiple"
      defaultValue={defaultOpen ?? ["marketing"]}
      className="rounded-2xl border border-border/40 bg-card/40 divide-y divide-border/40 overflow-hidden"
      data-testid="repasse-educacional-tips"
    >
      <div className="px-4 py-3 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Dicas para usar bem os recursos
        </span>
      </div>
      {TIPS.map((tip) => {
        const Icon = tip.icon;
        return (
          <Accordion.Item
            key={tip.id}
            value={tip.id}
            className="group"
            data-tip-item={tip.id}
          >
            <Accordion.Header asChild>
              <Accordion.Trigger
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3",
                  "text-left text-sm font-black tracking-tight",
                  "hover:bg-accent/20 transition-colors",
                )}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-primary" />
                  {tip.title}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content
              className={cn(
                "px-4 pb-4 text-sm text-muted-foreground leading-relaxed",
                "data-[state=open]:animate-in data-[state=open]:fade-in-0",
              )}
            >
              {tip.body}
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}
