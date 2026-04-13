/**
 * Exemplos práticos do timer funcional no checkout
 * Demonstração do comportamento real do sistema
 */

/**
 * Exemplo 1: Fluxo completo do timer PIX
 */
export const exemploFluxoCompleto = () => {
  console.log('📋 Exemplo: Fluxo Completo do Timer PIX')
  console.log('')

  console.log('👤 Usuário acessa página de checkout')
  console.log('💰 Valor: R$ 297,00')
  console.log('📱 Método: PIX')
  console.log('')

  console.log('1️⃣ Usuário clica em "Gerar PIX"')
  console.log('   ✅ Código PIX gerado')
  console.log('   ⏰ Timer INICIADO: 30:00')
  console.log('   🟡 Cor: Amarelo (normal)')
  console.log('')

  console.log('2️⃣ Aguardando pagamento...')
  console.log('   ⏰ Timer: 25:00')
  console.log('   🟡 Cor: Amarelo (normal)')
  console.log('   💡 Usuário copia código ou lê QR')
  console.log('')

  console.log('3️⃣ Alerta de proximidade (5 minutos)')
  console.log('   ⏰ Timer: 05:00')
  console.log('   🔴 Cor: Vermelho (alerta)')
  console.log('   ⚠️ Mensagem: "Pague em até 5 minutos"')
  console.log('   🔄 Interface pulsando')
  console.log('')

  console.log('4️⃣ Pagamento confirmado!')
  console.log('   ✅ Timer PARADO')
  console.log('   🎉 Acesso liberado')
  console.log('   🔄 Redirecionado para sucesso')
}

/**
 * Exemplo 2: Cenário de expiração
 */
export const exemploExpiracao = () => {
  console.log('⏰ Exemplo: Cenário de Expiração do Timer')
  console.log('')

  console.log('👤 Usuário gerou PIX mas não pagou')
  console.log('⏰ Timer contando...')
  console.log('')

  console.log('⚠️ ÚLTIMOS SEGUNDOS:')
  console.log('   00:10 - 🔴 Vermelho pulsando')
  console.log('   00:05 - 🔴 Vermelho pulsando rápido')
  console.log('   00:01 - 🔴 Vermelho intenso')
  console.log('   00:00 - 💀 TEMPO ESGOTADO')
  console.log('')

  console.log('🔄 AÇÕES AUTOMÁTICAS:')
  console.log('   • Timer parado')
  console.log('   • localStorage limpo')
  console.log('   • Sessão expirada')
  console.log('   • Redirecionado para /register')
  console.log('')

  console.log('📱 Mensagem para usuário:')
  console.log('   "Sua sessão expirou. Por favor, faça o registro novamente."')
}

/**
 * Exemplo 3: Estados visuais do timer
 */
export const exemploEstadosVisuais = () => {
  console.log('🎨 Exemplo: Estados Visuais do Timer')
  console.log('')

  const estados = [
    { tempo: '30:00', cor: '🟡 Amarelo', status: 'Normal', animacao: 'Nenhuma' },
    { tempo: '15:00', cor: '🟡 Amarelo', status: 'Normal', animacao: 'Nenhuma' },
    { tempo: '06:00', cor: '🟡 Amarelo', status: 'Atenção', animacao: 'Nenhuma' },
    { tempo: '05:00', cor: '🔴 Vermelho', status: 'Alerta', animacao: 'Pulsando' },
    { tempo: '02:30', cor: '🔴 Vermelho', status: 'Urgente', animacao: 'Pulsando' },
    { tempo: '00:30', cor: '🔴 Vermelho', status: 'Crítico', animacao: 'Pulsando rápido' }
  ]

  console.log('┌──────────┬─────────────┬──────────┬─────────────────┐')
  console.log('│ Tempo    │ Cor         │ Status   │ Animação        │')
  console.log('├──────────┼─────────────┼──────────┼─────────────────┤')

  estados.forEach(estado => {
    console.log(`│ ${estado.tempo} │ ${estado.cor.padEnd(11)} │ ${estado.status.padEnd(8)} │ ${estado.animacao.padEnd(15)} │`)
  })

  console.log('└──────────┴─────────────┴──────────┴─────────────────┘')
}

/**
 * Exemplo 4: Comportamento em diferentes cenários
 */
