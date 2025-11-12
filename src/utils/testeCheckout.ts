/**
 * Utilitário para testar diferentes cenários no checkout
 * Execute estas funções no console do navegador para testar
 */

import { LocalStorageService } from '@/types/localStorage';

/**
 * Teste 1: Plano padrão sem observações
 */
export const testePlanoPadrao = () => {
  console.log('🧪 Testando plano padrão...');
  
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor',
    valor: 'R$ 50,00',
    validade: 12
  });
  
  console.log('✅ Plano padrão salvo');
  console.log('📋 Dados no localStorage:', LocalStorageService.recuperarPlanoSelecionado());
  console.log('🌐 Navegue para /checkout para ver o resultado');
};

/**
 * Teste 2: Produto personalizado com observações
 */
export const testeProdutoPersonalizado = () => {
  console.log('🧪 Testando produto personalizado...');
  
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor',
    produto: 'PACOTE EMPREENDEDOR DIGITAL',
    valor: 'R$ 297,00',
    validade: 12,
    obs: 'Inclui curso completo + templates + mentoria mensal + acesso vitalício à comunidade'
  });
  
  console.log('✅ Produto personalizado salvo');
  console.log('📋 Dados no localStorage:', LocalStorageService.recuperarPlanoSelecionado());
  console.log('🌐 Navegue para /checkout para ver o resultado');
};

/**
 * Teste 3: Curso com validade estendida
 */
export const testeCurso = () => {
  console.log('🧪 Testando curso...');
  
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-fundador',
    produto: 'CURSO COMPLETO DE BLOCKCHAIN',
    valor: 'R$ 997,00',
    validade: 24,
    obs: 'Acesso vitalício ao conteúdo + certificado reconhecido + suporte por 6 meses + projetos práticos'
  });
  
  console.log('✅ Curso salvo');
  console.log('📋 Dados no localStorage:', LocalStorageService.recuperarPlanoSelecionado());
  console.log('🌐 Navegue para /checkout para ver o resultado');
};

/**
 * Teste 4: Consultoria pontual
 */
export const testeConsultoria = () => {
  console.log('🧪 Testando consultoria...');
  
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-afiliado',
    produto: 'CONSULTORIA DE INVESTIMENTO - 1HORA',
    valor: 'R$ 397,00',
    validade: 1,
    obs: 'Análise completa do seu portfólio + plano de investimento personalizado + follow-up de 30 dias'
  });
  
  console.log('✅ Consultoria salva');
  console.log('📋 Dados no localStorage:', LocalStorageService.recuperarPlanoSelecionado());
  console.log('🌐 Navegue para /checkout para ver o resultado');
};

/**
 * Teste 5: Assinatura mensal
 */
export const testeAssinatura = () => {
  console.log('🧪 Testando assinatura mensal...');
  
  LocalStorageService.salvarPlanoSelecionado({
    plano: 'iself-investidor',
    produto: 'ASSINATURA PREMIUM MENSAL',
    valor: 'R$ 29,90',
    validade: 1,
    obs: 'Renovação automática mensal. Cancele quando desejar. Todos os benefícios incluídos.'
  });
  
  console.log('✅ Assinatura salva');
  console.log('📋 Dados no localStorage:', LocalStorageService.recuperarPlanoSelecionado());
  console.log('🌐 Navegue para /checkout para ver o resultado');
};

/**
 * Função para limpar todos os dados de teste
 */
export const limparTestes = () => {
  console.log('🧹 Limpando dados de teste...');
  LocalStorageService.limparPlanoSelecionado();
  console.log('✅ Dados limpos');
};

/**
 * Executar todos os testes sequencialmente
 */
export const executarTodosTestes = async () => {
  console.log('🚀 Iniciando todos os testes...');
  
  // Teste 1
  testePlanoPadrao();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 2
  testeProdutoPersonalizado();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 3
  testeCurso();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 4
  testeConsultoria();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Teste 5
  testeAssinatura();
  
  console.log('🎉 Todos os testes concluídos!');
  console.log('💡 Use as funções individuais para testar cenários específicos');
};

/**
 * Instruções de uso:
 * 
 * 1. Abra o console do navegador (F12)
 * 2. Importe as funções: import { testePlanoPadrao, testeProdutoPersonalizado } from '@/utils/testeCheckout'
 * 3. Execute uma função: testePlanoPadrao()
 * 4. Navegue para /checkout para ver o resultado
 * 5. Use limparTestes() para limpar os dados
 */
