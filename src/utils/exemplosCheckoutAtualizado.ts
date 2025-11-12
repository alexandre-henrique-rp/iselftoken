/**
 * Exemplos atualizados do checkout SEM desconto PIX
 * PIX e Cartão têm o mesmo valor
 */

import { LocalStorageService } from '@/types/localStorage';

/**
 * Exemplo 1: Plano básico - PIX e Cartão iguais
 */
export const exemploValoresIguais = () => {
  console.log('💳 Exemplo: Valores iguais para PIX e Cartão');
  
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor',
    produto: 'PLANO BÁSICO',
    valor: 'R$ 197,00',
    validade: 12,
    obs: 'Acesso completo à plataforma'
  });
  
  // Resultado no checkout:
  // 
  // CARTÃO DE CRÉDITO:
  // Subtotal: R$ 197,00
  // Taxa: R$ 0,00
  // TOTAL: R$ 197,00
  //
  // PIX:
  // Subtotal: R$ 197,00  
  // Taxa: R$ 0,00
  // TOTAL: R$ 197,00
  //
  // ✅ Mesmo valor para ambos os métodos
};

/**
 * Exemplo 2: Comparação visual dos métodos
 */
export const exemploComparacaoMetodos = () => {
  console.log('📋 Comparação de Métodos de Pagamento:');
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│ CARTÃO DE CRÉDITO                        │');
  console.log('├─────────────────────────────────────────┤');
  console.log('│ Subtotal: R$ 297,00                     │');
  console.log('│ Taxa: R$ 0,00                           │');
  console.log('│ TOTAL: R$ 297,00                       │');
  console.log('│ Parcelamento: 1x a 3x                  │');
  console.log('└─────────────────────────────────────────┘');
  console.log('');
  console.log('┌─────────────────────────────────────────┐');
  console.log('│ PIX                                     │');
  console.log('├─────────────────────────────────────────┤');
  console.log('│ Subtotal: R$ 297,00                     │');
  console.log('│ Taxa: R$ 0,00                           │');
  console.log('│ TOTAL: R$ 297,00                       │');
  console.log('│ Pagamento à vista                      │');
  console.log('└─────────────────────────────────────────┘');
  console.log('');
  console.log('✅ VALORES IDÊNTICOS - SEM DESCONTO');
};

/**
 * Exemplo 3: Benefícios do PIX (sem desconto)
 */
export const exemploBeneficiosPIX = () => {
  console.log('💡 Benefícios do PIX (sem desconto):');
  console.log('');
  console.log('🚀 Vantagens do PIX:');
  console.log('   • Pagamento imediato');
  console.log('   • Confirmação instantânea');
  console.log('   • Sem necessidade de cartão');
  console.log('   • Disponível 24/7');
  console.log('   • Taxa zero (igual ao cartão)');
  console.log('');
  console.log('📦 Cartão de Crédito:');
  console.log('   • Opções de parcelamento');
  console.log('   • Maior flexibilidade');
  console.log('   • Processamento familiar');
  console.log('   • Mesmo valor do PIX');
  console.log('');
  console.log('🎯 Escolha baseada em conveniência, não em preço!');
};

/**
 * Exemplo 4: Diferentes faixas de preço
 */
export const exemploDiferentesPrecos = () => {
  console.log('💰 Exemplos com diferentes valores:');
  console.log('');
  
  const exemplos = [
    { nome: 'PLANO START', valor: 'R$ 50,00', parcelas: '1x' },
    { nome: 'PLANO PRO', valor: 'R$ 297,00', parcelas: '1x a 3x' },
    { nome: 'PLANO BUSINESS', valor: 'R$ 997,00', parcelas: '1x a 10x' },
    { nome: 'PLANO ENTERPRISE', valor: 'R$ 5.000,00', parcelas: '1x a 15x' }
  ];
  
  exemplos.forEach(ex => {
    console.log(`📦 ${ex.nome}:`);
    console.log(`   💵 Valor: ${ex.valor}`);
    console.log(`   💳 Cartão: ${ex.valor} (${ex.parcelas})`);
    console.log(`   📱 PIX: ${ex.valor} (à vista)`);
    console.log(`   ✅ Valores idênticos`);
    console.log('');
  });
};

/**
 * Exemplo 5: Fluxo completo do usuário
 */
export const exemploFluxoUsuario = () => {
  console.log('👤 Fluxo do Usuário no Checkout:');
  console.log('');
  console.log('1. 📋 Usuário seleciona plano');
  console.log('2. 💰 Sistema exibe valor: R$ 297,00');
  console.log('3. 🔄 Usuário escolhe método:');
  console.log('');
  console.log('   SELECIONAR PIX:');
  console.log('   • Valor: R$ 297,00');
  console.log('   • Paga à vista');
  console.log('   • Confirmação imediata');
  console.log('');
  console.log('   SELECIONAR CARTÃO:');
  console.log('   • Valor: R$ 297,00');
  console.log('   • Escolhe parcelamento: 1x, 2x ou 3x');
  console.log('   • Processa pagamento');
  console.log('');
  console.log('4. ✅ Mesmo valor total em ambos');
  console.log('5. 🎓 Acesso liberado após pagamento');
};

/**
 * Função utilitária atualizada
 */
export const criarProdutoSemDesconto = (
  plano: 'iself-investidor' | 'iself-fundador' | 'iself-afiliado',
  produto: string,
  valor: string,
  validade: number,
  obs?: string
) => {
  LocalStorageService.salvarPlanoSelecionado({
    plano,
    produto,
    valor,
    validade,
    obs
  });
  
  console.log(`✅ Produto "${produto}" criado!`);
  console.log(`💰 Valor: ${valor}`);
  console.log(`💳 Cartão: ${valor} (com parcelamento)`);
  console.log(`📱 PIX: ${valor} (à vista)`);
  console.log(`✨ Sem desconto - valores idênticos`);
  console.log(`🌐 Navegue para /checkout para testar`);
};

/**
 * Tabela resumo atualizada
 */
export const tabelaResumoAtualizada = () => {
  console.log('📋 Tabela de Métodos de Pagamento:');
  console.log('┌─────────────────┬─────────────────┬────────────────┐');
  console.log('│ Método          │ Valor           │ Parcelas       │');
  console.log('├─────────────────┼─────────────────┼────────────────┤');
  console.log('│ PIX             │ R$ 297,00       │ À vista        │');
  console.log('│ Cartão          │ R$ 297,00       │ 1x a 3x        │');
  console.log('├─────────────────┼─────────────────┼────────────────┤');
  console.log('│ Diferença       │ R$ 0,00         │ -              │');
  console.log('└─────────────────┴─────────────────┴────────────────┘');
  console.log('');
  console.log('✅ Valores idênticos - escolha por conveniência!');
};
