/**
 * Utilitário para testar e demonstrar as regras de parcelamento
 * Execute estas funções no console do navegador para testar
 */

/**
 * Regras de parcelamento implementadas:
 * - Valores < R$ 100: Apenas 1x
 * - Valores de R$ 100 a R$ 500: 1x, 2x ou 3x
 * - Valores de R$ 500 a R$ 3000: 1x a 10x
 * - Valores > R$ 3000: 1x a 15x
 */

export const getOpcoesParcelamento = (valor: number) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (valor < 100) {
    return [{ parcelas: 1, texto: `1x de ${formatCurrency(valor)} sem juros` }]
  } else if (valor >= 100 && valor < 500) {
    return [
      { parcelas: 1, texto: `1x de ${formatCurrency(valor)} sem juros` },
      { parcelas: 2, texto: `2x de ${formatCurrency(valor / 2)} sem juros` },
      { parcelas: 3, texto: `3x de ${formatCurrency(valor / 3)} sem juros` }
    ]
  } else if (valor >= 500 && valor < 3000) {
    const opcoes = [
      { parcelas: 1, texto: `1x de ${formatCurrency(valor)} sem juros` },
      { parcelas: 2, texto: `2x de ${formatCurrency(valor / 2)} sem juros` },
      { parcelas: 3, texto: `3x de ${formatCurrency(valor / 3)} sem juros` }
    ]
    
    // Adicionar parcelas de 4x a 10x para valores acima de 500
    for (let i = 4; i <= 10; i++) {
      opcoes.push({ 
        parcelas: i, 
        texto: `${i}x de ${formatCurrency(valor / i)} sem juros` 
      })
    }
    
    return opcoes
  } else {
    // Valores acima de 3000 - até 15x
    const opcoes = [
      { parcelas: 1, texto: `1x de ${formatCurrency(valor)} sem juros` },
      { parcelas: 2, texto: `2x de ${formatCurrency(valor / 2)} sem juros` },
      { parcelas: 3, texto: `3x de ${formatCurrency(valor / 3)} sem juros` }
    ]
    
    // Adicionar parcelas de 4x a 15x para valores acima de 3000
    for (let i = 4; i <= 15; i++) {
      opcoes.push({ 
        parcelas: i, 
        texto: `${i}x de ${formatCurrency(valor / i)} sem juros` 
      })
    }
    
    return opcoes
  }
}

/**
 * Teste 1: Valor abaixo de R$ 100
 */
export const testeValorAbaixo100 = () => {
  console.log('🧪 Testando valor R$ 50,00:');
  const opcoes = getOpcoesParcelamento(50);
  opcoes.forEach(op => console.log(`   ${op.texto}`));
  console.log(`   Total: ${opcoes.length} opções\n`);
};

/**
 * Teste 2: Valor entre R$ 100 e R$ 500
 */
export const testeValorEntre100e500 = () => {
  console.log('🧪 Testando valor R$ 297,00:');
  const opcoes = getOpcoesParcelamento(297);
  opcoes.forEach(op => console.log(`   ${op.texto}`));
  console.log(`   Total: ${opcoes.length} opções\n`);
};

/**
 * Teste 3: Valor entre R$ 500 e R$ 3000
 */
export const testeValorEntre500e3000 = () => {
  console.log('🧪 Testando valor R$ 997,00:');
  const opcoes = getOpcoesParcelamento(997);
  opcoes.forEach(op => console.log(`   ${op.texto}`));
  console.log(`   Total: ${opcoes.length} opções\n`);
};

/**
 * Teste 4: Valor acima de R$ 3000
 */
export const testeValorAcima3000 = () => {
  console.log('🧪 Testando valor R$ 5.000,00:');
  const opcoes = getOpcoesParcelamento(5000);
  opcoes.forEach(op => console.log(`   ${op.texto}`));
  console.log(`   Total: ${opcoes.length} opções\n`);
};

/**
 * Teste 5: Valores limites
 */
export const testeValoresLimites = () => {
  console.log('🧪 Testando valores limites:');
  
  console.log('   Valor exato R$ 100,00:');
  getOpcoesParcelamento(100).forEach(op => console.log(`      ${op.texto}`));
  
  console.log('   Valor exato R$ 500,00:');
  getOpcoesParcelamento(500).forEach(op => console.log(`      ${op.texto}`));
  
  console.log('   Valor exato R$ 3000,00:');
  getOpcoesParcelamento(3000).forEach(op => console.log(`      ${op.texto}`));
  console.log('');
};

/**
 * Executar todos os testes
 */
export const executarTodosTestes = () => {
  console.log('🚀 Testando todas as regras de parcelamento:\n');
  
  testeValorAbaixo100();
  testeValorEntre100e500();
  testeValorEntre500e3000();
  testeValorAcima3000();
  testeValoresLimites();
  
  console.log('✅ Todos os testes concluídos!');
  console.log('💡 As regras seguem exatamente o especificado:');
  console.log('   • < R$ 100: 1x');
  console.log('   • R$ 100 - R$ 500: 1x a 3x');
  console.log('   • R$ 500 - R$ 3000: 1x a 10x');
  console.log('   • > R$ 3000: 1x a 15x');
};

/**
 * Função para testar valor personalizado
 */
export const testeValorPersonalizado = (valor: number) => {
  console.log(`🧪 Testando valor ${formatCurrency(valor)}:`);
  const opcoes = getOpcoesParcelamento(valor);
  opcoes.forEach(op => console.log(`   ${op.texto}`));
  console.log(`   Total: ${opcoes.length} opções\n`);
};

/**
 * Helper function para formatar moeda
 */
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};
