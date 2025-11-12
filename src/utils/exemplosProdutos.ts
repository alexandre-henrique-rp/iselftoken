/**
 * Exemplos de como usar o sistema de produtos e observações no checkout
 * Este arquivo serve como documentação para implementação futura
 */

import { LocalStorageService } from '@/types/localStorage';

/**
 * Exemplo 1: Plano padrão (sem produto personalizado)
 */
export const exemploPlanoPadrao = () => {
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor',
    valor: 'R$ 50,00',
    validade: 12
    // produto e obs são opcionais
  });
  
  // Resultado no checkout:
  // Nome: ISELF INVESTIDOR (usa plano)
  // Validade: 12 meses
  // Obs: (não exibe)
};

/**
 * Exemplo 2: Produto personalizado
 */
export const exemploProdutoPersonalizado = () => {
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor',
    produto: 'PACOTE STARTUP ESPECIAL', // Sobrescreve o nome do plano
    valor: 'R$ 297,00',
    validade: 12,
    obs: 'Pacote exclusivo para startups com mentoria personalizada e acesso prioritário a investidores'
  });
  
  // Resultado no checkout:
  // Nome: PACOTE STARTUP ESPECIAL (usa produto)
  // Validade: 12 meses
  // Obs: 📝 Pacote exclusivo para startups com mentoria personalizada e acesso prioritário a investidores
};

/**
 * Exemplo 3: Curso online
 */
export const exemploCursoOnline = () => {
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor', // Mantido para compatibilidade
    produto: 'CURSO TRADING AVANÇADO',
    valor: 'R$ 997,00',
    validade: 24,
    obs: 'Acesso vitalício ao curso + 3 meses de suporte individual + certificado de conclusão'
  });
  
  // Resultado no checkout:
  // Nome: CURSO TRADING AVANÇADO
  // Validade: 24 meses
  // Obs: 📝 Acesso vitalício ao curso + 3 meses de suporte individual + certificado de conclusão
};

/**
 * Exemplo 4: Consultoria pontual
 */
export const exemploConsultoria = () => {
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-fundador',
    produto: 'CONSULTORIA FINANCEIRA 1H',
    valor: 'R$ 397,00',
    validade: 1,
    obs: 'Sessão de 1 hora com especialista em investimentos + análise de portfólio + plano de ação personalizado'
  });
  
  // Resultado no checkout:
  // Nome: CONSULTORIA FINANCEIRA 1H
  // Validade: 1 mês
  // Obs: 📝 Sessão de 1 hora com especialista em investimentos + análise de portfólio + plano de ação personalizado
};

/**
 * Exemplo 5: Assinatura mensal
 */
export const exemploAssinaturaMensal = () => {
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-afiliado',
    produto: 'ASSINATURA PREMIUM MENSAL',
    valor: 'R$ 29,90',
    validade: 1,
    obs: 'Renovação automática a cada mês. Cancele quando quiser. Inclui todos os benefícios da plataforma.'
  });
  
  // Resultado no checkout:
  // Nome: ASSINATURA PREMIUM MENSAL
  // Validade: 1 mês
  // Obs: 📝 Renovação automática a cada mês. Cancele quando quiser. Inclui todos os benefícios da plataforma.
};

/**
 * Exemplo 6: Evento/Palestra
 */
export const exemploEvento = () => {
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor',
    produto: 'INGRESSO CONFERÊNCIA ISELF 2024',
    valor: 'R$ 197,00',
    validade: 6, // 6 meses para acessar gravações
    obs: 'Acesso ao evento presencial + materiais digitais + gravações disponíveis por 6 meses + networking exclusivo'
  });
  
  // Resultado no checkout:
  // Nome: INGRESSO CONFERÊNCIA ISELF 2024
  // Validade: 6 meses
  // Obs: 📝 Acesso ao evento presencial + materiais digitais + gravações disponíveis por 6 meses + networking exclusivo
};

/**
 * Função utilitária para criar produtos dinamicamente
 */
export const criarProduto = (
  plano: 'iself-investidor' | 'iself-fundador' | 'iself-afiliado',
  produto: string,
  valor: string,
  validade: number,
  obs?: string
) => {
  LocalStorageService.salvarPlanoSelecionado({
    plano,
    produto, // Nome personalizado do produto
    valor,
    validade,
    obs // Observações opcionais
  });
};

/**
 * Exemplo de uso da função utilitária
 */
export const exemploDinamico = () => {
  // Criando um produto personalizado
  criarProduto(
    'iself-investidor',
    'MASTERCLASS CRIPTOMOEDAS',
    'R$ 497,00',
    12,
    '8 horas de conteúdo ao vivo + material de apoio + acesso à comunidade exclusiva'
  );
};
