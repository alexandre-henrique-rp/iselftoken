import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  ArrowRight, 
  CheckCircle, 
  Shield, 
  Eye, 
  EyeOff, 
  Globe,
  Check,
  X
} from 'lucide-react';

// ============================================
// COMPONENTES UI
// ============================================

const InputPremium = ({ label, icon: Icon, type = "text", placeholder, id, value, onChange, error }) => {
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
          value={value}
          onChange={onChange}
          className={`
            w-full bg-stone-900 border text-stone-100 rounded-lg 
            ${Icon ? 'pl-10' : 'pl-4'} ${isPassword ? 'pr-10' : 'pr-4'} py-3
            placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 
            transition-all duration-200
            ${error ? 'border-red-500/50 focus:border-red-500' : 'border-stone-800 focus:border-blue-600'}
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
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
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

const CheckboxPremium = ({ id, label, checked, onChange }) => (
  <div className="flex items-start gap-3">
    <div className="relative flex items-center">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-stone-700 bg-stone-900 checked:border-blue-600 checked:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 transition-all"
      />
      <Check className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
    </div>
    <label htmlFor={id} className="text-sm text-stone-400 cursor-pointer select-none leading-tight">
      {label}
    </label>
  </div>
);

const PasswordRequirement = ({ met, text }) => (
  <div className={`flex items-center gap-2 text-xs transition-colors duration-300 ${met ? 'text-green-400' : 'text-stone-500'}`}>
    {met ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-stone-700" />}
    <span>{text}</span>
  </div>
);

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    terms: false,
    privacy: false
  });

  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });

  // Validação de Senha em Tempo Real
  useEffect(() => {
    const pwd = formData.password;
    setPasswordStrength({
      length: pwd.length >= 12,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[^A-Za-z0-9]/.test(pwd)
    });
  }, [formData.password]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePhoneChange = (e) => {
    // Máscara Simples de Telefone
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    setFormData(prev => ({ ...prev, phone: value }));
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-stone-950 font-sans">
      
      {/* ==================== COLUNA ESQUERDA (FORMULÁRIO) ==================== */}
      <div className="flex flex-col p-8 md:p-12 relative z-10 overflow-y-auto max-h-screen">
        
        {/* Header Mobile / Logo */}
        <div className="flex justify-between items-center lg:justify-start mb-8 lg:mb-12">
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

        {/* Container Centralizado do Form */}
        <div className="mx-auto w-full max-w-110">
          <div className="text-center lg:text-left mb-8">
            <h1 className="text-3xl font-bold text-stone-50 mb-3 tracking-tight">
              Criar conta
            </h1>
            <p className="text-stone-400">
              Junte-se a milhares de investidores e fundadores.
            </p>
          </div>

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {/* Nome Completo */}
            <InputPremium 
              id="name" 
              label="Nome Completo" 
              placeholder="Seu nome" 
              icon={User}
              value={formData.name}
              onChange={handleChange}
            />

            {/* E-mail */}
            <InputPremium 
              id="email" 
              type="email" 
              label="E-mail" 
              placeholder="exemplo@iselftoken.com" 
              icon={Mail}
              value={formData.email}
              onChange={handleChange}
            />

            {/* Telefone */}
            <InputPremium 
              id="phone" 
              type="tel" 
              label="Telefone" 
              placeholder="(11) 9 9999-9999" 
              icon={Phone}
              value={formData.phone}
              onChange={handlePhoneChange}
            />
            
            {/* Senha */}
            <div className="space-y-3">
              <InputPremium 
                id="password" 
                type="password" 
                label="Senha" 
                placeholder="Crie uma senha forte" 
                icon={Lock}
                value={formData.password}
                onChange={handleChange}
              />
              
              {/* Indicador de Força de Senha */}
              <div className="bg-stone-900/50 p-3 rounded-lg border border-stone-800/50 space-y-2">
                <p className="text-xs font-semibold text-stone-400 mb-2">Requisitos da senha:</p>
                <div className="grid grid-cols-2 gap-2">
                  <PasswordRequirement met={passwordStrength.length} text="12+ caracteres" />
                  <PasswordRequirement met={passwordStrength.uppercase} text="Maiúscula (A-Z)" />
                  <PasswordRequirement met={passwordStrength.lowercase} text="Minúscula (a-z)" />
                  <PasswordRequirement met={passwordStrength.number} text="Número (0-9)" />
                  <PasswordRequirement met={passwordStrength.special} text="Especial (!@#)" />
                </div>
              </div>
            </div>

            {/* Confirmar Senha */}
            <InputPremium 
              id="confirmPassword" 
              type="password" 
              label="Confirmar Senha" 
              placeholder="Repita sua senha" 
              icon={Lock}
              value={formData.confirmPassword}
              onChange={handleChange}
              error={formData.confirmPassword && formData.password !== formData.confirmPassword ? "As senhas não coincidem" : ""}
            />

            {/* Checkboxes */}
            <div className="space-y-4 pt-2">
              <CheckboxPremium 
                id="terms" 
                checked={formData.terms}
                onChange={handleChange}
                label={
                  <>
                    Li e aceito os <a href="#" className="text-blue-400 hover:underline">Termos de Uso</a> da plataforma.
                  </>
                } 
              />
              <CheckboxPremium 
                id="privacy" 
                checked={formData.privacy}
                onChange={handleChange}
                label={
                  <>
                    Concordo com a <a href="#" className="text-blue-400 hover:underline">Política de Privacidade</a>.
                  </>
                } 
              />
            </div>

            <ButtonPremium type="submit" variant="primary" className="mt-4">
              Criar conta
              <ArrowRight className="w-4 h-4" />
            </ButtonPremium>

            <p className="text-center text-sm text-stone-400 pt-4">
              Já tem uma conta?{" "}
              <a href="/login" className="text-blue-500 font-semibold hover:text-blue-400 transition-colors">
                Entrar
              </a>
            </p>
          </form>
        </div>
        
        {/* Espaçador Footer */}
        <div className="h-8 lg:h-0"></div>
      </div>

      {/* ==================== COLUNA DIREITA (HERO IMAGE) ==================== */}
      <div className="hidden lg:block bg-stone-900 border-l border-stone-800 overflow-hidden h-screen sticky top-0">
        {/* Imagem de Fundo (Business Theme) */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop"
            alt="Investimento Corporativo"
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
              Cadastro Gratuito
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-6 leading-tight max-w-lg">
            Comece a investir no futuro da inovação hoje mesmo
          </h2>
          
          <p className="text-stone-300 text-lg mb-10 max-w-md leading-relaxed">
            Tenha acesso exclusivo a rodadas de investimento em startups de alto potencial com segurança jurídica e tecnologia blockchain.
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
