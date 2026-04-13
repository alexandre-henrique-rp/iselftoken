import React, { useState, useEffect } from 'react';
import { 
  CreditCard, QrCode, ShieldCheck, Lock, 
  ChevronRight, ChevronLeft, CheckCircle, 
  AlertTriangle, Copy, Loader2, Calendar, User,
  Smartphone, Wallet
} from 'lucide-react';

// ============================================
// MOCK DECODED TOKEN (Simulação)
// ============================================
const mockDecodedToken = {
  transactionId: "txn_" + Math.floor(Math.random() * 100000),
  product: {
    name: "Plano Premium Anual",
    description: "Acesso completo à plataforma de investimentos, análises de IA e suporte prioritário.",
    quantity: 1,
    unitPrice: 1200.00
  },
  summary: {
    subtotal: 1200.00,
    discount: 0,
    fees: 0,
    total: 1200.00,
    currency: "BRL"
  },
  buyer: {
    name: "Ricardo Mendes",
    email: "ricardo@finflow.com.br",
    document: "123.456.789-00"
  },
  // Data futura para não expirar no teste
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() 
};

// ============================================
// COMPONENTES UI (DESIGN SYSTEM)
// ============================================

const Card = ({ children, className = "" }) => (
  <div className={`bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm ${className}`}>
    {children}
  </div>
);

const InputLabel = ({ label }) => (
  <label className="block text-sm font-medium text-stone-400 mb-1.5">{label}</label>
);

const InputField = ({ icon: Icon, className = "", ...props }) => (
  <div className="relative group">
    {Icon && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-blue-400 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
    )}
    <input
      className={`
        w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg 
        ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-2.5 
        placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 
        transition-all text-sm ${className}
      `}
      {...props}
    />
  </div>
);

const SelectField = ({ options, ...props }) => (
  <select
    className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 appearance-none text-sm cursor-pointer"
    {...props}
  >
    {options.map((opt, i) => (
      <option key={i} value={opt.value} className="bg-stone-900">{opt.label}</option>
    ))}
  </select>
);