export const exemploCenariosDiferentes = () => {
  console.log('🎭 Exemplo: Comportamento em Diferentes Cenários')
  console.log('')

  console.log('💳 CARTÃO DE CRÉDITO:')
  console.log('   • Timer NÃO é ativado')
  console.log('   • Pagamento processado normalmente')
  console.log('   • Sem contagem regressiva')
  console.log('')

  console.log('📱 PIX - PAGAMENTO RÁPIDO:')
  console.log('   • Timer: 30:00 → 28:45')
  console.log('   • Pagamento confirmado')
  console.log('   • Timer parado com sucesso')
  console.log('')

  console.log('📱 PIX - PAGAMENTO DEMORADO:')
  console.log('   • Timer: 30:00 → 05:00')
  console.log('   🔴 Interface muda para vermelho')
  console.log('   • Usuário alertado')
  console.log('   • Pagamento confirmado')
  console.log('')

  console.log('📱 PIX - SEM PAGAMENTO:')
  console.log('   • Timer: 30:00 → 00:00')
  console.log('   🔴 Interface vermelha pulsando')
  console.log('   • Sessão expirada')
  console.log('   • Redirecionado automaticamente')
}

/**
 * Exemplo 5: Implementação técnica
 */
export const exemploImplementacao = () => {
  console.log('⚙️ Exemplo: Implementação Técnica')
  console.log('')

  console.log('🔧 Estados do React:')
  console.log('   const [timeRemaining, setTimeRemaining] = useState(30 * 60)')
  console.log('   const [timerActive, setTimerActive] = useState(false)')
  console.log('')

  console.log('⏰ useEffect do Timer:')
  console.log('   useEffect(() => {')
  console.log('     if (timerActive && timeRemaining > 0) {')
  console.log('       const interval = setInterval(() => {')
  console.log('         setTimeRemaining(prev => prev - 1)')
  console.log('       }, 1000)')
  console.log('       return () => clearInterval(interval)')
  console.log('     }')
  console.log('   }, [timerActive, timeRemaining])')
  console.log('')

  console.log('🎨 Lógica Visual:')
  console.log('   • timeRemaining < 300 ? Vermelho : Amarelo')
  console.log('   • timeRemaining < 300 ? animate-pulse : Nenhuma')
  console.log('   • formatTime(timeRemaining) → "MM:SS"')
  console.log('')

  console.log('🔄 Ações Automáticas:')
  console.log('   if (timeRemaining <= 1) {')
  console.log('     setTimerActive(false)')
  console.log('     limparDados()')
  console.log('     router.replace("/register")')
  console.log('   }')
}

/**
 * Exemplo 6: Teste manual
 */
export const exemploTesteManual = () => {
  console.log('🧪 Exemplo: Como Testar Manualmente')
  console.log('')

  console.log('1️⃣ ABRA O CONSOLE DO NAVEGADOR (F12)')
  console.log('')

  console.log('2️⃣ IMPORTE AS FUNÇÕES:')
  console.log('   import { formatTime, simularTimerPersonalizado } from "@/utils/timerCheckout"')
  console.log('')

  console.log('3️⃣ TESTE FORMATAÇÃO:')
  console.log('   formatTime(1800) // "30:00"')
  console.log('   formatTime(299)  // "04:59"')
  console.log('   formatTime(60)   // "01:00"')
  console.log('')

  console.log('4️⃣ SIMULE TIMER:')
  console.log('   simularTimerPersonalizado(1) // 1 minuto')
  console.log('   simularTimerPersonalizado(5) // 5 minutos')
  console.log('')

  console.log('5️⃣ TESTE NO CHECKOUT:')
  console.log('   • Vá para /checkout')
  console.log('   • Selecione método PIX')
  console.log('   • Clique "Gerar PIX"')
  console.log('   • Observe o timer funcionando')
  console.log('   • Espere mudar para vermelho (5 min)')
  console.log('')

  console.log('✅ Timer funcional confirmado!')
}

/**
 * Função para criar timer personalizado
 */
export const criarTimerPersonalizado = (minutos: number) => {
  console.log(`⏰ Criando timer personalizado de ${minutos} minutos`)
  console.log('')
  console.log('📋 Configuração:')
  console.log(`   • Duração: ${minutos} minutos`)
  console.log(`   • Alerta: 5 minutos antes`)
  console.log(`   • Cor: Amarelo → Vermelho`)
  console.log(`   • Animação: Pulsando no alerta`)
  console.log('')
  console.log('💡 Para usar no checkout:')
  console.log(`   setTimeRemaining(${minutos} * 60)`)
  console.log('   setTimerActive(true)')
  console.log('')
  console.log('🚀 Timer pronto para uso!')
}
