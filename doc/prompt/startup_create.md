# Schema - Página de Cadastro de Startups

## Estrutura de Arquivos
```
src/
├── app/
│   └── dashboard/
│       └── startups/
│           └── nova/
│               └── page.tsx
└── components/
    └── forms/
        └── StartupForm.tsx
```

## 1. page.tsx - Container da Página

### Responsabilidades
- Renderizar o layout da página
- Gerenciar breadcrumbs/navegação
- Passar callbacks para o formulário
- Lidar com sucesso/erro do submit

### Código
```typescript
// src/app/dashboard/startups/nova/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StartupForm from '@/components/forms/StartupForm';
import type { StartupFormData } from '@/types/startup';

export default function NovaStartupPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: StartupFormData) => {
    setIsSubmitting(true);
    
    try {
      // Log dos dados do formulário
      console.log('📊 Dados da Startup:', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      
      // Aqui você faria a chamada à API
      // await api.post('/startups', data);
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Sucesso - redirecionar
      // router.push('/dashboard/startups');
      
    } catch (error) {
      console.error('❌ Erro ao cadastrar startup:', error);
      // Aqui você pode mostrar uma notificação de erro
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="container-elegant layout-clean">
      {/* Breadcrumb */}
      <div className="mb-8">
        <button
          onClick={handleCancel}
          className="btn-ghost"
        >
          <span className="text-lg">←</span>
          Voltar para Dashboard
        </button>
      </div>

      {/* Cabeçalho */}
      <div className="mb-10">
        <h1 className="text-3xl font-display text-primary mb-3 flex items-center gap-4">
          <span className="text-5xl">🚀</span>
          Nova Startup
        </h1>
        <p className="text-secondary text-lg">
          Preencha as informações da sua startup para começar a captar investimentos
        </p>
      </div>

      {/* Formulário */}
      <StartupForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
```

## 2. StartupForm.tsx - Componente do Formulário

### Responsabilidades
- Gerenciar estado do formulário
- Validação de campos
- Buscar dados de países da API
- Upload de arquivos (logo, PDF, vídeo)
- Gerenciar array de redes sociais
- Calcular valuation automaticamente

### Tipos TypeScript
```typescript
// src/types/startup.ts

export interface Country {
  id: number;
  name: string;
  iso3: string;
  iso2: string;
  phone_code: string;
  capital: string;
  currency: string;
  currency_symbol: string;
  tld: string;
  native: string;
  region: string;
  subregion: string;
  timezones: Array<{
    zoneName: string;
    gmtOffset: number;
    gmtOffsetName: string;
    abbreviation: string;
    tzName: string;
  }>;
  translations: {
    kr: string;
    br: string;
    pt: string;
    nl: string;
    hr: string;
    fa: string;
    de: string;
    es: string;
    fr: string;
    ja: string;
    it: string;
    cn: string;
  };
  latitude: string;
  longitude: string;
  emoji: string;
  emojiU: string;
}

export interface RedeSocial {
  id: number;
  nome: string;
  url: string;
}

export interface BancoInfo {
  nome: string;
  agencia: string;
  conta: string;
  tipo: string;
  nome_titular: string;
}

export interface StartupFormData {
  nome: string;
  razao_social: string;
  cnpj: string;
  pais: {
    iso3: string;
    nome: string;
    emoji: string;
  };
  area_atuacao: string;
  estagio: string;
  meta_captacao: number;
  equity_oferecido: number;
  valuation_calculado: number;
  redes: RedeSocial[];
  status: string;
  data_fundacao: string;
  site: string;
  logo_url: string;
  descritivo_basico: string;
  total_captado: number;
  pdf_url: string;
  youtube_url: string;
  banco: BancoInfo;
}
```

