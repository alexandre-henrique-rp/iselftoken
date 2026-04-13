import {
  BadgeCheck,
  Crown,
  Handshake,
  Rocket,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { User } from "~/types/user";

export interface Plano {
  id: number | string;
  nome: string;
  slug: string;
  descricao: string;
  preco: string;
  periodo: string;
  periodoMeses: number;
  icon: string;
  beneficios: string[];
  visivel: boolean;
  isActive: boolean;
  recomendado: boolean;
}

export interface PlansResponse {
  planos: Plano[];
  planoAtual?: string | null;
  promocao?: {
    codigo: string;
    desconto: number;
    validoAte: string;
  } | null;
  user: User
}

interface PlansHeaderProps {
  titulo: string;
  subtitulo: string;
  validadeMeses: number;
}

interface PlanCardProps {
  plano: Plano;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: (planoId: string) => void;
  onCheckout?: (plano: Plano) => void;
}

interface PlansGridProps {
  planos: Plano[];
  selectedPlan: string | null;
  currentPlan: string | null;
  onSelect: (planoId: string) => void;
  onCheckout?: (plano: Plano) => void;
}

interface EmptyStateProps {
  titulo: string;
  mensagem: string;
}

interface PromoBannerProps {
  codigo: string;
  desconto: number;
}

const iconMap = {
  Handshake,
  Rocket,
  TrendingUp,
  Crown,
  BadgeCheck,
  Sparkles,
};

/**
 * @name getPlanIcon
 * @description Retorna o ícone associado ao plano ou um fallback seguro.
 *
 * @param {string} iconName - Nome do ícone informado pela API
 * @returns {React.ComponentType} Componente de ícone do Lucide
 */
export function getPlanIcon(iconName: string) {
  return iconMap[iconName as keyof typeof iconMap] ?? Sparkles;
}

/**
 * @name formatPrice
 * @description Formata o valor para moeda BRL sem casas decimais.
 *
 * @param {number} value - Valor numérico do plano
 * @returns {string} Valor formatado em moeda
 */
export function formatPrice(value: number | string): string {
  const numericValue = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(numericValue || 0);
}

/**
 * @name PlansHeader
 * @description Renderiza o cabeçalho principal da página de planos.
 *
 * @param {PlansHeaderProps} props - Dados do cabeçalho
 * @returns {JSX.Element} Cabeçalho centralizado
 */
export function PlansHeader({
  titulo,
  subtitulo,
  validadeMeses,
}: PlansHeaderProps) {
  return (
    <header className="relative mb-12 text-center">
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d500f9]/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#d500f9]/15 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#f7b7ff]">
        <span className="h-2 w-2 rounded-full bg-[#d500f9]" />
        Mais de 1.000.000 de usuários
      </div>
      <h1 className="text-4xl font-extrabold leading-tight text-stone-50 md:text-5xl">
        {titulo}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-base text-stone-400 md:text-lg">
        {subtitulo} · Plano válido por {validadeMeses} meses
      </p>
    </header>
  );
}

/**
 * @name PlanCard
 * @description Card individual com seleção e CTA do plano.
 *
 * @param {PlanCardProps} props - Dados e callbacks do card
 * @returns {JSX.Element} Card com informações do plano
 */
