'use client';

import { ArrowLeft, CreditCard, Lock, Smartphone, Timer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckoutData } from '@/types/Checkout';
import CheckoutStorageService from '@/services/CheckoutStorageService';

/**
 * Página de Checkout Reutilizável
 *
 * Esta página processa pagamentos para qualquer tipo de produto.
 * Os dados são recebidos via localStorage através do CheckoutStorageService.
 *
 * @see /docs/CHECKOUT.md para documentação completa de uso
 * 
 * Campos obrigatórios:
 * - userName: string
 *   Exemplo: "João Silva"
 * - userId: string
 *   Exemplo: "usr_12345"
 * - valor: string
 *   Exemplo: "R$ 1.500,00"
 * - productName: string
 *   Exemplo: "Plano Premium"
 * - productType: string
 *   Exemplo: "plano"
 * - productDescription: string
 *   Exemplo: "Acesso completo"
 * 
 * Campos opcionais:
 * - validity: number
 * - obs: string
 * 
 */
export default function CheckoutPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'pix'>(
    'credit',
  );
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
    const data = CheckoutStorageService.recuperarDadosCheckout();

    if (!data) {
      // Redireciona se não houver dados
      alert('Nenhum dado de checkout encontrado. Redirecionando...');
      window.close(); // Tenta fechar a janela
      router.replace('/'); // Fallback se não conseguir fechar
      return;
    }

    setCheckoutData(data);
    setIsLoading(false);
  }, [router]);

  // Timer para countdown do PIX
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (timerActive && timeRemaining > 0) {
      intervalId = setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime <= 1) {
            setTimerActive(false);
            // Timer expirado - limpar dados e fechar/redirecionar
            CheckoutStorageService.limparDadosCheckout();
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
    return parseFloat(
      valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim(),
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
    if (confirm('Deseja realmente sair do checkout? Os dados serão perdidos.')) {
      CheckoutStorageService.limparDadosCheckout();
      window.close();
    }
  };

  const handleExit = () => {
    if (confirm('Deseja cancelar o pagamento?')) {
      CheckoutStorageService.limparDadosCheckout();
      window.close();
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData((prev) => ({ ...prev, cardNumber: formatted }));
  };

  const handleGeneratePix = () => {
    setPixGenerated(true);
    setTimerActive(true);
    setTimeRemaining(30 * 60);
  };

  const handleCopyPixCode = async () => {
    const pixCode = '1234-5678-9012-3456-7890-1234-5678-9012';
    try {
      await navigator.clipboard.writeText(pixCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 3000);
    } catch (err) {
      console.error('Erro ao copiar código PIX:', err);
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
      // Aqui você pode implementar a lógica de integração com API de pagamento
      // Por enquanto, simulando processamento
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Limpar dados após sucesso
      CheckoutStorageService.limparDadosCheckout();

      // Sucesso - pode redirecionar ou fechar janela
      alert('Pagamento processado com sucesso!');
      window.close();
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
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

  const valorNumerico = parseCurrency(checkoutData.valor);

  return (
    <div className="h-screen bg-black text-white overflow-hidden">
      

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
                    {getOpcoesParcelamento(valorNumerico).map((opcao) => (
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
                        <div className="break-all text-center font-mono text-[10px] text-gray-400">
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
                        className={`text-xs ${
                          timeRemaining < 300
                            ? 'text-red-400'
                            : 'text-yellow-400'
                        }`}
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
              {isProcessing ? 'Processando...' : 'Finalizar Pagamento'}
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
              <div className="mt-2 text-[10px] italic text-gray-400">
                {checkoutData.obs}
              </div>
            )}
          </div>

          <div className="mb-4 border-b border-gray-800"></div>

          {/* Valores */}
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-xs text-gray-300">
              <span>Subtotal</span>
              <span>{checkoutData.valor}</span>
            </div>
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
              {formatCurrency(valorNumerico)}
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
