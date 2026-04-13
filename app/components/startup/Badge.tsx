import {
  Briefcase,
  CheckCircle,
  Clock,
  Cpu,
  Leaf,
  Rocket,
  ShieldCheck,
  Star,
} from "lucide-react";
import { cn } from "~/lib/utils";

interface BadgeProps {
  label: string;
  className?: string;
}

/**
 * @name Badge
 * @description Renderiza um selo de classificacao para cards da homepage.
 *
 * @param {string} label - Texto exibido no selo.
 * @param {string} className - Classes adicionais para customizacao.
 *
 * @returns {JSX.Element} Badge estilizado conforme o design system.
 *
 * @example
 * // Exemplo de uso
 * <Badge label="Verificada" />
 *
 * Fluxo de execução:
 * 1. Define a variante de cor com base no label
 * 2. Combina classes padrão com classes customizadas
 * 3. Renderiza o texto do selo
 */
export function Badge({ label, className }: BadgeProps) {
  const variants: Record<string, string> = {
    Verificada: "bg-green-600/20 text-green-400 border-green-500/30",
    "Top Pick": "bg-fuchsia-600/20 text-fuchsia-400 border-fuchsia-500/30",
    Acelerada: "bg-blue-600/20 text-blue-400 border-blue-500/30",
    ESG: "bg-green-600/20 text-green-400 border-green-500/30",
    "Em Aprovação": "bg-amber-600/20 text-amber-400 border-amber-500/30",
    Compliance: "bg-green-600/20 text-green-400 border-green-500/30",
    B2B: "bg-muted text-muted-foreground border-border",
    Hardware: "bg-muted text-muted-foreground border-border",
    default: "bg-muted text-muted-foreground border-border",
  };

  const variantClasses = variants[label] ?? variants.default;

  const badgeIcons: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    Verificada: CheckCircle,
    ESG: Leaf,
    "Top Pick": Star,
    Acelerada: Rocket,
    "Em Aprovação": Clock,
    Compliance: ShieldCheck,
    B2B: Briefcase,
    Hardware: Cpu,
  };

  const Icon = badgeIcons[label] ?? Star;

  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md border",
        variantClasses,
        className,
      )}
      title={label}
      aria-label={label}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
