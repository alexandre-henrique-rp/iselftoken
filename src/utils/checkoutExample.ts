/**
 * Exemplo de como usar o sistema de validade no checkout
 * Este arquivo serve como documentação para implementação futura
 */

import { calcularDataExpiracao, gerarTextoValidade, planoEstaExpirado } from './validadePlano';

/**
 * Exemplo de implementação no checkout
 */
export const exemploCheckout = () => {
  // Dados mock para exemplo - TODO: Substituir por LocalStorageService quando disponível
  const planoSelecionado = {
    plano: 'iself-investidor-mensal',
    valor: 'R$ 19,90',
    validade: 1,
    timestamp: new Date().toISOString()
  };

  // Exibir informações do plano com validade
  console.log('=== DADOS DO PLANO ===');
  console.log('Plano:', planoSelecionado.plano);
  console.log('Valor:', planoSelecionado.valor);
  console.log('Validade:', planoSelecionado.validade, 'meses');
  console.log('Status:', gerarTextoValidade(planoSelecionado));

  // Calcular data de expiração
  const dataExpiracao = calcularDataExpiracao(planoSelecionado.validade);
  console.log('Data de expiração:', new Date(dataExpiracao).toLocaleDateString('pt-BR'));

  // Verificar se plano está expirado (útil para renovação)
  if (planoEstaExpirado(planoSelecionado)) {
    console.log('⚠️ Plano expirado - Oferecer renovação');
  } else {
    console.log('✅ Plano válido - Processar pagamento');
  }
};

/**
 * Exemplo de como usar para diferentes tipos de produtos
 */
export const exemploFlexibilidade = () => {
  // TODO: Implementar LocalStorageService quando disponível
  console.log('Exemplos de planos que seriam salvos:');

  // Plano mensal
  console.log('- Plano mensal: iself-investidor-mensal, R$ 19,90, 1 mês');

  // Plano semestral
  console.log('- Plano semestral: iself-fundador-semestral, R$ 297,00, 6 meses');

  // Plano anual
  console.log('- Plano anual: iself-afiliado-anual, R$ 497,00, 12 meses');

  // Curso com validade específica
  console.log('- Curso: curso-trading-avancado, R$ 1.997,00, 24 meses');

  // Consultoria pontual
  console.log('- Consultoria: consultoria-1-hora, R$ 297,00, 1 mês');
};

/**
 * Exemplo de implementação em componente React
 */
export const dadosParaCheckout = () => {
  // Dados mock para exemplo - TODO: Substituir por LocalStorageService quando disponível
  const plano = {
    plano: 'iself-investidor-mensal',
    valor: 'R$ 19,90',
    validade: 1,
    timestamp: new Date().toISOString()
  };

  return {
    produto: {
      nome: plano.plano,
      preco: plano.valor,
      validade: plano.validade,
      descricao: `Acesso por ${plano.validade} ${plano.validade === 1 ? 'mês' : 'meses'}`
    },
    pagamento: {
      valor: plano.valor,
      moeda: 'BRL',
      recorrente: plano.validade > 1
    },
    expiracao: {
      data: calcularDataExpiracao(plano.validade),
      texto: gerarTextoValidade(plano)
    }
  };
};
