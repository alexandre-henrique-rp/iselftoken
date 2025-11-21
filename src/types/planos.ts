/**
 * Tipagens para Planos de Negócio
 * Segue princípios de Clean Architecture e TypeScript
 */

export type IconePlano = 'Handshake' | 'TrendingUp' | 'Rocket';

export interface Plano {
  id: string;
  nome: string;
  preco: string;
  periodo: string;
  descricao: string;
  beneficios: string[];
  icone: React.ReactNode | IconePlano; // Aceita JSX ou string
  recomendado?: boolean;
  visivel?: boolean; // Controla se o card será exibido
  validade?: number; // Validade em meses
}

export interface PlanosData {
  planos: Plano[];
}
