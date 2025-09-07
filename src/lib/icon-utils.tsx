import { 
  Bell, 
  Home, 
  TrendingUp, 
  User, 
  Briefcase,
  ChartNoAxesCombined,
  NotebookPen,
  LucideIcon 
} from 'lucide-react';

// Mapeamento de strings para componentes de ícones
const iconMap: Record<string, LucideIcon> = {
  'Home': Home,
  'Bell': Bell,
  'TrendingUp': TrendingUp,
  'User': User,
  'Briefcase': Briefcase,
  'ChartNoAxesCombined': ChartNoAxesCombined,
  'NotebookPen': NotebookPen,
};

/**
 * Função para obter o componente de ícone baseado na string
 * @param iconName - Nome do ícone como string
 * @returns Componente do ícone ou null se não encontrado
 */
export function getIconComponent(iconName: string | null): LucideIcon | null {
  if (!iconName) return null;
  return iconMap[iconName] || null;
}

/**
 * Componente para renderizar ícone dinamicamente
 * @param iconName - Nome do ícone como string
 * @param className - Classes CSS opcionais
 * @returns JSX do ícone ou null
 */
interface DynamicIconProps {
  iconName: string | null;
  className?: string;
}

export function DynamicIcon({ iconName, className }: DynamicIconProps) {
  const IconComponent = getIconComponent(iconName);
  
  if (!IconComponent) return null;
  
  return <IconComponent className={className} />;
}