### Código do Componente
```typescript
// src/components/forms/StartupForm.tsx

'use client';

import { useState, useEffect } from 'react';
import type { StartupFormData, Country, RedeSocial } from '@/types/startup';

// URL da API de países
const COUNTRIES_API_URL = 'https://api.countrystatecity.in/v1/countries';
// Você precisará de uma API key - substitua aqui
const API_KEY = 'YOUR_API_KEY_HERE';

interface StartupFormProps {
  onSubmit: (data: StartupFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: Partial<StartupFormData>;
}

// Constantes
const AREAS_ATUACAO = [
  'Fintech',
  'Healthtech',
  'Edtech',
  'Agritech',
  'E-commerce',
  'SaaS',
  'Logística',
  'Energia',
  'Marketplace',
  'Inteligência Artificial',
  'Blockchain',
  'IoT',
  'Outro',
];

const ESTAGIOS = [
  'Ideação',
  'MVP',
  'Tração',
  'Crescimento',
  'Escala',
];

const TIPOS_CONTA = [
  'Conta Corrente',
  'Conta Poupança',
  'Conta Digital',
];

const REDES_SOCIAIS_DISPONIVEIS = [
  { nome: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/company/' },
  { nome: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/' },
  { nome: 'Instagram', icon: '📷', placeholder: 'https://instagram.com/' },
  { nome: 'Twitter/X', icon: '🐦', placeholder: 'https://twitter.com/' },
  { nome: 'YouTube', icon: '📹', placeholder: 'https://youtube.com/@' },
  { nome: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@' },
];

export default function StartupForm({
  onSubmit,
  onCancel,
  isSubmitting,
  initialData,
}: StartupFormProps) {
  // Estados
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  
  const [formData, setFormData] = useState<StartupFormData>({
    nome: '',
    razao_social: '',
    cnpj: '',
    pais: {
      iso3: '',
      nome: '',
      emoji: '',
    },
    area_atuacao: '',
    estagio: '',
    meta_captacao: 0,
    equity_oferecido: 0,
    valuation_calculado: 0,
    redes: [],
    status: 'Pendente',
    data_fundacao: '',
    site: '',
    logo_url: '',
    descritivo_basico: '',
    total_captado: 0,
    pdf_url: '',
    youtube_url: '',
    banco: {
      nome: '',
      agencia: '',
      conta: '',
      tipo: '',
      nome_titular: '',
    },
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(1);

  // Buscar países da API
  useEffect(() => {
    fetchCountries();
  }, []);

  const fetchCountries = async () => {
    try {
      const response = await fetch(COUNTRIES_API_URL);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar países');
      }
      
      const data: Country[] = await response.json();
      setCountries(data);
    } catch (error) {
      console.error('Erro ao carregar países:', error);
      // Fallback com alguns países principais
      setCountries([
        {
          id: 1,
          name: 'Brazil',
          iso3: 'BRA',
          iso2: 'BR',
          emoji: '🇧🇷',
          translations: { br: 'Brasil', pt: 'Brasil' },
        } as Country,
      ]);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Calcular valuation automaticamente
  useEffect(() => {
    if (formData.meta_captacao > 0 && formData.equity_oferecido > 0) {
      const valuation = (formData.meta_captacao / formData.equity_oferecido) * 100;
      setFormData(prev => ({
        ...prev,
        valuation_calculado: Math.round(valuation * 100) / 100,
      }));
    }
  }, [formData.meta_captacao, formData.equity_oferecido]);

  // Handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Lidar com campos aninhados (banco.*)
    if (name.startsWith('banco.')) {
      const bancoField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        banco: {
          ...prev.banco,
          [bancoField]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
    // Limpar erro do campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numberValue = parseFloat(value) || 0;
    
    setFormData(prev => ({
      ...prev,
      [name]: numberValue,
    }));
  };

  const handleCountryChange = (iso3: string) => {
    const country = countries.find(c => c.iso3 === iso3);
    
    if (country) {
      setSelectedCountry(country);
      setFormData(prev => ({
        ...prev,
        pais: {
          iso3: country.iso3,
          nome: country.translations?.br || country.translations?.pt || country.name,
          emoji: country.emoji,
        },
      }));
    }
  };

  // Gerenciar Redes Sociais
  const addRedeSocial = () => {
    const newId = formData.redes.length > 0
      ? Math.max(...formData.redes.map(r => r.id)) + 1
      : 1;
    
    setFormData(prev => ({
      ...prev,
      redes: [
        ...prev.redes,
        {
          id: newId,
          nome: '',
          url: '',
        },
      ],
    }));
  };

  const removeRedeSocial = (id: number) => {
    setFormData(prev => ({
      ...prev,
      redes: prev.redes.filter(r => r.id !== id),
    }));
  };

  const updateRedeSocial = (id: number, field: 'nome' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      redes: prev.redes.map(r =>
        r.id === id ? { ...r, [field]: value } : r
      ),
    }));
  };

  // Validação
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.razao_social.trim()) {
      newErrors.razao_social = 'Razão social é obrigatória';
    }

    if (!formData.cnpj.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!/^\d{14}$/.test(formData.cnpj.replace(/\D/g, ''))) {
      newErrors.cnpj = 'CNPJ inválido';
    }

    if (!formData.pais.iso3) {
      newErrors.pais = 'Selecione um país';
    }

    if (!formData.area_atuacao) {
      newErrors.area_atuacao = 'Área de atuação é obrigatória';
    }

    if (!formData.estagio) {
      newErrors.estagio = 'Estágio é obrigatório';
    }

    if (formData.meta_captacao <= 0) {
      newErrors.meta_captacao = 'Meta de captação deve ser maior que zero';
    }

    if (formData.equity_oferecido <= 0 || formData.equity_oferecido > 100) {
      newErrors.equity_oferecido = 'Equity deve estar entre 0 e 100';
    }

    if (!formData.data_fundacao) {
      newErrors.data_fundacao = 'Data de fundação é obrigatória';
    }

    if (!formData.descritivo_basico.trim()) {
      newErrors.descritivo_basico = 'Descrição é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log('❌ Formulário com erros:', errors);
      return;
    }

    onSubmit(formData);
  };

  // Máscaras
  const maskCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);
  };

  const maskMoney = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-lg">
      {/* Progresso */}
      <div className="card-premium padding-comfortable rounded-regular">
        <div className="flex items-center justify-between mb-4">
          <span className="text-secondary text-sm font-semibold">
            Progresso do Cadastro
          </span>
          <span className="text-accent text-sm font-bold">
            Etapa {currentStep} de 4
          </span>
        </div>
        <div className="h-2 bg-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-primary transition-elegant"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Etapa 1: Informações Básicas */}
      <section className="card-premium padding-comfortable rounded-regular">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-divider">
          <span className="text-4xl">📋</span>
          <div>
            <h2 className="text-2xl font-display text-primary">Informações Básicas</h2>
            <p className="text-secondary text-sm">Dados fundamentais da startup</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome Fantasia */}
          <div className="md:col-span-2">
            <label className="block text-secondary text-sm font-semibold mb-2">
              Nome Fantasia <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              placeholder="Ex: TechStart Inovações"
              className={`input-premium w-full ${
                errors.nome ? 'border-red-500' : 'border-subtle'
              }`}
            />
            {errors.nome && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.nome}
              </p>
            )}
          </div>

          {/* Razão Social */}
          <div className="md:col-span-2">
            <label className="block text-secondary text-sm font-semibold mb-2">
              Razão Social <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="razao_social"
              value={formData.razao_social}
              onChange={handleInputChange}
              placeholder="Ex: TechStart Inovações Ltda"
              className={`input-premium w-full ${
                errors.razao_social ? 'border-red-500' : 'border-subtle'
              }`}
            />
            {errors.razao_social && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.razao_social}
              </p>
            )}
          </div>

          {/* CNPJ */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              CNPJ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="cnpj"
              value={maskCNPJ(formData.cnpj)}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/\D/g, '');
                handleInputChange({
                  ...e,
                  target: { ...e.target, value: cleaned },
                });
              }}
              placeholder="00.000.000/0000-00"
              maxLength={18}
              className={`input-premium w-full ${
                errors.cnpj ? 'border-red-500' : 'border-subtle'
              }`}
            />
            {errors.cnpj && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.cnpj}
              </p>
            )}
          </div>

          {/* País */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              País <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.pais.iso3}
              onChange={(e) => handleCountryChange(e.target.value)}
              disabled={loadingCountries}
              className={`input-premium w-full appearance-none cursor-pointer ${
                errors.pais ? 'border-red-500' : 'border-subtle'
              }`}
            >
              <option value="">
                {loadingCountries ? 'Carregando países...' : 'Selecione um país'}
              </option>
              {countries.map((country) => (
                <option key={country.iso3} value={country.iso3}>
                  {country.emoji} {country.translations?.br || country.translations?.pt || country.name}
                </option>
              ))}
            </select>
            {errors.pais && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.pais}
              </p>
            )}
            {selectedCountry && (
              <p className="text-muted text-xs mt-1">
                Região: {selectedCountry.region} • Moeda: {selectedCountry.currency_symbol} {selectedCountry.currency}
              </p>
            )}
          </div>

          {/* Área de Atuação */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Área de Atuação <span className="text-red-500">*</span>
            </label>
            <select
              name="area_atuacao"
              value={formData.area_atuacao}
              onChange={handleInputChange}
              className={`input-premium w-full appearance-none cursor-pointer ${
                errors.area_atuacao ? 'border-red-500' : 'border-subtle'
              }`}
            >
              <option value="">Selecione uma área</option>
              {AREAS_ATUACAO.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            {errors.area_atuacao && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.area_atuacao}
              </p>
            )}
          </div>

          {/* Estágio */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Estágio <span className="text-red-500">*</span>
            </label>
            <select
              name="estagio"
              value={formData.estagio}
              onChange={handleInputChange}
              className={`input-premium w-full appearance-none cursor-pointer ${
                errors.estagio ? 'border-red-500' : 'border-subtle'
              }`}
            >
              <option value="">Selecione um estágio</option>
              {ESTAGIOS.map((estagio) => (
                <option key={estagio} value={estagio}>
                  {estagio}
                </option>
              ))}
            </select>
            {errors.estagio && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.estagio}
              </p>
            )}
          </div>

          {/* Data de Fundação */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Data de Fundação <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="data_fundacao"
              value={formData.data_fundacao}
              onChange={handleInputChange}
              max={new Date().toISOString().split('T')[0]}
              className={`input-premium w-full ${
                errors.data_fundacao ? 'border-red-500' : 'border-subtle'
              }`}
            />
            {errors.data_fundacao && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.data_fundacao}
              </p>
            )}
          </div>

          {/* Site */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Website
            </label>
            <input
              type="url"
              name="site"
              value={formData.site}
              onChange={handleInputChange}
              placeholder="https://seusite.com.br"
              className="input-premium w-full"
            />
          </div>

          {/* Descrição */}
          <div className="md:col-span-2">
            <label className="block text-secondary text-sm font-semibold mb-2">
              Descrição Básica <span className="text-red-500">*</span>
            </label>
            <textarea
              name="descritivo_basico"
              value={formData.descritivo_basico}
              onChange={handleInputChange}
              placeholder="Descreva sua startup em poucas palavras..."
              rows={4}
              className={`input-premium w-full resize-none ${
                errors.descritivo_basico ? 'border-red-500' : 'border-subtle'
              }`}
            />
            <div className="flex justify-between items-center mt-1">
              {errors.descritivo_basico && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <span>⚠️</span> {errors.descritivo_basico}
                </p>
              )}
              <p className="text-muted text-xs ml-auto">
                {formData.descritivo_basico.length} caracteres
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Etapa 2: Captação e Valuation */}
      <section className="card-premium padding-comfortable rounded-regular">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-divider">
          <span className="text-4xl">💰</span>
          <div>
            <h2 className="text-2xl font-display text-primary">Captação e Valuation</h2>
            <p className="text-secondary text-sm">Defina os valores de investimento</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meta de Captação */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Meta de Captação (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="meta_captacao"
              value={formData.meta_captacao || ''}
              onChange={handleNumberChange}
              placeholder="500000"
              min="0"
              step="1000"
              className={`input-premium w-full ${
                errors.meta_captacao ? 'border-red-500' : 'border-subtle'
              }`}
            />
            {formData.meta_captacao > 0 && (
              <p className="text-muted text-xs mt-1">
                {maskMoney(formData.meta_captacao)}
              </p>
            )}
            {errors.meta_captacao && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.meta_captacao}
              </p>
            )}
          </div>

          {/* Equity Oferecido */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Equity Oferecido (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="equity_oferecido"
              value={formData.equity_oferecido || ''}
              onChange={handleNumberChange}
              placeholder="15"
              min="0"
              max="100"
              step="0.1"
              className={`input-premium w-full ${
                errors.equity_oferecido ? 'border-red-500' : 'border-subtle'
              }`}
            />
            {errors.equity_oferecido && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span> {errors.equity_oferecido}
              </p>
            )}
          </div>

          {/* Valuation Calculado */}
          <div className="md:col-span-2">
            <div className="bg-accent-primary border border-accent-active rounded-smooth p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-sm font-semibold mb-1">
                    Valuation Calculado
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {formData.valuation_calculado > 0
                      ? maskMoney(formData.valuation_calculado)
                      : 'R$ 0,00'}
                  </p>
                </div>
                <span className="text-5xl">📊</span>
              </div>
              <p className="text-muted text-xs mt-3">
                Calculado automaticamente: Meta de Captação ÷ Equity Oferecido × 100
              </p>
            </div>
          </div>

          {/* Total Captado (Informativo) */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Total Captado até o momento (R$)
            </label>
            <input
              type="number"
              name="total_captado"
              value={formData.total_captado || ''}
              onChange={handleNumberChange}
              placeholder="0"
              min="0"
              step="1000"
              className="input-premium w-full"
            />
            {formData.total_captado > 0 && (
              <p className="text-muted text-xs mt-1">
                {maskMoney(formData.total_captado)} (
                {((formData.total_captado / formData.meta_captacao) * 100).toFixed(1)}% da meta)
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Etapa 3: Mídias e Redes Sociais */}
      <section className="card-premium padding-comfortable rounded-regular">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-divider">
          <span className="text-4xl">🌐</span>
          <div>
            <h2 className="text-2xl font-display text-primary">Mídias e Redes Sociais</h2>
            <p className="text-secondary text-sm">Adicione links e materiais</p>
          </div>
        </div>

        <div className="space-y-md">
          {/* Logo URL */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              URL do Logo
            </label>
            <input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleInputChange}
              placeholder="https://cdn.exemplo.com/logo.png"
              className="input-premium w-full"
            />
            <p className="text-muted text-xs mt-1">
              💡 Recomendado: PNG transparente, tamanho mínimo 400x400px
            </p>
          </div>

          {/* PDF URL */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Pitch Deck / Apresentação (PDF)
            </label>
            <input
              type="url"
              name="pdf_url"
              value={formData.pdf_url}
              onChange={handleInputChange}
              placeholder="https://cdn.exemplo.com/pitch.pdf"
              className="input-premium w-full"
            />
          </div>

          {/* YouTube URL */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Vídeo de Apresentação (YouTube)
            </label>
            <input
              type="url"
              name="youtube_url"
              value={formData.youtube_url}
              onChange={handleInputChange}
              placeholder="https://www.youtube.com/watch?v=..."
              className="input-premium w-full"
            />
          </div>

          {/* Redes Sociais */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-secondary text-sm font-semibold">
                Redes Sociais
              </label>
              <button
                type="button"
                onClick={addRedeSocial}
                className="btn-secondary"
              >
                <span className="text-lg">+</span>
                Adicionar Rede
              </button>
            </div>

            {formData.redes.length === 0 ? (
              <div className="bg-secondary border-2 border-dashed border-subtle rounded-smooth padding-comfortable text-center">
                <p className="text-muted text-sm">
                  Nenhuma rede social adicionada. Clique em "Adicionar Rede" para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-sm">
                {formData.redes.map((rede) => {
                  const redeConfig = REDES_SOCIAIS_DISPONIVEIS.find(
                    r => r.nome === rede.nome
                  );
                  
                  return (
                    <div
                      key={rede.id}
                      className="bg-secondary border border-subtle rounded-regular p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-3 items-center">
                        {/* Select da Rede */}
                        <select
                          value={rede.nome}
                          onChange={(e) => updateRedeSocial(rede.id, 'nome', e.target.value)}
                          className="input-premium h-10 appearance-none cursor-pointer"
                        >
                          <option value="">Selecione</option>
                          {REDES_SOCIAIS_DISPONIVEIS.map((r) => (
                            <option key={r.nome} value={r.nome}>
                              {r.icon} {r.nome}
                            </option>
                          ))}
                        </select>

                        {/* Input da URL */}
                        <div className="relative">
                          {redeConfig && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">
                              {redeConfig.icon}
                            </span>
                          )}
                          <input
                            type="url"
                            value={rede.url}
                            onChange={(e) => updateRedeSocial(rede.id, 'url', e.target.value)}
                            placeholder={redeConfig?.placeholder || 'https://...'}
                            className="input-premium w-full h-10 pl-12"
                          />
                        </div>

                        {/* Botão Remover */}
                        <button
                          type="button"
                          onClick={() => removeRedeSocial(rede.id)}
                          className="btn-ghost h-10 w-10 flex items-center justify-center"
                          title="Remover"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Etapa 4: Dados Bancários */}
      <section className="card-premium padding-comfortable rounded-regular">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-divider">
          <span className="text-4xl">🏦</span>
          <div>
            <h2 className="text-2xl font-display text-primary">Dados Bancários</h2>
            <p className="text-secondary text-sm">Para recebimento dos investimentos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome do Banco */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Nome do Banco
            </label>
            <input
              type="text"
              name="banco.nome"
              value={formData.banco.nome}
              onChange={handleInputChange}
              placeholder="Ex: Banco do Brasil"
              className="input-premium w-full"
            />
          </div>

          {/* Tipo de Conta */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Tipo de Conta
            </label>
            <select
              name="banco.tipo"
              value={formData.banco.tipo}
              onChange={handleInputChange}
              className="input-premium w-full appearance-none cursor-pointer"
            >
              <option value="">Selecione</option>
              {TIPOS_CONTA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Agência */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Agência
            </label>
            <input
              type="text"
              name="banco.agencia"
              value={formData.banco.agencia}
              onChange={handleInputChange}
              placeholder="1234"
              className="input-premium w-full"
            />
          </div>

          {/* Conta */}
          <div>
            <label className="block text-secondary text-sm font-semibold mb-2">
              Conta
            </label>
            <input
              type="text"
              name="banco.conta"
              value={formData.banco.conta}
              onChange={handleInputChange}
              placeholder="123456-7"
              className="input-premium w-full"
            />
          </div>

          {/* Nome do Titular */}
          <div className="md:col-span-2">
            <label className="block text-secondary text-sm font-semibold mb-2">
              Nome do Titular
            </label>
            <input
              type="text"
              name="banco.nome_titular"
              value={formData.banco.nome_titular}
              onChange={handleInputChange}
              placeholder="Nome completo ou razão social"
              className="input-premium w-full"
            />
          </div>
        </div>
      </section>

      {/* Botões de Ação */}
      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn-cancel"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-success"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin">⏳</span>
              Cadastrando...
            </>
          ) : (
            <>
              <span>✅</span>
              Cadastrar Startup
            </>
          )}
        </button>
      </div>
    </form>
  );
}
```

## 3. Observações Importantes

### API de Países
- URL: `/api/location/countries`


### Validações Implementadas
- ✅ Campos obrigatórios
- ✅ Validação de CNPJ
- ✅ Validação de URLs
- ✅ Validação de datas
- ✅ Validação de porcentagem (equity)
- ✅ Validação de valores monetários

### Máscaras
- ✅ CNPJ: 00.000.000/0000-00
- ✅ Valores monetários: R$ 0.000,00
- ✅ Porcentagem: 0% - 100%

### Funcionalidades Dinâmicas
- ✅ Cálculo automático de valuation
- ✅ Adicionar/remover redes sociais
- ✅ Select de países com busca
- ✅ Preview de valores formatados
- ✅ Informações contextuais do país selecionado

### Estados do Formulário
- ✅ Loading (carregando países)
- ✅ Submitting (enviando formulário)
- ✅ Errors (validações)
- ✅ Success (após submit)

Este schema está pronto para ser implementado e pode ser facilmente adaptado conforme necessário! 🚀