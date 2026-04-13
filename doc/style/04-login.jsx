import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  Shield, 
  Eye, 
  EyeOff,
  Globe
} from 'lucide-react';

// ============================================
// COMPONENTES UI (Baseados no Design System)
// ============================================

const InputPremium = ({ label, icon: Icon, type = "text", placeholder, id }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-stone-300">
        {label}
      </label>
      <div className="relative group">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-blue-500 transition-colors">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          className={`
            w-full bg-stone-900 border border-stone-800 text-stone-100 rounded-lg 
            ${Icon ? 'pl-10' : 'pl-4'} ${isPassword ? 'pr-10' : 'pr-4'} py-3
            placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600
            transition-all duration-200
          `}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 transition-colors"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
};

const ButtonPremium = ({ children, variant = "primary", className = "", ...props }) => {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 border-transparent",
    secondary: "bg-stone-900 hover:bg-stone-800 text-stone-200 border-stone-700 hover:border-stone-600",
    outline: "bg-transparent hover:bg-stone-900 text-stone-400 hover:text-stone-200 border-stone-800",
    ghost: "bg-transparent hover:bg-stone-800/50 text-stone-400 hover:text-blue-400 border-transparent"
  };

  return (
    <button 
      className={`
        w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 border
        ${variants[variant]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-stone-950 font-sans">
      
      {/* ==================== COLUNA ESQUERDA (FORMULÁRIO) ==================== */}
      <div className="flex flex-col justify-between p-8 md:p-12 relative z-10">
        
        {/* Header Mobile / Logo */}
        <div className="flex justify-between items-center lg:justify-start">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center group-hover:border-[#d500f9]/30 transition-colors">
              <span className="text-lg font-bold" style={{ color: '#d500f9' }}>i</span>
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: '#d500f9' }}>
              iSelfToken
            </span>
          </a>
          
          {/* Botão de idioma mobile */}
          <button className="lg:hidden p-2 text-stone-500 hover:text-stone-300 transition-colors">
            <Globe className="w-5 h-5" />
          </button>
        </div>

        {/* Container Centralizado do Form */}
        <div className="mx-auto w-full max-w-100 py-12 lg:py-0">
          <div className="text-center lg:text-left mb-10">
            <h1 className="text-3xl font-bold text-stone-50 mb-3 tracking-tight">
              Bem-vindo de volta
            </h1>
            <p className="text-stone-400">
              Acesse sua carteira e acompanhe seus investimentos em startups.
            </p>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <InputPremium 
              id="email" 
              type="email" 
              label="E-mail" 
              placeholder="exemplo@iselftoken.com" 
              icon={Mail} 
            />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <InputPremium 
                  id="password" 
                  type="password" 
                  label="Senha" 
                  placeholder="••••••••" 
                  icon={Lock} 
                />
              </div>
              <div className="flex justify-end pt-1">
                <a href="#" className="text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <ButtonPremium type="submit" variant="primary" className="mt-2">
              Entrar
              <ArrowRight className="w-4 h-4" />
            </ButtonPremium>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-stone-800"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-stone-950 px-2 text-stone-500">
                  Não tem conta?
                </span>
              </div>
            </div>

            <ButtonPremium type="button" variant="secondary">
              Crie sua conta
            </ButtonPremium>
          </form>

          <p className="mt-8 text-center text-xs text-stone-500 px-8 lg:px-0">
            Ao clicar em entrar, você concorda com nossos{" "}
            <a href="#" className="underline underline-offset-4 hover:text-stone-300 transition-colors">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="underline underline-offset-4 hover:text-stone-300 transition-colors">
              Política de Privacidade
            </a>
            .
          </p>
        </div>

        {/* Footer da coluna esquerda */}
        <div className="hidden lg:flex items-center gap-6 text-sm text-stone-500">
          <span>© 2026 iSelfToken</span>
          <a href="#" className="hover:text-stone-300 transition-colors">Ajuda</a>
          <a href="#" className="hover:text-stone-300 transition-colors">Privacidade</a>
        </div>
      </div>

      {/* ==================== COLUNA DIREITA (HERO IMAGE) ==================== */}
      <div className="hidden lg:block relative bg-stone-900 border-l border-stone-800 overflow-hidden">
        {/* Imagem de Fundo */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
            alt="Investimento em Tecnologia"
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
              Rodadas Abertas
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-6 leading-tight max-w-lg">
            Invista em startups promissoras via tokenização de equity
          </h2>
          
          <p className="text-stone-300 text-lg mb-10 max-w-md leading-relaxed">
            A iSelfToken conecta você a fundadores visionários em um ambiente seguro, transparente e 100% digital.
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

        {/* Elemento Decorativo Abstrato */}
        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-125 h-125 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -translate-x-1/3 translate-y-1/3 w-100 h-100 bg-[#d500f9]/10 rounded-full blur-[100px] pointer-events-none" />
      </div>
    </div>
  );
}
