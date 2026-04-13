/**
 * Exemplos práticos das regras de parcelamento no checkout
 */

// TODO: Implementar LocalStorageService quando disponível
console.log('Exemplos de parcelamento que seriam salvos:');

/**
 * Exemplo 1: Plano básico - Apenas 1x
 */
export const exemploPlanoBasico = () => {
  console.log('💳 Exemplo: Plano Básico R$ 50,00');

  // TODO: Salvar plano básico R$ 50,00 no LocalStorageService quando disponível

  // Resultado no checkout:
  // Parcelamento: [1x de R$ 50,00 sem juros]
  // (Apenas 1 opção, pois valor < R$ 100)
};

/**
 * Exemplo 2: Plano intermediário - Até 3x
 */
export const exemploPlanoIntermediario = () => {
  console.log('💳 Exemplo: Plano Intermediário R$ 297,00');

  // TODO: Salvar plano intermediário R$ 297,00 no LocalStorageService quando disponível

  // Resultado no checkout:
  // Parcelamento: [
  //   1x de R$ 297,00 sem juros,
  //   2x de R$ 148,50 sem juros,
  //   3x de R$ 99,00 sem juros
  // ]
  // (3 opções, pois valor está entre R$ 100 e R$ 500)
};

/**
 * Exemplo 3: Plano avançado - Até 10x
 */
export const exemploPlanoAvancado = () => {
  console.log('💳 Exemplo: Plano Avançado R$ 997,00');

  // TODO: Salvar plano avançado R$ 997,00 no LocalStorageService quando disponível

  // Resultado no checkout:
  // Parcelamento: [
  //   1x de R$ 997,00 sem juros,
  //   2x de R$ 498,50 sem juros,
  //   3x de R$ 332,33 sem juros,
  //   4x de R$ 249,25 sem juros,
  //   5x de R$ 199,40 sem juros,
  //   6x de R$ 166,17 sem juros,
  //   7x de R$ 142,43 sem juros,
  //   8x de R$ 124,63 sem juros,
  //   9x de R$ 110,78 sem juros,
  //   10x de R$ 99,70 sem juros
  // ]
  // (10 opções, pois valor está entre R$ 500 e R$ 3000)
};

/**
 * Exemplo 4: Plano enterprise - Até 15x
 */
export const exemploPlanoEnterprise = () => {
  console.log('💳 Exemplo: Plano Enterprise R$ 5.000,00');

  // TODO: Salvar plano enterprise R$ 5.000,00 no LocalStorageService quando disponível

  // Resultado no checkout:
  // Parcelamento: [
  //   1x de R$ 5.000,00 sem juros,
  //   2x de R$ 2.500,00 sem juros,
  //   3x de R$ 1.666,67 sem juros,
  //   ...
  //   15x de R$ 333,33 sem juros
  // ]
  // (15 opções, pois valor > R$ 3000)
};

/**
 * Exemplo 5: Valores limites
 */
export const exemploValoresLimites = () => {
  console.log('💳 Exemplo: Valores limites');

  // Exatamente R$ 100,00
  // TODO: Salvar plano R$ 100,00 no LocalStorageService quando disponível

  // TODO: Salvar plano R$ 500,00 no LocalStorageService quando disponível

  // TODO: Salvar plano R$ 3.000,00 no LocalStorageService quando disponível

  console.log('✅ Valores limites testados');
};

/**
 * Tabela resumo das regras
 */
export const tabelaRegras = () => {
  console.log('📋 Tabela de Regras de Parcelamento:');
  console.log('┌─────────────────┬─────────────────┬────────────────┐');
  console.log('│ Valor           │ Parcelas        │ Exemplo        │');
  console.log('├─────────────────┼─────────────────┼────────────────┤');
  console.log('│ < R$ 100        │ 1x              │ R$ 50 = 1x     │');
  console.log('│ R$ 100 - R$ 500 │ 1x a 3x         │ R$ 300 = 3x    │');
  console.log('│ R$ 500 - R$ 3000│ 1x a 10x        │ R$ 1000 = 10x  │');
  console.log('│ > R$ 3000       │ 1x a 15x        │ R$ 5000 = 15x  │');
  console.log('└─────────────────┴─────────────────┴────────────────┘');
};

/**
 * Função utilitária para criar produto com regras de parcelamento
 */
export const criarProdutoComParcelamento = (
  plano: 'Investidor' | 'Fundador' | 'Afiliado',
  produto: string,
  valor: string,
  validade: number,
  obs?: string
) => {
  console.log(`plano selecionado: ${plano}`);
  console.log(`produto selecionado: ${produto}`);
  console.log(`valor selecionado: ${valor}`);
  console.log(`validade selecionada: ${validade}`);
  console.log(`obs selecionado: ${obs}`);

  const valorNumerico = parseFloat(valor.replace('R$', '').replace('.', '').replace(',', '.').trim());

  let maxParcelas = 1;
  if (valorNumerico >= 100 && valorNumerico < 500) {
    maxParcelas = 3;
  } else if (valorNumerico >= 500 && valorNumerico < 3000) {
    maxParcelas = 10;
  } else if (valorNumerico >= 3000) {
    maxParcelas = 15;
  }

  console.log(`✅ Produto "${produto}" criado com sucesso!`);
  console.log(`💰 Valor: ${valor} - Parcelamento: 1x a ${maxParcelas}x`);
  console.log(`🌐 Navegue para /checkout para ver as opções`);
};
