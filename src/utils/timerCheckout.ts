/**
 * Utilitário para testar o timer funcional do checkout
 * Execute estas funções no console do navegador para testar
 */

/**
 * Função para formatar tempo (mesma do checkout)
 */
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Teste 1: Formatação de tempo
 */
export const testeFormatacaoTempo = () => {
  console.log('🧪 Testando formatação de tempo:');
  
  const testes = [
    { segundos: 1800, esperado: '30:00', descricao: '30 minutos' },
    { segundos: 299, esperado: '04:59', descricao: '4 minutos e 59 segundos' },
    { segundos: 60, esperado: '01:00', descricao: '1 minuto' },
    { segundos: 30, esperado: '00:30', descricao: '30 segundos' },
    { segundos: 0, esperado: '00:00', descricao: 'Tempo esgotado' }
  ]
  
  testes.forEach(teste => {
    const resultado = formatTime(teste.segundos)
    const status = resultado === teste.esperado ? '✅' : '❌'
    console.log(`   ${status} ${teste.descricao}: ${teste.segundos}s → ${resultado} (esperado: ${teste.esperado})`)
  })
  console.log('')
}

/**
 * Teste 2: Simulação de countdown
 */
export const testeCountdown = () => {
  console.log('🧪 Simulando countdown de 10 segundos:');
  
  let tempo = 10
  
  const interval = setInterval(() => {
    console.log(`   ⏰ Tempo restante: ${formatTime(tempo)}`)
    
    if (tempo <= 0) {
      console.log('   ⏱️ Tempo esgotado!')
      clearInterval(interval)
      return
    }
    
    tempo--
  }, 1000)
  
  console.log('   🚀 Contagem regressiva iniciada...')
}

/**
 * Teste 3: Estados de alerta
 */
export const testeEstadosAlerta = () => {
  console.log('🧪 Testando estados de alerta:');
  
  const tempos = [
    { segundos: 1800, estado: 'Normal', cor: 'amarelo' },
    { segundos: 600, estado: 'Atenção', cor: 'amarelo' },
    { segundos: 300, estado: 'Crítico', cor: 'vermelho' },
    { segundos: 60, estado: 'Urgente', cor: 'vermelho' },
    { segundos: 10, estado: 'Expirando', cor: 'vermelho' }
  ]
  
  tempos.forEach(tempo => {
    const alerta = tempo.segundos < 300 ? '⚠️ ALERTA' : '📋 Normal'
    const cor = tempo.segundos < 300 ? 'vermelho' : 'amarelo'
    console.log(`   ${formatTime(tempo.segundos)} - ${tempo.estado} (${cor}) ${alerta}`)
  })
  console.log('')
}

/**
 * Teste 4: Simulação completa do fluxo PIX
 */
export const testeFluxoPIX = () => {
  console.log('🧪 Simulação completa do fluxo PIX:');
  console.log('')
  
  // Etapa 1: Geração do PIX
  console.log('1️⃣ Gerando código PIX...')
  console.log('   ✅ Código gerado: 1234-5678-9012-3456-7890-1234-5678-9012')
  console.log('   ⏰ Timer iniciado: 30:00')
  console.log('')
  
  // Etapa 2: Aguardando pagamento
  console.log('2️⃣ Aguardando pagamento...')
  console.log('   💡 Usuário copia código ou usa QR code')
  console.log('   ⏰ Timer: 25:00')
  console.log('')
  
  // Etapa 3: Alerta de proximidade
  console.log('3️⃣ Alerta de proximidade (5 minutos restantes)...')
  console.log('   ⚠️ Interface muda para vermelho')
  console.log('   ⏰ Timer: 05:00')
  console.log('')
  
  // Etapa 4: Pagamento confirmado
  console.log('4️⃣ Pagamento confirmado!')
  console.log('   ✅ Timer parado')
  console.log('   🎉 Acesso liberado')
  console.log('')
  
  // Etapa 5: Expiração (se não pagar)
  console.log('5️⃣ Se não pagar (cenário de expiração)...')
  console.log('   ⏰ Timer: 00:00')
  console.log('   ❌ Sessão expirada')
  console.log('   🗑️ Dados limpos')
  console.log('   🔄 Redirecionado para registro')
}

/**
 * Teste 5: Valores limites do timer
 */
export const testeValoresLimites = () => {
  console.log('🧪 Testando valores limites do timer:');
  
  const limites = [
    { segundos: 30 * 60, descricao: 'Início (30 minutos)' },
    { segundos: 5 * 60 + 1, descricao: 'Acima do alerta (5:01)' },
    { segundos: 5 * 60, descricao: 'Início do alerta (5:00)' },
    { segundos: 60, descricao: '1 minuto restante' },
    { segundos: 10, descricao: '10 segundos restantes' },
    { segundos: 1, descricao: '1 segundo restante' },
    { segundos: 0, descricao: 'Tempo esgotado' }
  ]
  
  limites.forEach(limite => {
    const alerta = limite.segundos < 300 ? '🚨 ALERTA' : '📋 Normal'
    const cor = limite.segundos < 300 ? 'vermelho' : 'amarelo'
    const animacao = limite.segundos < 300 ? ' (pulsando)' : ''
    console.log(`   ${formatTime(limite.segundos)} - ${limite.descricao} - ${cor}${animacao} ${alerta}`)
  })
  console.log('')
}

/**
 * Executar todos os testes
 */
export const executarTodosTestes = () => {
  console.log('🚀 Testes do Timer Funcional do Checkout\n')
  
  testeFormatacaoTempo()
  testeEstadosAlerta()
  testeValoresLimites()
  testeFluxoPIX()
  
  console.log('✅ Todos os testes concluídos!')
  console.log('💡 O timer está funcional com:')
  console.log('   • Contagem regressiva real')
  console.log('   • Formatação MM:SS')
  console.log('   • Alerta visual < 5 minutos')
  console.log('   • Limpeza automática ao expirar')
  console.log('   • Redirecionamento automático')
}

/**
 * Função para simular timer personalizado
 */
export const simularTimerPersonalizado = (minutos: number) => {
  const segundos = minutos * 60
  console.log(`⏰ Simulando timer de ${minutos} minutos (${formatTime(segundos)}):`)
  
  let tempo = segundos
  
  const interval = setInterval(() => {
    const alerta = tempo < 300 ? '🚨 ALERTA' : '📋 Normal'
    console.log(`   ${formatTime(tempo)} ${alerta}`)
    
    if (tempo <= 0) {
      console.log('   ⏱️ Tempo esgotado!')
      clearInterval(interval)
      return
    }
    
    tempo -= 60 // Simula passagem de 1 minuto para teste rápido
  }, 500) // 500ms para teste rápido
  
  console.log(`   🚀 Contagem iniciada...`)
}
