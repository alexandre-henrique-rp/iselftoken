'use client';

import CupomService from '@/services/CupomService';
import { CheckoutData, CupomData } from '@/types/Checkout';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Lock,
  Smartphone,
  Tag,
  Timer,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Funções locais para substituir CheckoutStorageService
const STORAGE_KEY = 'checkout_data';

const recuperarDadosCheckout = (): CheckoutData | null => {
  try {
    console.log('🔍 Tentando recuperar dados do localStorage...');

    const storedData = localStorage.getItem(STORAGE_KEY);
    console.log('📦 Dados brutos do localStorage:', storedData);

    if (!storedData) {
      console.error('❌ Nenhum dado encontrado no localStorage');
      return null;
    }

    const parsedData = JSON.parse(storedData);
    console.log('📋 Dados parseados:', parsedData);

    // Validação básica mais robusta
    if (!parsedData || typeof parsedData !== 'object') {
      console.error('❌ Dados parseados não são um objeto válido');
      return null;
    }

    const camposObrigatorios = [
      'userName',
      'userId',
      'valor',
      'productName',
      'productType',
      'productDescription',
    ];
    for (const campo of camposObrigatorios) {
      if (!parsedData[campo] || typeof parsedData[campo] !== 'string') {
        console.error(
          `❌ Campo obrigatório inválido ou ausente: ${campo}`,
          parsedData[campo],
        );
        return null;
      }
    }

    console.log('✅ Dados do checkout validados com sucesso');
    return parsedData as CheckoutData;
  } catch (error) {
    console.error('❌ Erro ao recuperar dados do checkout:', error);
    // Tentar limpar dados corrompidos
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Dados corrompidos removidos do localStorage');
    } catch (cleanupError) {
      console.error('❌ Erro ao limpar localStorage:', cleanupError);
    }
    return null;
  }
};

const limparDadosCheckout = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
  }
};

const parseValorMonetario = (valorString: string): number => {
  try {
    console.log('💰 Parseando valor monetário:', valorString);

    if (!valorString || typeof valorString !== 'string') {
      console.error('❌ Valor inválido:', valorString);
      return 0;
    }

    // Remove apenas o símbolo R$ e espaços, mantém pontos e vírgulas
    const valorLimpo = valorString
      .replace('R$', '')
      .replace(/\s/g, '') // Remove espaços
      .trim();

    console.log('🧹 Valor limpo (mantendo pontos):', valorLimpo);

    // Se não tiver vírgula decimal, assume que é valor inteiro
    if (!valorLimpo.match(/,/)) {
      console.log('🔄 Valor inteiro detectado, adicionando .00');
      const valorNumerico = parseFloat(valorLimpo);
      console.log('✅ Valor parseado (inteiro):', valorNumerico);
      return valorNumerico;
    }

    // Se não tiver pontos de milhar (formato correto), substitui vírgula por ponto
    if (!valorLimpo.match(/\./)) {
      const valorComPonto = valorLimpo.replace(',', '.');
      console.log('🔄 Convertido para ponto decimal:', valorComPonto);
      const valorNumerico = parseFloat(valorComPonto);
      console.log('✅ Valor parseado:', valorNumerico);
      return valorNumerico;
    }

    // Se tiver pontos, assume que é formato brasileiro e remove pontos primeiro
    const valorSemPontos = valorLimpo.replace(/\./g, '');
    const valorComPonto = valorSemPontos.replace(',', '.');
    console.log(
      '🔄 Removendo pontos de milhar:',
      valorSemPontos,
      '→',
      valorComPonto,
    );

    const valorNumerico = parseFloat(valorComPonto);

    if (isNaN(valorNumerico) || !isFinite(valorNumerico)) {
      console.error('❌ Valor não é um número válido:', valorNumerico);
      return 0;
    }

    console.log('✅ Valor parseado com sucesso:', valorNumerico);
    return valorNumerico;
  } catch (error) {
    console.error('❌ Erro ao parsear valor monetário:', error);
    return 0;
  }
};

