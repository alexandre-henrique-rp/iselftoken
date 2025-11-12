/**
 * Exemplo de como usar o sistema de validade no checkout
 * Este arquivo serve como documentação para implementação futura
 */

import { LocalStorageService } from '@/types/localStorage';
import { calcularDataExpiracao, gerarTextoValidade, planoEstaExpirado } from './validadePlano';

/**
 * Exemplo de implementação no checkout
 */
export const exemploCheckout = () => {
  // Recuperar dados do plano selecionado
  const planoSelecionado = LocalStorageService.recuperarPlanoSelecionado();
  
  if (!planoSelecionado) {
    console.error('Nenhum plano selecionado');
    return;
  }
  
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
  // Plano mensal
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor-mensal',
    valor: 'R$ 19,90',
    validade: 1 // 1 mês
  });
  
  // Plano semestral
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-fundador-semestral',
    valor: 'R$ 297,00',
    validade: 6 // 6 meses
  });
  
  // Plano anual
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-afiliado-anual',
    valor: 'R$ 497,00',
    validade: 12 // 12 meses
  });
  
  // Curso com validade específica
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'curso-trading-avancado',
    valor: 'R$ 1.997,00',
    validade: 24 // 24 meses (acesso vitalício temporário)
  });
  
  // Consultoria pontual
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'consultoria-1-hora',
    valor: 'R$ 297,00',
    validade: 1 // 1 mês para agendamento
  });
};

/**
 * Exemplo de implementação em componente React
 */
export const dadosParaCheckout = () => {
  const plano = LocalStorageService.recuperarPlanoSelecionado();
  
  if (!plano) return null;
  
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
