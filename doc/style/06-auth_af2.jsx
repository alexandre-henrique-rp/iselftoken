import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  ArrowLeft, 
  RotateCcw,
  CheckCircle,
  Shield,
  Globe,
  Mail
} from 'lucide-react';

// ============================================
// COMPONENTES UI
// ============================================

const ButtonPremium = ({ children, variant = "primary", className = "", disabled, ...props }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 border-transparent disabled:bg-stone-800 disabled:text-stone-500 disabled:shadow-none disabled:cursor-not-allowed",
    secondary: "bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-700 hover:border-stone-600 disabled:opacity-50 disabled:cursor-not-allowed",
    ghost: "bg-transparent hover:bg-stone-800/50 text-stone-400 hover:text-stone-200 border-transparent"
  };

  return (
    <button 
      className={`
        w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 border
        ${variants[variant]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

// Componente de Input OTP (One-Time Password)
const OtpInput = ({ length = 6, value, onChange }) => {
  const inputsRef = useRef([]);

  const focusInput = (index) => {
    inputsRef.current[index]?.focus();
  };

  const handleChange = (e, index) => {
    const val = e.target.value;
    if (!/^[0-9]*$/.test(val)) return;

    const newValue = value.split('');
    newValue[index] = val.substring(val.length - 1);
    const newString = newValue.join('');
    
    onChange(newString);

    // Auto-focus next
    if (val && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length).replace(/[^0-9]/g, '');
    if (pastedData) {
      onChange(pastedData.padEnd(length, '').slice(0, length));
      focusInput(Math.min(pastedData.length, length - 1));
    }
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={`
            w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg
            bg-stone-900 text-stone-100 border transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-600/50
            ${value[i] ? 'border-blue-600' : 'border-stone-800'}
          `}
        />
      ))}
    </div>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function AF2Page() {
  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutos em segundos
  const [canResend, setCanResend] = useState(false);

  // Formatar tempo MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Lógica do Timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleResend = () => {
    setOtp('');
    setTimeLeft(300);
    setCanResend(false);
    // Adicionar lógica de API aqui
    console.log("Código reenviado");
  };

  const handleVerify = () => {
    // Adicionar lógica de verificação
    console.log("Verificando código:", otp);
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-stone-950 font-sans">
      
      {/* ==================== COLUNA ESQUERDA (VERIFICAÇÃO) ==================== */}
      <div className="flex flex-col p-8 md:p-12 relative z-10">
        
        {/* Header Mobile / Logo */}
        <div className="flex justify-between items-center lg:justify-start mb-12">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center group-hover:border-[#d500f9]/30 transition-colors">
              <span className="text-lg font-bold" style={{ color: '#d500f9' }}>i</span>
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: '#d500f9' }}>
              iSelfToken
            </span>
          </a>
          <button className="lg:hidden p-2 text-stone-500 hover:text-stone-300 transition-colors">
            <Globe className="w-5 h-5" />
          </button>
        </div>

        {/* Container Centralizado */}
        <div className="mx-auto w-full max-w-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
              <ShieldCheck className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-50 mb-3 tracking-tight">
              Verificação em dois fatores
            </h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              Para sua segurança, enviamos um código de 6 dígitos para o e-mail <strong className="text-stone-200">usuario@exemplo.com</strong>
            </p>
          </div>

          <div className="space-y-8">
            {/* Input OTP */}
            <div>
              <OtpInput length={6} value={otp} onChange={setOtp} />
              <div className="text-center mt-4">
                 <p className={`text-sm font-medium ${timeLeft < 60 ? 'text-red-400' : 'text-stone-500'}`}>
                   O código expira em {formatTime(timeLeft)}
                 </p>
              </div>
            </div>

            {/* Ações */}
            <div className="space-y-3">
              <ButtonPremium 
                onClick={handleVerify}
                disabled={otp.length !== 6}
                variant="primary"
              >
                Verificar código
              </ButtonPremium>

              <ButtonPremium 
                onClick={handleResend}
                disabled={!canResend}
                variant="secondary"
                className="gap-2"
              >
                <RotateCcw className={`w-4 h-4 ${!canResend && 'opacity-50'}`} />
                Reenviar código
              </ButtonPremium>
            </div>

            <div className="pt-4 border-t border-stone-800">
               <button className="w-full flex items-center justify-center gap-2 text-stone-500 hover:text-stone-300 transition-colors text-sm font-medium p-2">
                 <ArrowLeft className="w-4 h-4" />
                 Voltar para login
               </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto hidden lg:flex items-center gap-6 text-sm text-stone-500 pt-12">
          <span>© 2026 iSelfToken</span>
          <a href="#" className="hover:text-stone-300 transition-colors">Ajuda</a>
          <a href="#" className="hover:text-stone-300 transition-colors">Privacidade</a>
        </div>
      </div>

      {/* ==================== COLUNA DIREITA (HERO IMAGE) ==================== */}
      <div className="hidden lg:block relative bg-stone-900 border-l border-stone-800 overflow-hidden h-screen top-0">
        {/* Imagem de Fundo (Business Theme) */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
            alt="Segurança Corporativa"
            className="h-full w-full object-cover opacity-40 mix-blend-luminosity hover:mix-blend-normal hover:opacity-50 transition-all duration-700 hover:scale-105"
          />
          {/* Overlay gradiente */}
          <div className="absolute inset-0 bg-linear-to-t from-stone-950 via-stone-950/60 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-r from-stone-950/80 to-transparent" />
        </div>

        {/* Conteúdo Sobreposto */}
        <div className="relative h-full flex flex-col justify-end p-12 z-20">
          {/* Badge Decorativo */}
          <div className="flex items-center gap-2 mb-6">
            <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md text-blue-400 text-xs font-semibold flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Ambiente Seguro
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-6 leading-tight max-w-lg">
            Segurança em primeiro lugar para seus investimentos
          </h2>
          
          <p className="text-stone-300 text-lg mb-10 max-w-md leading-relaxed">
            Utilizamos as mais avançadas tecnologias de criptografia e verificação para garantir a proteção do seu patrimônio.
          </p>

          {/* Badges Inferiores */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-800/50 backdrop-blur-md border border-stone-700/50 rounded-lg">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-stone-200">Plataforma Regulada</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-800/50 backdrop-blur-md border border-stone-700/50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-stone-200">Investimento Acessível</span>
            </div>
          </div>
        </div>

        {/* Efeitos Decorativos de Fundo */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-125 h-125 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -translate-x-1/3 translate-y-1/3 w-100 h-100 bg-[#d500f9]/10 rounded-full blur-[100px] pointer-events-none" />
      </div>
    </div>
  );
}
