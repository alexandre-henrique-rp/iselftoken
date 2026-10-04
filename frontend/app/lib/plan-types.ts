/**
 * Tipos compartilhados do painel de Planos (Financeiro/Admin).
 */

export interface PlanItem {
  id: number;
  nome: string;
  slug: string;
  descricao?: string | null;
  preco: number | string; // Decimal do Prisma pode vir como string
  periodoMeses: number;
  periodo: string;
  icon?: string | null;
  beneficios?: string[] | null;
  visivel: boolean;
  isActive: boolean;
  recomendado: boolean;
  textoBotao?: string | null;
  /** Apenas em listagens admin (findAllForAdmin) */
  activeSubscribers?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanStats {
  planId: number;
  activeSubscribers: number;
  totalRevenue: number;
  mrr: number;
}

export const DEFAULT_BENEFITS = [
  'Compra de tokens para investimento',
  'Revenda de tokens adquiridos com lucro',
  'Acesso dashboard de investimentos',
  'Recompensa por indicação de novos investidores',
  'Programa de afiliação com comissões progressivas',
  'Cadastro de startups para captação de investimento',
  'Acesso exclusivo a oportunidades de fundador',
  'Suporte prioritário via chat',
  'Relatórios exclusivos de performance',
  'Acesso antecipado a novas rodadas (early-access)',
  'Descontos em taxas de transação',
  'Badge exclusivo no perfil',
];