export function PlanCard({
  plano,
  isSelected,
  isCurrent,
  onSelect,
  onCheckout,
}: PlanCardProps) {
  const isFeatured = plano.recomendado;
  const Icon = getPlanIcon(plano.icon);
  const badgeLabel = plano.recomendado ? "Recomendado" : null;

  const handleSelect = () => {
    if (isCurrent) return;
    onSelect(String(plano.id));
  };

  return (
    <article
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      aria-label={`Plano ${plano.nome}`}
      onClick={handleSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      }}
      className={cn(
        "relative mx-auto flex h-full w-full max-w-sm flex-col rounded-2xl border bg-stone-900 p-6 transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d500f9] focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950",
        "hover:-translate-y-1 hover:border-stone-600",
        isFeatured &&
          "z-10 scale-[1.05] border-2 border-[#d500f9] shadow-lg shadow-[#d500f9]/20",
        isSelected && !isFeatured && "border-[#d500f9]",
        isCurrent && "cursor-not-allowed opacity-60 hover:translate-y-0",
      )}
    >
      {badgeLabel ? (
        <span className="absolute -top-3 right-6 rounded-full bg-[#d500f9] px-3 py-1 text-xs font-semibold text-white">
          {badgeLabel}
        </span>
      ) : null}

      {isCurrent ? (
        <span className="absolute -top-3 left-6 rounded-full bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-100">
          Plano atual
        </span>
      ) : null}

      <div className="mb-6 flex items-center gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl border",
            isFeatured
              ? "border-white/20 bg-white/10"
              : "border-stone-800 bg-stone-950",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              isFeatured ? "text-white" : "text-stone-200",
            )}
          />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
            {plano.nome}
          </p>
          <h3 className="text-xl font-bold text-stone-50">{plano.nome}</h3>
        </div>
      </div>

      <div className="mb-4 flex items-end gap-2">
        <span className="text-3xl font-bold text-[#d500f9]">
          {formatPrice(plano.preco)}
        </span>
        <span className="text-sm text-stone-400">{plano.periodo}</span>
      </div>

      <p className="mb-6 min-h-14 text-sm text-stone-400">{plano.descricao}</p>

      {isCurrent ? (
        <Button
          type="button"
          disabled
          className="mb-6 w-full cursor-not-allowed bg-stone-800 text-stone-200"
        >
          Plano atual
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() => onCheckout?.(plano)}
          className="mb-6 w-full bg-[#d500f9] text-white hover:bg-[#b000d4]"
          disabled={!onCheckout}
        >
          Começar agora
        </Button>
      )}

      <ul className="space-y-3 text-sm text-stone-300">
        {plano.beneficios.map((beneficio) => (
          <li
            key={`${plano.id}-${beneficio}`}
            className="flex items-start gap-3"
          >
            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10 text-green-500">
              <BadgeCheck className="h-3.5 w-3.5" />
            </span>
            <span>{beneficio}</span>
          </li>
        ))}
        {!plano.beneficios.length ? (
          <li className="flex items-start gap-3 text-stone-500">
            <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-stone-800 text-stone-500">
              <X className="h-3.5 w-3.5" />
            </span>
            Nenhum benefício informado.
          </li>
        ) : null}
      </ul>
    </article>
  );
}

/**
 * @name PlansGrid
 * @description Grid responsivo de cards de planos.
 *
 * @param {PlansGridProps} props - Lista de planos e seleção
 * @returns {JSX.Element} Grid de cards
 */
export function PlansGrid({
  planos,
  selectedPlan,
  currentPlan,
  onSelect,
  onCheckout,
}: PlansGridProps) {
  return (
    <div
      role="listbox"
      aria-label="Planos disponíveis"
      className="mx-auto grid max-w-4xl justify-items-center gap-6 md:grid-cols-2"
    >
      {planos.map((plano) => (
        <PlanCard
          key={plano.id}
          plano={plano}
          isSelected={selectedPlan === String(plano.id)}
          isCurrent={currentPlan === plano.id}
          onSelect={onSelect}
          onCheckout={onCheckout}
        />
      ))}
    </div>
  );
}

/**
 * @name PlansSkeleton
 * @description Skeleton de carregamento para cards de planos.
 *
 * @returns {JSX.Element} Placeholder animado
 */
export function PlansSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="animate-pulse rounded-2xl border border-stone-800 bg-stone-900 p-6"
        >
          <div className="mb-6 h-10 w-10 rounded-xl bg-stone-800" />
          <div className="mb-3 h-6 w-3/4 rounded bg-stone-800" />
          <div className="mb-4 h-10 w-1/2 rounded bg-stone-800" />
          <div className="mb-2 h-4 w-full rounded bg-stone-800" />
          <div className="mb-2 h-4 w-5/6 rounded bg-stone-800" />
          <div className="mb-6 h-10 w-full rounded bg-stone-800" />
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-stone-800" />
            <div className="h-4 w-5/6 rounded bg-stone-800" />
            <div className="h-4 w-4/6 rounded bg-stone-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * @name EmptyState
 * @description Estado vazio quando não existem planos disponíveis.
 *
 * @param {EmptyStateProps} props - Texto do estado vazio
 * @returns {JSX.Element} Bloco informativo
 */
export function EmptyState({ titulo, mensagem }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-800 bg-stone-900/60 p-10 text-center">
      <h3 className="text-lg font-semibold text-stone-50">{titulo}</h3>
      <p className="mt-2 text-sm text-stone-400">{mensagem}</p>
    </div>
  );
}

/**
 * @name PromoBanner
 * @description Banner de promoção com código de desconto.
 *
 * @param {PromoBannerProps} props - Código e desconto
 * @returns {JSX.Element} Banner de promoção
 */
export function PromoBanner({ codigo, desconto }: PromoBannerProps) {
  return (
    <div className="mt-10 rounded-2xl border border-[#d500f9]/30 bg-[#d500f9]/10 px-6 py-4 text-center text-sm text-[#f7b7ff]">
      <strong className="font-semibold text-[#d500f9]">
        Use o código {codigo}
      </strong>
      <span className="text-stone-300"> e ganhe {desconto}% OFF.</span>
    </div>
  );
}