const Button = ({ children, variant = 'primary', className = '', disabled, ...props }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 border-transparent",
    secondary: "bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700",
    outline: "bg-transparent border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600",
    success: "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 border-transparent"
  };
  return (
    <button 
      className={`
        flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 border 
        ${variants[variant]} ${className} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================
// LÓGICA DE PARCELAMENTO
// ============================================
const calculateInstallments = (total) => {
  const installments = [];
  const interestRate = 0.02; // 2% a.m.

  for (let i = 1; i <= 10; i++) {
    if (i <= 5) {
      // Sem juros
      installments.push({
        count: i,
        value: total / i,
        total: total,
        interest: false
      });
    } else {
      // Com juros simples (exemplo simplificado da descrição)
      // Fórmula: total + (total * juros * meses)
      const totalWithInterest = total + (total * interestRate * i);
      installments.push({
        count: i,
        value: totalWithInterest / i,
        total: totalWithInterest,
        interest: true
      });
    }
  }
  return installments;
};

// ============================================
// PÁGINA DE CHECKOUT
// ============================================

export default function CheckoutPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Review/Select, 2: Payment, 3: Success
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // 'credit_card' | 'pix'
  const [processing, setProcessing] = useState(false);
  
  // Credit Card State
  const [cardData, setCardData] = useState({
    number: '', holder: '', expiry: '', cvv: '', installments: 1
  });

  useEffect(() => {
    // Simular validação do token
    const loadTransaction = async () => {
      // Em produção: const params = new URLSearchParams(window.location.search); const token = params.get('transaction');
      // Decodificar JWT aqui
      
      await new Promise(r => setTimeout(r, 1000)); // Simula delay de rede

      const data = mockDecodedToken;
      const now = new Date();
      const expires = new Date(data.expiresAt);

      if (expires < now) {
        setError('Este link de checkout expirou. Por favor, gere uma nova transação.');
      } else {
        setTransaction(data);
      }
      setLoading(false);
    };

    loadTransaction();
  }, []);

  const handlePayment = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000)); // Simula processamento
    setProcessing(false);
    setCurrentStep(3); // Success
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-stone-400">Validando transação segura...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center border-red-500/20 bg-red-500/5">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-red-400 mb-2">Erro na Transação</h2>
          <p className="text-stone-400 mb-6">{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()} className="w-full">
            Tentar Novamente
          </Button>
        </Card>
      </div>
    );
  }

  // Layout Principal
  return (
    <div className="min-h-screen bg-stone-950 text-stone-50 font-sans">
      
      {/* Header Seguro */}
      <header className="border-b border-stone-800 bg-stone-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight" style={{ color: '#d500f9' }}>iSelfToken</span>
            <span className="h-4 w-px bg-stone-700 mx-2 hidden sm:block"></span>
            <span className="text-sm text-stone-400 hidden sm:flex items-center gap-1">
              <Lock className="w-3 h-3" /> Checkout Seguro
            </span>
          </div>
          <div className="text-xs text-stone-500 font-mono">
            ID: {transaction.transactionId}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ==================== COLUNA ESQUERDA: FLUXO ==================== */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* ETAPA 3: SUCESSO */}
            {currentStep === 3 ? (
              <Card className="text-center py-12 border-green-500/20 bg-green-500/5 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/50">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-stone-50 mb-2">Pagamento Confirmado!</h2>
                <p className="text-stone-400 mb-8 max-w-md mx-auto">
                  Sua transação foi processada com sucesso. Você receberá um e-mail com os detalhes e a nota fiscal.
                </p>
                <div className="bg-stone-950/50 rounded-xl p-4 max-w-sm mx-auto border border-stone-800 mb-8">
                  <p className="text-xs text-stone-500 uppercase mb-1">Comprovante</p>
                  <p className="text-lg font-mono text-stone-200">{transaction.transactionId}</p>
                </div>
                <Button className="w-full max-w-sm" onClick={() => window.location.href = '/dashboard'}>
                  Ir para Meus Investimentos
                </Button>
              </Card>
            ) : (
              // ETAPAS 1 e 2
              <>
                {/* Abas de Navegação (Visual) */}
                <div className="flex items-center mb-6">
                  <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-400' : 'text-stone-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${currentStep >= 1 ? 'border-blue-400 bg-blue-400/10' : 'border-stone-700'}`}>1</div>
                    <span className="font-medium">Identificação</span>
                  </div>
                  <div className="w-12 h-0.5 bg-stone-800 mx-3"></div>
                  <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-400' : 'text-stone-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold ${currentStep >= 2 ? 'border-blue-400 bg-blue-400/10' : 'border-stone-700'}`}>2</div>
                    <span className="font-medium">Pagamento</span>
                  </div>
                </div>

                {/* --- ETAPA 1: REVISÃO & MÉTODO --- */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <Card title="Dados do Comprador">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-stone-400">
                          <User className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-stone-200">{transaction.buyer.name}</h3>
                          <p className="text-stone-400 text-sm">{transaction.buyer.email}</p>
                          <p className="text-stone-500 text-xs mt-1">CPF: {transaction.buyer.document}</p>
                        </div>
                      </div>
                    </Card>

                    <div>
                      <h3 className="text-lg font-semibold text-stone-50 mb-4">Como você prefere pagar?</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'credit_card' ? 'border-blue-600 bg-blue-600/5' : 'border-stone-800 bg-stone-900 hover:border-stone-700'}`}>
                          <input 
                            type="radio" 
                            name="method" 
                            className="hidden" 
                            checked={paymentMethod === 'credit_card'} 
                            onChange={() => setPaymentMethod('credit_card')} 
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'credit_card' ? 'border-blue-600' : 'border-stone-600'}`}>
                            {paymentMethod === 'credit_card' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <CreditCard className="w-5 h-5 text-stone-200" />
                              <span className="font-semibold text-stone-200">Cartão de Crédito</span>
                            </div>
                            <p className="text-xs text-stone-500">Até 10x (5x sem juros)</p>
                          </div>
                        </label>

                        <label className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${paymentMethod === 'pix' ? 'border-blue-600 bg-blue-600/5' : 'border-stone-800 bg-stone-900 hover:border-stone-700'}`}>
                          <input 
                            type="radio" 
                            name="method" 
                            className="hidden" 
                            checked={paymentMethod === 'pix'} 
                            onChange={() => setPaymentMethod('pix')} 
                          />
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'pix' ? 'border-blue-600' : 'border-stone-600'}`}>
                            {paymentMethod === 'pix' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <QrCode className="w-5 h-5 text-stone-200" />
                              <span className="font-semibold text-stone-200">PIX</span>
                            </div>
                            <p className="text-xs text-stone-500">Aprovação imediata</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button onClick={() => setCurrentStep(2)} className="w-full md:w-auto px-8">
                        Continuar
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* --- ETAPA 2: DADOS DO PAGAMENTO --- */}
                {currentStep === 2 && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <button 
                      onClick={() => setCurrentStep(1)}
                      className="text-sm text-stone-400 hover:text-stone-200 flex items-center gap-1 mb-4"
                    >
                      <ChevronLeft className="w-4 h-4" /> Voltar e alterar método
                    </button>

                    {/* FORMULÁRIO CARTÃO */}
                    {paymentMethod === 'credit_card' && (
                      <Card>
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-800">
                          <CreditCard className="w-6 h-6 text-blue-500" />
                          <h3 className="text-lg font-bold text-stone-50">Dados do Cartão</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="md:col-span-2">
                            <InputLabel label="Número do Cartão" />
                            <InputField 
                              icon={CreditCard} 
                              placeholder="0000 0000 0000 0000" 
                              value={cardData.number}
                              onChange={e => setCardData({...cardData, number: e.target.value})}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <InputLabel label="Nome impresso no cartão" />
                            <InputField 
                              icon={User} 
                              placeholder="COMO NO CARTÃO" 
                              value={cardData.holder}
                              onChange={e => setCardData({...cardData, holder: e.target.value.toUpperCase()})}
                            />
                          </div>
                          <div>
                            <InputLabel label="Validade" />
                            <InputField 
                              icon={Calendar} 
                              placeholder="MM/AA" 
                              maxLength={5}
                              value={cardData.expiry}
                              onChange={e => setCardData({...cardData, expiry: e.target.value})}
                            />
                          </div>
                          <div>
                            <InputLabel label="CVV" />
                            <InputField 
                              icon={Lock} 
                              placeholder="123" 
                              maxLength={4}
                              value={cardData.cvv}
                              onChange={e => setCardData({...cardData, cvv: e.target.value})}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <InputLabel label="Parcelamento" />
                            <SelectField 
                              options={calculateInstallments(transaction.summary.total).map(inst => ({
                                value: inst.count,
                                label: `${inst.count}x de ${formatCurrency(inst.value)} ${inst.interest ? '(c/ juros)' : 'sem juros'} - Total: ${formatCurrency(inst.total)}`
                              }))}
                              value={cardData.installments}
                              onChange={e => setCardData({...cardData, installments: parseInt(e.target.value)})}
                            />
                          </div>
                        </div>

                        <Button 
                          onClick={handlePayment} 
                          className="w-full py-4 text-base"
                          disabled={processing || !cardData.number || !cardData.holder}
                        >
                          {processing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" /> Processando...
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" /> Pagar {formatCurrency(
                                calculateInstallments(transaction.summary.total).find(i => i.count === cardData.installments)?.total || transaction.summary.total
                              )}
                            </>
                          )}
                        </Button>
                        <p className="text-center text-xs text-stone-500 mt-4 flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Pagamento processado em ambiente seguro
                        </p>
                      </Card>
                    )}

                    {/* VISUAL PIX */}
                    {paymentMethod === 'pix' && (
                      <Card className="text-center py-10">
                        <h3 className="text-lg font-bold text-stone-50 mb-2">Pagamento via PIX</h3>
                        <p className="text-stone-400 text-sm mb-8">Escaneie o código abaixo ou copie a chave para pagar.</p>
                        
                        <div className="w-64 h-64 bg-white p-4 rounded-xl mx-auto mb-8">
                          {/* Placeholder para QR Code real */}
                          <div className="w-full h-full bg-stone-200 flex items-center justify-center">
                            <QrCode className="w-32 h-32 text-stone-800" />
                          </div>
                        </div>

                        <div className="max-w-md mx-auto mb-8">
                          <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-lg p-3">
                            <code className="text-xs text-stone-300 flex-1 truncate">
                              00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000
                            </code>
                            <button className="text-blue-400 hover:text-blue-300 transition-colors p-1">
                              <Copy className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        <Button onClick={handlePayment} variant="success" className="w-full max-w-xs mx-auto" disabled={processing}>
                          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Já realizei o pagamento'}
                        </Button>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ==================== COLUNA DIREITA: RESUMO ==================== */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <Card className="bg-stone-900/50 backdrop-blur border-stone-800/80">
                <h3 className="text-lg font-bold text-stone-50 mb-6 pb-4 border-b border-stone-800">
                  Resumo do Pedido
                </h3>
                
                <div className="flex gap-4 mb-6">
                  <div className="w-16 h-16 rounded-lg bg-stone-800 flex items-center justify-center text-stone-500 border border-stone-700">
                    <Wallet className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-200 line-clamp-2">{transaction.product.name}</p>
                    <p className="text-xs text-stone-500 mt-1">{transaction.product.description}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm border-t border-stone-800 pt-4 mb-4">
                  <div className="flex justify-between text-stone-400">
                    <span>Subtotal</span>
                    <span>{formatCurrency(transaction.summary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Taxas</span>
                    <span>{formatCurrency(transaction.summary.fees)}</span>
                  </div>
                  {transaction.summary.discount > 0 && (
                    <div className="flex justify-between text-green-400">
                      <span>Desconto</span>
                      <span>- {formatCurrency(transaction.summary.discount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-stone-800">
                  <span className="text-stone-200 font-semibold">Total a pagar</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-stone-50">{formatCurrency(transaction.summary.total)}</p>
                    {paymentMethod === 'credit_card' && currentStep === 2 && cardData.installments > 1 && (
                      <p className="text-xs text-stone-500">
                        em {cardData.installments}x de {formatCurrency(
                          calculateInstallments(transaction.summary.total).find(i => i.count === cardData.installments)?.value
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Informações de Segurança */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-900/10 border border-blue-900/20">
                <ShieldCheck className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-200">Compra Garantida</p>
                  <p className="text-xs text-blue-300/70 mt-1 leading-relaxed">
                    Seus dados estão protegidos com criptografia de ponta a ponta. Caso ocorra algum problema, garantimos o estorno.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