const formatarValorMonetario = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

const calcularValorServicosAdicionais = (
  checkoutData: CheckoutData,
): number => {
  if (
    !checkoutData.addServicesDescription ||
    checkoutData.addServicesDescription.length === 0
  ) {
    return 0;
  }
  return checkoutData.addServicesDescription.reduce((acc, servico) => {
    const quantidadeServico = servico.quantidade || 1;
    return acc + servico.value * quantidadeServico;
  }, 0);
};

/**
 * Página de Checkout Profissional
 *
 * Esta página processa pagamentos para qualquer tipo de produto.
 * Os dados são recebidos via localStorage.
 *
 * Dimensão: 1025x768 pixels (otimizada para popup)
 *
 * Campos obrigatórios:
 * - userName: string (Ex: "João Silva")
 * - userId: string (Ex: "usr_12345")
 * - valor: string (Ex: "R$ 1.500,00")
 * - productName: string (Ex: "Plano Premium")
 * - productType: string (Ex: "plano")
 * - productDescription: string (Ex: "Acesso completo")
 *
 * Campos opcionais:
 * - quantidade: number (padrão: 1)
 * - validity: number
 * - obs: string
 * - addServicesDescription: [{ description: string, value: number, quantidade?: number}]
 */
export default function CheckoutPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'pix'>(
    'credit',
  );
  const [cupom, setCupom] = useState<CupomData | null>(null);
  const [cupomCode, setCupomCode] = useState('');
  const [isLoadingCupom, setIsLoadingCupom] = useState(false);
  const [showCupomInput, setShowCupomInput] = useState(false);

  const [formData, setFormData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    installments: '1',
    termsAccepted: false,
  });

  const [pixGenerated, setPixGenerated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutos
  const [timerActive, setTimerActive] = useState(false);

  // Carrega dados do checkout ao montar o componente
  useEffect(() => {
    console.log('🚀 Iniciando carregamento da página de checkout...');

    try {
      const data = recuperarDadosCheckout();

      if (!data) {
        console.error('❌ Nenhum dado de checkout encontrado');
        alert('Nenhum dado de checkout encontrado. Redirecionando...');
        window.close();
        router.replace('/');
        return;
      }

      console.log('✅ Dados do checkout carregados:', data);

      // Validar dados específicos
      if (!data.userName || !data.userId || !data.valor) {
        console.error('❌ Dados essenciais ausentes:', {
          userName: data.userName,
          userId: data.userId,
          valor: data.valor,
        });
        alert('Dados incompletos. Tente novamente.');
        window.close();
        return;
      }

      // Validar valor
      const valorParseado = parseValorMonetario(data.valor);
      if (valorParseado <= 0) {
        console.error('❌ Valor inválido:', data.valor, '->', valorParseado);
        alert('Valor inválido. Tente novamente.');
        window.close();
        return;
      }

      setCheckoutData(data);
      setIsLoading(false);
      console.log('🎉 Checkout inicializado com sucesso!');
    } catch (error) {
      console.error('❌ Erro crítico ao inicializar checkout:', error);
      alert('Erro ao carregar página de pagamento. Tente novamente.');
      window.close();
    }
  }, [router]);

  // Timer para countdown do PIX
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (timerActive && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            setTimerActive(false);
            limparDadosCheckout();
            alert('Tempo expirado! A sessão de pagamento foi encerrada.');
            window.close();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timerActive, timeRemaining]);

  // Funções de formatação
  const parseCurrency = (valor: string): number => {
    return parseValorMonetario(valor);
  };

  const formatCurrency = (value: number) => {
    return formatarValorMonetario(value);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ').substring(0, 19);
  };

  // Cálculo de valores
  const valorBase = checkoutData ? parseCurrency(checkoutData.valor) : 0;
  const quantidade = checkoutData?.quantidade || 1;
  const valorBaseTotal = valorBase; // O valor já vem como total do localStorage
  const valorServicosAdicionais = checkoutData
    ? calcularValorServicosAdicionais(checkoutData)
    : 0;
  const valorSubtotal = valorBaseTotal + valorServicosAdicionais;
  const valorDesconto =
    cupom && cupom.isValid
      ? CupomService.calcularDesconto(cupom, valorSubtotal)
      : 0;
  const valorTotal = valorSubtotal - valorDesconto;

  // Opções de parcelamento baseadas no valor
  const getOpcoesParcelamento = (valor: number) => {
    if (valor < 100) {
      return [
        { parcelas: 1, texto: `1x de ${formatCurrency(valor)} sem juros` },
      ];
    } else if (valor >= 100 && valor < 500) {
      return [
        { parcelas: 1, texto: `1x de ${formatCurrency(valor)} sem juros` },
        { parcelas: 2, texto: `2x de ${formatCurrency(valor / 2)} sem juros` },
        { parcelas: 3, texto: `3x de ${formatCurrency(valor / 3)} sem juros` },
      ];
    } else if (valor >= 500 && valor < 3000) {
      const opcoes = [
        { parcelas: 1, texto: `1x de ${formatCurrency(valor)} sem juros` },
        { parcelas: 2, texto: `2x de ${formatCurrency(valor / 2)} sem juros` },
        { parcelas: 3, texto: `3x de ${formatCurrency(valor / 3)} sem juros` },
      ];
      for (let i = 4; i <= 10; i++) {
        opcoes.push({
          parcelas: i,
          texto: `${i}x de ${formatCurrency(valor / i)} sem juros`,
        });
      }
      return opcoes;
    } else {
      const opcoes = [
        { parcelas: 1, texto: `1x de ${formatCurrency(valor)} sem juros` },
        { parcelas: 2, texto: `2x de ${formatCurrency(valor / 2)} sem juros` },
        { parcelas: 3, texto: `3x de ${formatCurrency(valor / 3)} sem juros` },
      ];
      for (let i = 4; i <= 15; i++) {
        opcoes.push({
          parcelas: i,
          texto: `${i}x de ${formatCurrency(valor / i)} sem juros`,
        });
      }
      return opcoes;
    }
  };

  // Handlers
  const handleBack = () => {
    if (
      confirm('Deseja realmente sair do checkout? Os dados serão perdidos.')
    ) {
      limparDadosCheckout();
      window.close();
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData((prev) => ({ ...prev, cardNumber: formatted }));
  };

  const handleApplyCupom = async () => {
    if (!cupomCode.trim()) {
      alert('Digite um código de cupom');
      return;
    }

    setIsLoadingCupom(true);

    try {
      const cupomValidado = await CupomService.validarCupom(
        cupomCode,
        valorSubtotal,
      );
      setCupom(cupomValidado);

      if (cupomValidado.isValid) {
        console.log('🎉 Cupom aplicado com sucesso:', cupomValidado);
      } else {
        console.log('❌ Cupom inválido:', cupomValidado.message);
      }
    } catch (error) {
      console.error('❌ Erro ao aplicar cupom:', error);
      alert('Erro ao validar cupom. Tente novamente.');
    } finally {
      setIsLoadingCupom(false);
    }
  };

  const handleRemoveCupom = () => {
    setCupom(null);
    setCupomCode('');
    console.log('🗑️ Cupom removido');
  };

  const handleGeneratePix = () => {
    setPixGenerated(true);
    setTimerActive(true);
    setTimeRemaining(30 * 60);
    console.log('📱 Código PIX gerado');
  };

  const handleCopyPixCode = async () => {
    const pixCode = '1234-5678-9012-3456-7890-1234-5678-9012';
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
      console.log('📋 Código PIX copiado para área de transferência');
    } catch (err) {
      console.error('❌ Erro ao copiar código PIX:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.termsAccepted) {
      alert('Você precisa aceitar os termos e condições');
      return;
    }

    if (!checkoutData) {
      alert('Dados do checkout não encontrados');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('💳 Processando pagamento...', {
        method: paymentMethod,
        amount: valorTotal,
        cupom: cupom?.code,
        hasAdditionalServices: valorServicosAdicionais > 0,
      });

      // Simulação de processamento
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Simular resultado do pagamento (80% sucesso para demonstração)
      const success = Math.random() > 0.2;

      // Salvar resultado no localStorage para a janela pai ler
      localStorage.setItem('checkout_payment_completed', 'true');
      localStorage.setItem(
        'checkout_payment_result',
        JSON.stringify({
          success,
          message: success
            ? 'Pagamento aprovado com sucesso!'
            : 'Falha no processamento do pagamento',
          method: paymentMethod,
          amount: valorTotal,
        }),
      );

      limparDadosCheckout();

      if (success) {
        alert('Pagamento processado com sucesso!');
      } else {
        alert('Falha no processamento do pagamento. Tente novamente.');
      }

      window.close();
    } catch (error) {
      console.error('❌ Erro ao processar pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-gray-400">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!checkoutData) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-white">
            Dados não encontrados
          </h1>
          <p className="mb-6 text-gray-400">
            Nenhum dado de checkout foi encontrado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-[1025px] overflow-hidden bg-black text-white">
      {/* Header */}
      <div className="flex h-[57px] items-center justify-between border-b border-gray-800 px-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-light text-white">CHECKOUT</h1>
          <div className="h-4 w-px bg-gray-700"></div>
          <span className="text-xs text-gray-400">Pagamento Seguro</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          <Lock className="h-3 w-3" />
          <span>SSL Encrypted</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Lado Esquerdo - Formulário */}
        <div className="w-[58%] overflow-y-auto p-6">
          {/* Botão Voltar */}
          <button
            onClick={handleBack}
            className="mb-4 flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-purple-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>

          <div className="mb-4 border-b border-gray-800"></div>

          {/* Título */}
          <h1 className="mb-1 text-2xl font-light text-white">
            FINALIZAR PAGAMENTO
          </h1>
          <p className="mb-5 text-xs text-gray-400">
            Pagamento para: {checkoutData.userName}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tabs de Pagamento */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-all ${
                  paymentMethod === 'credit'
                    ? 'border-purple-600 bg-purple-600/10 text-purple-600'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-purple-600'
                }`}
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Cartão</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-purple-600 bg-purple-600/10 text-purple-600'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-purple-600'
                }`}
              >
                <Smartphone className="h-4 w-4" />
                <span className="text-sm font-medium">PIX</span>
              </button>
            </div>

            {/* Conteúdo Dinâmico */}
            {paymentMethod === 'credit' ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-300">
                    Parcelamento
                  </label>
                  <select
                    value={formData.installments}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        installments: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white transition-colors focus:border-purple-600 focus:outline-none"
                  >
                    {getOpcoesParcelamento(valorTotal).map((opcao) => (
                      <option key={opcao.parcelas} value={opcao.parcelas}>
                        {opcao.texto}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-300">
                    Número do cartão
                  </label>
                  <input
                    type="text"
                    value={formData.cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-purple-600 focus:outline-none"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium text-gray-300">
                      Validade
                    </label>
                    <input
                      type="text"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          expiryDate: e.target.value,
                        }))
                      }
                      placeholder="MM/AA"
                      maxLength={5}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-1.5 block text-xs font-medium text-gray-300">
                      CVV
                    </label>
                    <input
                      type="text"
                      value={formData.cvv}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          cvv: e.target.value,
                        }))
                      }
                      placeholder="123"
                      maxLength={3}
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-300">
                    Nome no cartão
                  </label>
                  <input
                    type="text"
                    value={formData.cardName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cardName: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                    className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-purple-600 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {!pixGenerated ? (
                  <div className="space-y-3 text-center">
                    <div className="space-y-1.5 text-xs text-gray-400">
                      <p>Como funciona:</p>
                      <p>1. Clique em &quot;Gerar código PIX&quot;</p>
                      <p>2. Escaneie o QR Code ou copie o código</p>
                      <p>3. Realize o pagamento no app do seu banco</p>
                      <p>4. Aguarde a confirmação automática</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleGeneratePix}
                      className="w-full rounded-lg border border-purple-600 bg-transparent py-2.5 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-600/10"
                    >
                      Gerar Código PIX
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center">
                      {/* QR Code Placeholder */}
                      <div className="mb-4 rounded-lg bg-white p-3">
                        <div className="flex h-32 w-32 items-center justify-center rounded bg-gray-200">
                          <div className="text-xs text-gray-500">QR Code</div>
                        </div>
                      </div>

                      <p className="mb-3 text-center text-xs text-gray-300">
                        Escaneie o QR Code acima ou copie o código PIX
                      </p>

                      {/* Código PIX */}
                      <div className="mb-3 w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
                        <div className="text-center font-mono text-[10px] break-all text-gray-400">
                          1234-5678-9012-3456-7890-1234-5678-9012
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyPixCode}
                        className={`w-full rounded-lg py-2.5 text-sm font-medium transition-colors ${
                          copiedCode
                            ? 'bg-green-600 text-white'
                            : 'border border-purple-600 bg-transparent text-purple-600 hover:bg-purple-600/10'
                        }`}
                      >
                        {copiedCode ? '✓ Código Copiado' : '📋 Copiar código'}
                      </button>
                    </div>

                    {/* Status */}
                    <div
                      className={`flex items-center gap-2 rounded-lg border p-3 ${
                        timeRemaining < 300
                          ? 'animate-pulse border-red-700/30 bg-red-900/20'
                          : 'border-yellow-700/30 bg-yellow-900/20'
                      }`}
                    >
                      <Timer
                        className={`h-4 w-4 shrink-0 ${
                          timeRemaining < 300
                            ? 'text-red-400'
                            : 'text-yellow-400'
                        }`}
                      />
                      <div
                        className={`text-xs ${timeRemaining < 300 ? 'text-red-400' : 'text-yellow-400'}`}
                      >
                        Aguardando... {formatTime(timeRemaining)}
                        {timeRemaining < 300 && (
                          <div className="mt-0.5 text-[10px]">
                            ⚠️ Pague em 5 min
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cupom de Desconto */}
            <div className="space-y-3">
              {!showCupomInput && !cupom && (
                <button
                  type="button"
                  onClick={() => setShowCupomInput(true)}
                  className="flex items-center gap-2 text-xs text-purple-600 transition-colors hover:text-purple-500"
                >
                  <Tag className="h-3 w-3" />
                  Adicionar cupom de desconto
                </button>
              )}

              {(showCupomInput || cupom) && (
                <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-purple-600" />
                    <input
                      type="text"
                      value={cupomCode}
                      onChange={(e) =>
                        setCupomCode(e.target.value.toUpperCase())
                      }
                      placeholder="Código do cupom"
                      disabled={!!cupom}
                      className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
                    />
                    {!cupom ? (
                      <button
                        type="button"
                        onClick={handleApplyCupom}
                        disabled={isLoadingCupom || !cupomCode.trim()}
                        className="rounded bg-purple-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-700"
                      >
                        {isLoadingCupom ? '...' : 'Aplicar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRemoveCupom}
                        className="rounded border border-red-600 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-600/10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {cupom && (
                    <div
                      className={`mt-2 text-xs ${cupom.isValid ? 'text-green-400' : 'text-red-400'}`}
                    >
                      {cupom.isValid && (
                        <Check className="mr-1 inline h-3 w-3" />
                      )}
                      {CupomService.formatarMensagemDesconto(
                        cupom,
                        valorSubtotal,
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Termos */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={formData.termsAccepted}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    termsAccepted: e.target.checked,
                  }))
                }
                className="mt-0.5 h-3.5 w-3.5 rounded border-gray-700 bg-gray-900 text-purple-600 focus:ring-purple-600"
              />
              <label htmlFor="terms" className="text-xs text-gray-400">
                Aceito os termos e condições de uso e política de privacidade
              </label>
            </div>

            {/* Botão Finalizar */}
            <button
              type="submit"
              disabled={
                !formData.termsAccepted ||
                isProcessing ||
                (paymentMethod === 'pix' && !pixGenerated)
              }
              className="w-full rounded-lg bg-purple-600 py-3 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
            >
              {isProcessing
                ? 'Processando...'
                : `Finalizar Pagamento ${formatCurrency(valorTotal)}`}
            </button>

            {/* Texto Segurança */}
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
              <Lock className="h-3 w-3" />
              <span>Pagamento seguro e criptografado</span>
            </div>
          </form>
        </div>

        {/* Lado Direito - Resumo */}
        <div className="w-[42%] overflow-y-auto border-l border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-light text-white">
            RESUMO DO PEDIDO
          </h2>

          <div className="mb-4 border-b border-gray-800"></div>

          {/* Card do Produto */}
          <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600/10">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-purple-600">
                  {checkoutData.productName}
                  {quantidade > 1 && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      (x{quantidade})
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {checkoutData.productType}
                </div>
                {checkoutData.validity && (
                  <div className="text-xs text-gray-400">
                    Validade: {checkoutData.validity}{' '}
                    {checkoutData.validity === 1 ? 'mês' : 'meses'}
                  </div>
                )}
              </div>
            </div>

            {checkoutData.productDescription && (
              <div className="mt-3 text-xs text-gray-300">
                {checkoutData.productDescription}
              </div>
            )}

            {checkoutData.obs && (
              <div className="mt-2 text-[10px] text-gray-400 italic">
                {checkoutData.obs}
              </div>
            )}
          </div>

          {/* Serviços Adicionais */}
          {valorServicosAdicionais > 0 && (
            <>
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-medium text-gray-300">
                  Serviços Adicionais
                </h3>
                <div className="space-y-2">
                  {checkoutData.addServicesDescription?.map(
                    (servico, index) => {
                      const quantidadeServico = servico.quantidade || 1;
                      const valorTotalServico =
                        servico.value * quantidadeServico;
                      return (
                        <div
                          key={index}
                          className="flex justify-between text-xs text-gray-400"
                        >
                          <span>
                            {servico.description}
                            {quantidadeServico > 1 && (
                              <span className="ml-1 text-gray-500">
                                (x{quantidadeServico})
                              </span>
                            )}
                          </span>
                          <span>{formatCurrency(valorTotalServico)}</span>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
              <div className="mb-4 border-b border-gray-800"></div>
            </>
          )}

          {/* Valores */}
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-300">
              <span>Subtotal</span>
              <span>{formatCurrency(valorSubtotal)}</span>
            </div>

            {valorDesconto > 0 && (
              <div className="flex justify-between text-xs text-green-400">
                <span>Desconto ({cupom?.code})</span>
                <span>-{formatCurrency(valorDesconto)}</span>
              </div>
            )}

            <div className="flex justify-between text-xs text-gray-300">
              <span>Taxa</span>
              <span>R$ 0,00</span>
            </div>
          </div>

          <div className="mb-4 border-b border-gray-800"></div>

          {/* Total */}
          <div className="mb-6 flex justify-between text-xl font-light text-white">
            <span>TOTAL</span>
            <span className="text-purple-600">
              {formatCurrency(valorTotal)}
            </span>
          </div>

          {/* Info do Cliente */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-3">
            <div className="text-[10px] text-gray-400">Cliente</div>
            <div className="mt-1 text-sm text-white">
              {checkoutData.userName}
            </div>
            <div className="mt-0.5 text-[10px] text-gray-500">
              ID: {checkoutData.userId}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
