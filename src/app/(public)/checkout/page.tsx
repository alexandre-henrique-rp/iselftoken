'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CreditCard, Smartphone, Lock, Timer } from 'lucide-react'
import { RegistroPendenteData, LocalStorageService } from '@/types/localStorage'

interface PlanoData {
  nome: string
  validade: number
  valor: string
  tokens: number
  obs?: string // Observações adicionais
}

export default function CheckoutPage() {
  const router = useRouter()
  const [registroData, setRegistroData] = useState<RegistroPendenteData | null>(null)
  const [plano, setPlano] = useState<PlanoData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'pix'>('credit')
  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    installments: '1',
    termsAccepted: false
  })
  const [pixGenerated, setPixGenerated] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(30 * 60) // 30 minutos em segundos
  const [timerActive, setTimerActive] = useState(false)

  // Função para converter valor string para número
  const parseCurrency = (valor: string): number => {
    return parseFloat(valor.replace('R$', '').replace('.', '').replace(',', '.').trim())
  }

  // Função para determinar opções de parcelamento baseado no valor
  const getOpcoesParcelamento = (valor: number) => {
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

  useEffect(() => {
    // Recuperar dados do registro e do plano selecionado
    const registro = LocalStorageService.recuperarRegistroPendente()
    const planoData = LocalStorageService.recuperarPlanoSelecionado()
    
    if (registro) {
      setRegistroData(registro)
    }
    
    if (planoData) {
      // Converter dados do plano selecionado para o formato esperado
      const planoFormatado: PlanoData = {
        nome: planoData.produto || planoData.plano.toUpperCase().replace('-', ' '), // Usa produto ou plano
        validade: planoData.validade,
        valor: planoData.valor,
        tokens: planoData.validade * 100, // 100 tokens por mês de validade
        obs: planoData.obs // Observações adicionais
      }
      setPlano(planoFormatado)
    }
    
    if (!registro) {
      router.replace('/register')
    }
    
    setIsLoading(false)
  }, [router])

  // Timer para countdown
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null
    
    if (timerActive && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            setTimerActive(false)
            // Timer expirado - limpar dados e redirecionar
            LocalStorageService.limparPlanoSelecionado()
            LocalStorageService.limparRegistroPendente()
            router.replace('/register')
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [timerActive, timeRemaining, router])

  // Função para formatar o tempo
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleBack = () => {
    router.back()
  }

  const handleExit = () => {
    LocalStorageService.limparRegistroPendente()
    router.replace('/')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const chunks = cleaned.match(/.{1,4}/g) || []
    return chunks.join(' ').substr(0, 19)
  }

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value)
    setFormData(prev => ({ ...prev, cardNumber: formatted }))
  }

  const handleGeneratePix = () => {
    setPixGenerated(true)
    setTimerActive(true) // Ativa o timer quando PIX é gerado
    setTimeRemaining(30 * 60) // Reinicia para 30 minutos
  }

  const handleCopyPixCode = async () => {
    const pixCode = '1234-5678-9012-3456-7890-1234-5678-9012'
    try {
      await navigator.clipboard.writeText(pixCode)
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 3000)
    } catch (err) {
      console.error('Erro ao copiar código PIX:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.termsAccepted) {
      alert('Você precisa aceitar os termos e condições')
      return
    }

    setIsProcessing(true)
    
    // Simular processamento
    setTimeout(() => {
      setIsProcessing(false)
      // Redirecionar para página de sucesso
      router.push('/payment-success')
    }, 3000)
  }

  const calcularTotalComDesconto = () => {
    if (!plano) return 0
    const valorNumerico = parseCurrency(plano.valor)
    // PIX sem desconto - mesmo valor do cartão
    return valorNumerico
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    )
  }

  if (!registroData) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Dados não encontrados</h1>
          <p className="text-gray-400 mb-6">Por favor, faça o registro novamente.</p>
          <button
            onClick={() => router.replace('/register')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Ir para Registro
          </button>
        </div>
      </div>
    )
  }

  if (!plano) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Plano não selecionado</h1>
          <p className="text-gray-400 mb-6">Por favor, escolha um plano para continuar.</p>
          <button
            onClick={() => router.replace('/business/plans')}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Escolher Plano
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/95 backdrop-blur-sm border-b border-gray-800 z-50">
        <div className="flex justify-between items-center px-20 py-5">
          <div className="text-purple-600 text-2xl font-light tracking-wider">
            iSelfToken
          </div>
          <button 
            onClick={handleExit}
            className="text-gray-400 text-sm hover:text-white transition-colors border border-gray-700 px-4 py-2 rounded-lg hover:border-gray-500"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex pt-20 min-h-screen">
        {/* Lado Esquerdo - Formulário */}
        <div className="flex-1 max-w-[60%] p-20">
          {/* Botão Voltar */}
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 text-sm mb-8 hover:text-purple-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          {/* Divisor */}
          <div className="border-b border-gray-800 mb-8"></div>

          {/* Título */}
          <h1 className="text-3xl font-light text-white mb-8">
            FINALIZAR PAGAMENTO
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Tabs de Pagamento */}
            <div className="flex gap-3 mb-8">
              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-lg border-2 transition-all ${
                  paymentMethod === 'credit' 
                    ? 'bg-purple-600/10 border-purple-600 text-purple-600' 
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-purple-600'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="font-medium">Cartão</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-lg border-2 transition-all ${
                  paymentMethod === 'pix' 
                    ? 'bg-purple-600/10 border-purple-600 text-purple-600' 
                    : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-purple-600'
                }`}
              >
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">PIX</span>
              </button>
            </div>

            {/* Conteúdo Dinâmico */}
            {paymentMethod === 'credit' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Parcelamento
                  </label>
                  <select 
                    value={formData.installments}
                    onChange={(e) => setFormData(prev => ({ ...prev, installments: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-5 py-4 text-white focus:border-purple-600 focus:outline-none transition-colors"
                  >
                    {plano && getOpcoesParcelamento(parseCurrency(plano.valor)).map(opcao => (
                      <option key={opcao.parcelas} value={opcao.parcelas}>
                        {opcao.texto}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Número do cartão
                  </label>
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-5 py-4 text-white placeholder-gray-500 focus:border-purple-600 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Validade
                    </label>
                    <input
                      type="text"
                      value={formData.expiryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-5 py-4 text-white placeholder-gray-500 focus:border-purple-600 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={formData.cvv}
                      onChange={(e) => setFormData(prev => ({ ...prev, cvv: e.target.value }))}
                      placeholder="123"
                      maxLength={3}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-5 py-4 text-white placeholder-gray-500 focus:border-purple-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome no cartão
                  </label>
                  <input
                    type="text"
                    value={formData.cardName}
                    onChange={(e) => setFormData(prev => ({ ...prev, cardName: e.target.value.toUpperCase() }))}
                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-5 py-4 text-white placeholder-gray-500 focus:border-purple-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border-b border-gray-800 mb-6"></div>
                
               

                <div className="border-b border-gray-800 mb-6"></div>

                {!pixGenerated ? (
                  <div className="text-center space-y-4">
                    <div className="text-gray-400 text-sm space-y-2">
                      <p>Como funciona:</p>
                      <p>1. Clique em &quot;Gerar código PIX&quot;</p>
                      <p>2. Escaneie o QR Code ou copie o código</p>
                      <p>3. Realize o pagamento no app do seu banco</p>
                      <p>4. Aguarde a confirmação automática</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleGeneratePix}
                      className="w-full bg-transparent border border-purple-600 text-purple-600 py-3 rounded-lg font-medium hover:bg-purple-600/10 transition-colors"
                    >
                      Gerar Código PIX
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center">
                      {/* QR Code Placeholder */}
                      <div className="bg-white p-4 rounded-lg mb-6">
                        <div className="w-48 h-48 bg-gray-200 rounded flex items-center justify-center">
                          <div className="text-gray-500 text-sm">QR Code</div>
                        </div>
                      </div>
                      
                      <p className="text-gray-300 text-sm mb-4 text-center">
                        Escaneie o QR Code acima ou copie o código PIX
                      </p>
                      
                      {/* Código PIX */}
                      <div className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 mb-4">
                        <div className="text-gray-400 text-xs font-mono text-center break-all">
                          1234-5678-9012-3456-7890-1234-5678-9012
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={handleCopyPixCode}
                        className={`w-full py-3 rounded-lg font-medium transition-colors ${
                          copiedCode 
                            ? 'bg-green-600 text-white' 
                            : 'bg-transparent border border-purple-600 text-purple-600 hover:bg-purple-600/10'
                        }`}
                      >
                        {copiedCode ? '✓ Código Copiado' : '📋 Copiar código'}
                      </button>
                    </div>

                    {/* Status */}
                    <div className={`flex items-center gap-3 justify-center p-4 border rounded-lg ${
                      timeRemaining < 300 // Menos de 5 minutos
                        ? 'bg-red-900/20 border-red-700/30 animate-pulse'
                        : 'bg-yellow-900/20 border-yellow-700/30'
                    }`}>
                      <Timer className={`w-5 h-5 ${
                        timeRemaining < 300 ? 'text-red-400' : 'text-yellow-400'
                      }`} />
                      <div className={`text-sm ${
                        timeRemaining < 300 ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        ⏳ Aguardando pagamento... Tempo restante: {formatTime(timeRemaining)}
                        {timeRemaining < 300 && (
                          <div className="text-xs mt-1">
                            ⚠️ Pague em até 5 minutos para evitar cancelamento
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Botão Finalizar */}
            <button
              type="submit"
              disabled={!formData.termsAccepted || isProcessing || (paymentMethod === 'pix' && !pixGenerated)}
              className="w-full bg-purple-600 text-white py-4 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {isProcessing ? 'Processando...' : 'Finalizar Pagamento'}
            </button>

            {/* Texto Segurança */}
            <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
              <Lock className="w-3 h-3" />
              <span>Pagamento seguro e criptografado</span>
            </div>
          </form>
        </div>

        {/* Lado Direito - Resumo */}
        <div className="flex-1 max-w-[40%] bg-gray-900 p-20 border-l border-gray-800">
          <h2 className="text-xl font-light text-white mb-8">
            RESUMO DO PEDIDO
          </h2>

          <div className="border-b border-gray-800 mb-8"></div>

          {/* Card do Plano */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-purple-600 font-semibold">{plano?.nome || 'Carregando...'}</div>
                <div className="text-gray-400 text-sm">Validade: {plano?.validade || 0} {plano?.validade === 1 ? 'mês' : 'meses'}</div>
                {plano?.obs && (
                  <div className="text-gray-300 text-xs mt-2 italic">
                    📝 {plano.obs}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-b border-gray-800 mb-6"></div>

          {/* Valores */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between text-gray-300 text-sm">
              <span>Subtotal</span>
              <span>{plano?.valor || 'R$ 0,00'}</span>
            </div>
            <div className="flex justify-between text-gray-300 text-sm">
              <span>Taxa</span>
              <span>R$ 0,00</span>
            </div>
          </div>

          <div className="border-b border-gray-800 mb-6"></div>

          {/* Total */}
          <div className="flex justify-between text-white text-2xl font-light mb-8">
            <span>TOTAL</span>
            <span className="text-purple-600">{formatCurrency(calcularTotalComDesconto())}</span>
          </div>
      
        </div>
      </div>
    </div>
  )
}
