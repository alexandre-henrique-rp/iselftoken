/**
 * Dados dos Planos de Negócio (puro TypeScript)
 * Configuração centralizada de todos os planos disponíveis
 */

import { Plano, IconePlano } from '@/types/planos';

export const planosData: Plano[] = [
  {
    id: 'afiliado',
    nome: 'ISELF-AFILIADO',
    preco: 'R$ 85,00',
    periodo: '/ano',
    beneficios: [
      'Compra de tokens para investimento',
      'Revenda de tokens adquiridos com lucro',
      'Recompensa por indicação de novos investidores',
      'Programa de afiliação com comissões progressivas'
    ],
    icone: 'Handshake' as IconePlano,
    visivel: false,
    validade: 12 // 12 meses de validade
  },
  {
    id: 'investidor',
    nome: 'ISELF-INVESTIDOR',
    preco: 'R$ 50,00',
    periodo: '/ano',
    beneficios: [
      'Compra de tokens para investimento',
      'Revenda de tokens adquiridos com lucro',
      'Acesso dashboard de investimentos'
    ],
    icone: 'TrendingUp' as IconePlano,
    recomendado: true,
    visivel: true,
    validade: 12 // 12 meses de validade
  },
  {
    id: 'fundador',
    nome: 'ISELF-FUNDADOR',
    preco: 'R$ 100,00',
    periodo: '/ano',
    beneficios: [
      'Compra de tokens para investimento',
      'Revenda de tokens adquiridos com lucro',
      'Cadastro de startups para captação de investimento',
      'Acesso exclusivo a oportunidades de fundador'
    ],
    icone: 'Rocket' as IconePlano,
    visivel: true,
    validade: 12 // 12 meses de validade
  }
];

/**
 * Função para filtrar planos visíveis
 * @returns Array com apenas os planos marcados como visíveis
 */
export const getPlanosVisiveis = (): Plano[] => {
  return planosData.filter(plano => plano.visivel !== false);
};

/**
 * Função para obter plano por ID
 * @param id ID do plano desejado
 * @returns Plano encontrado ou undefined
 */
export const getPlanoPorId = (id: string): Plano | undefined => {
  return planosData.find(plano => plano.id === id);
};
