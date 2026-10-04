import { useId } from "react";
import { cn } from "~/lib/utils";

interface SparklineProps {
  /** Série de valores (≥2 pontos para renderizar). */
  data: number[];
  /** Cor do stroke. Por padrão, herda o token de cor do componente. */
  stroke?: string;
  /** Largura do path. Default 2. */
  strokeWidth?: number;
  /** Altura do SVG em px. Default 32. */
  height?: number;
  /** Acessibilidade — descrição da série. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Sparkline minimalista (SVG inline), estável entre SSR e hidratação.
 * Retorna null se não houver pelo menos dois pontos reais.
 */
export function Sparkline({
  data,
  stroke = "currentColor",
  strokeWidth = 2,
  height = 32,
  ariaLabel = "Tendência",
  className,
}: SparklineProps) {
  const gradientId = useId().replace(/:/g, "");

  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 1);
  const n = data.length;
  const stepX = 100 / (n - 1);
  const padding = 2;
  const usableHeight = 100 - padding * 2;

  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = padding + (1 - v / max) * usableHeight;
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100] as const;
  });

  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`)
    .join(" ");
  const areaPath = `${linePath} L100 100 L0 100 Z`;

  return (
    <svg
      className={cn("w-full text-primary", className)}
      style={{ height }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
