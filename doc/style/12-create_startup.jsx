import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle, 
  DollarSign, 
  Globe, 
  Linkedin, 
  Youtube, 
  Instagram, 
  Twitter,
  Building, 
  Briefcase, 
  FileText, 
  Banknote,
  LayoutDashboard,
  Loader2,
  X
} from 'lucide-react';

// ============================================
// COMPONENTES UI (DESIGN SYSTEM)
// ============================================

const InputLabel = ({ label, required, tooltip }) => (
  <div className="flex items-center gap-2 mb-1.5">
    <label className="block text-sm font-medium text-stone-400">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    {tooltip && (
      <div className="group relative">
        <AlertCircle className="w-3.5 h-3.5 text-stone-600 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-stone-800 text-xs text-stone-300 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-stone-700">
          {tooltip}
        </div>
      </div>
    )}
  </div>
);

const InputField = ({ icon: Icon, rightElement, className = "", error, ...props }) => (
  <div className="relative group">
    {Icon && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-blue-400 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
    )}
    <input
      className={`
        w-full bg-stone-950 border text-stone-100 rounded-lg 
        ${Icon ? 'pl-10' : 'pl-4'} ${rightElement ? 'pr-12' : 'pr-4'} py-2.5
        placeholder:text-stone-600 
        focus:outline-none focus:ring-2 focus:ring-blue-600/50 
        transition-all text-sm shadow-inner
        ${error ? 'border-red-500/50 focus:border-red-500' : 'border-stone-800 focus:border-blue-600'}
        ${className}
      `}
      {...props}
    />
    {rightElement && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">
        {rightElement}
      </div>
    )}
    {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
  </div>
);

const SelectField = ({ options, icon: Icon, ...props }) => (
  <div className="relative group">
    {Icon && (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 group-focus-within:text-blue-400 transition-colors">
        <Icon className="w-4 h-4" />
      </div>
    )}
    <select
      className={`
        w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg 
        ${Icon ? 'pl-10' : 'pl-4'} pr-10 py-2.5 
        focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 
        appearance-none text-sm cursor-pointer shadow-inner
      `}
      {...props}
    >
      {options.map((opt, i) => (
        <option key={i} value={opt.value} className="bg-stone-900">{opt.label}</option>
      ))}
    </select>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
      <svg className="w-4 h-4 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
    </div>
  </div>
);

const TextArea = ({ rows = 4, ...props }) => (
  <textarea
    className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg p-4 placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-sm shadow-inner resize-none"
    rows={rows}
    {...props}
  />
);

const FileUpload = ({ label, acceptedTypes, onFileSelect, initialFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(initialFile || null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file) => {
    setFile(file);
    if (onFileSelect) onFileSelect(file);
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
    if (onFileSelect) onFileSelect(null);
  };

  return (
    <div className="w-full">
      {file ? (
        <div className="flex items-center justify-between p-4 bg-stone-950 border border-stone-800 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-200">{file.name}</p>
              <p className="text-xs text-stone-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
          </div>
          <button 
            onClick={removeFile} 
            className="p-2 hover:bg-stone-900 rounded-lg text-stone-500 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div 
          className={`
            border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-stone-800 hover:border-stone-600 bg-stone-950'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={inputRef} 
            className="hidden" 
            accept={acceptedTypes}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="w-12 h-12 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-800">
            <Upload className="w-6 h-6 text-stone-400" />
          </div>
          <p className="text-stone-300 font-medium mb-1">{label}</p>
          <p className="text-xs text-stone-500">Arraste ou clique para selecionar</p>
          <p className="text-xs text-stone-600 mt-2 uppercase">{acceptedTypes.replace(/,/g, ', ')} • Max 10MB</p>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMPONENTE: STEPPER
// ============================================

const StepIndicator = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-between w-full mb-8 px-4">
      {steps.map((step, index) => {
        const isActive = index + 1 === currentStep;
        const isCompleted = index + 1 < currentStep;

        return (
          <div key={index} className="flex-1 flex items-center relative">
            <div className="flex flex-col items-center relative z-10 group">
              <div 
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                  ${isActive ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/50 scale-110' : 
                    isCompleted ? 'bg-stone-800 border-green-500 text-green-500' : 
                    'bg-stone-900 border-stone-800 text-stone-600'}
                `}
              >
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
              </div>
              <span 
                className={`
                  absolute top-12 text-xs font-medium whitespace-nowrap transition-colors duration-300
                  ${isActive ? 'text-blue-400' : isCompleted ? 'text-stone-400' : 'text-stone-600'}
                `}
              >
                {step.label}
              </span>
            </div>
            
            {/* Linha conectora */}
            {index !== steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-4 bg-stone-800 relative">
                <div 
                  className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-500"
                  style={{ width: isCompleted ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// PÁGINA PRINCIPAL
// ============================================

export default function CreateStartupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Passo 1
    fantasyName: '',
    legalName: '',
    cnpj: '',
    country: 'br',
    segment: '',
    stage: 'idea',
    foundationDate: '',
    website: '',
    description: '',
    // Passo 2 (Antigo 3)
    logoUrl: '',
    pitchDeckFile: null, // Alterado de pitchDeckUrl para pitchDeckFile
    videoUrl: '',
    socials: [{ network: 'linkedin', url: '' }],
    // Passo 3 (Antigo 4)
    bankName: '',
    agency: '',
    accountNumber: '',
    accountType: 'checking',
    accountHolder: '',
    // Passo 4 (Antigo 2)
    targetAmount: '',
    equityPercentage: '',
    valuation: 0,
  });

  // Cálculo automático de Valuation
  useEffect(() => {
    const amount = parseFloat(formData.targetAmount) || 0;
    const equity = parseFloat(formData.equityPercentage) || 0;
    if (amount > 0 && equity > 0) {
      const val = amount / (equity / 100);
      setFormData(prev => ({ ...prev, valuation: val }));
    } else {
      setFormData(prev => ({ ...prev, valuation: 0 }));
    }
  }, [formData.targetAmount, formData.equityPercentage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (index, field, value) => {
    const newSocials = [...formData.socials];
    newSocials[index][field] = value;
    setFormData(prev => ({ ...prev, socials: newSocials }));
  };

  const addSocial = () => {
    setFormData(prev => ({ ...prev, socials: [...prev.socials, { network: 'linkedin', url: '' }] }));
  };

  const removeSocial = (index) => {
    const newSocials = formData.socials.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, socials: newSocials }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    // Simulação de API
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    alert('Startup criada com sucesso!');
    // Redirecionar...
  };

  // Reordenação das Etapas: 
  // 1. Info -> 2. Mídias -> 3. Bancário -> 4. Captação (Banknote)
  const steps = [
    { label: 'Informações Básicas', icon: Building },
    { label: 'Mídias e Redes', icon: Globe },
    { label: 'Dados Bancários', icon: Briefcase },
    { label: 'Captação & Valuation', icon: Banknote },
  ];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-50 p-6 lg:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <a href="/dashboard/startups" className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors mb-4 text-sm">
            <ChevronLeft className="w-4 h-4" />
            Voltar para Dashboard
          </a>
          <h1 className="text-3xl font-bold text-stone-50 tracking-tight">Nova Startup</h1>
          <p className="text-stone-400 mt-1">Preencha as informações para submeter seu projeto à curadoria.</p>
        </div>

        {/* Stepper */}
        <div className="mb-12">
          <StepIndicator currentStep={currentStep} steps={steps} />
        </div>

        {/* Conteúdo do Formulário */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 md:p-8 shadow-xl">
          
          {/* ETAPA 1: BÁSICO */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <InputLabel label="Nome Fantasia" required />
                  <InputField 
                    name="fantasyName" 
                    value={formData.fantasyName} 
                    onChange={handleChange} 
                    placeholder="Nome comercial da startup" 
                    icon={Building}
                  />
                </div>
                <div>
                  <InputLabel label="Razão Social" required />
                  <InputField 
                    name="legalName" 
                    value={formData.legalName} 
                    onChange={handleChange} 
                    placeholder="Nome jurídico" 
                  />
                </div>
                <div>
                  <InputLabel label="CNPJ" required />
                  <InputField 
                    name="cnpj" 
                    value={formData.cnpj} 
                    onChange={handleChange} 
                    placeholder="00.000.000/0000-00" 
                  />
                </div>
                <div>
                  <InputLabel label="País Sede" required />
                  <SelectField 
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    icon={Globe}
                    options={[
                      { label: 'Brasil', value: 'br' },
                      { label: 'Estados Unidos', value: 'us' },
                      { label: 'Portugal', value: 'pt' }
                    ]} 
                  />
                </div>
                <div>
                  <InputLabel label="Área de Atuação" required />
                  <SelectField 
                    name="segment"
                    value={formData.segment}
                    onChange={handleChange}
                    options={[
                      { label: 'Selecione...', value: '' },
                      { label: 'FinTech', value: 'fintech' },
                      { label: 'AgTech', value: 'agtech' },
                      { label: 'HealthTech', value: 'healthtech' },
                      { label: 'EdTech', value: 'edtech' },
                      { label: 'SaaS', value: 'saas' }
                    ]} 
                  />
                </div>
                <div>
                  <InputLabel label="Estágio" required />
                  <SelectField 
                    name="stage"
                    value={formData.stage}
                    onChange={handleChange}
                    options={[
                      { label: 'Ideação (Pré-operacional)', value: 'idea' },
                      { label: 'MVP (Produto Mínimo Viável)', value: 'mvp' },
                      { label: 'Tração (Crescimento inicial)', value: 'traction' },
                      { label: 'Scale-up (Expansão)', value: 'scaleup' }
                    ]} 
                  />
                </div>
                <div>
                  <InputLabel label="Data de Fundação" required />
                  <InputField 
                    name="foundationDate" 
                    type="date"
                    value={formData.foundationDate} 
                    onChange={handleChange} 
                  />
                </div>
                <div>
                  <InputLabel label="Website" />
                  <InputField 
                    name="website" 
                    value={formData.website} 
                    onChange={handleChange} 
                    placeholder="https://..." 
                    icon={Globe}
                  />
                </div>
                <div className="md:col-span-2">
                  <InputLabel label="Descrição Curta (Pitch)" required tooltip="Um resumo atrativo do seu negócio em até 200 caracteres." />
                  <TextArea 
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Descreva o problema que sua startup resolve e sua solução..." 
                    maxLength={500}
                  />
                  <p className="text-right text-xs text-stone-500 mt-1">{formData.description.length}/500</p>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: MÍDIAS (Antiga 3) */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <InputLabel label="URL do Logotipo" required />
                  <InputField 
                    name="logoUrl" 
                    value={formData.logoUrl} 
                    onChange={handleChange} 
                    placeholder="https://..." 
                    icon={Upload}
                  />
                </div>
                <div>
                  <InputLabel label="Pitch Deck (PDF)" required />
                  <FileUpload 
                    label="Carregar Pitch Deck"
                    acceptedTypes=".pdf"
                    initialFile={formData.pitchDeckFile}
                    onFileSelect={(file) => setFormData(prev => ({ ...prev, pitchDeckFile: file }))}
                  />
                </div>
                <div>
                  <InputLabel label="Vídeo de Apresentação (YouTube)" />
                  <InputField 
                    name="videoUrl" 
                    value={formData.videoUrl} 
                    onChange={handleChange} 
                    placeholder="https://youtube.com/..." 
                    icon={Youtube}
                  />
                </div>
              </div>

              <div className="border-t border-stone-800 pt-6">
                <InputLabel label="Redes Sociais" />
                <div className="space-y-3">
                  {formData.socials.map((social, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-1/3">
                        <SelectField
                          value={social.network}
                          onChange={(e) => handleSocialChange(index, 'network', e.target.value)}
                          options={[
                            { label: 'LinkedIn', value: 'linkedin' },
                            { label: 'Instagram', value: 'instagram' },
                            { label: 'Twitter / X', value: 'twitter' },
                            { label: 'Website', value: 'website' }
                          ]}
                        />
                      </div>
                      <div className="flex-1">
                        <InputField
                          value={social.url}
                          onChange={(e) => handleSocialChange(index, 'url', e.target.value)}
                          placeholder="URL do perfil"
                        />
                      </div>
                      {formData.socials.length > 1 && (
                        <button 
                          onClick={() => removeSocial(index)}
                          className="p-2.5 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button 
                    onClick={addSocial}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium mt-2"
                  >
                    <Plus className="w-4 h-4" /> Adicionar outra rede
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 3: BANCÁRIO (Antiga 4) */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="bg-stone-950 p-4 rounded-lg border border-stone-800 mb-6">
                <p className="text-stone-400 text-sm">
                  Informe a conta bancária da Pessoa Jurídica (PJ) onde os recursos captados serão depositados.
                  A conta deve ter o mesmo CNPJ informado na etapa 1.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3">
                  <InputLabel label="Titular da Conta" required />
                  <InputField 
                    name="accountHolder" 
                    value={formData.accountHolder} 
                    onChange={handleChange} 
                    placeholder="Razão Social da Empresa" 
                  />
                </div>
                <div>
                  <InputLabel label="Banco" required />
                  <InputField 
                    name="bankName" 
                    value={formData.bankName} 
                    onChange={handleChange} 
                    placeholder="Ex: 001 - Banco do Brasil" 
                  />
                </div>
                <div>
                  <InputLabel label="Agência" required />
                  <InputField 
                    name="agency" 
                    value={formData.agency} 
                    onChange={handleChange} 
                    placeholder="0000" 
                  />
                </div>
                <div>
                  <InputLabel label="Conta Corrente" required />
                  <InputField 
                    name="accountNumber" 
                    value={formData.accountNumber} 
                    onChange={handleChange} 
                    placeholder="00000-0" 
                  />
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: CAPTAÇÃO (Antiga 2) */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-6">
                  <div>
                    <InputLabel label="Meta de Captação" required tooltip="Valor total que deseja levantar nesta rodada." />
                    <InputField 
                      name="targetAmount" 
                      type="number"
                      value={formData.targetAmount} 
                      onChange={handleChange} 
                      placeholder="0,00" 
                      icon={DollarSign}
                    />
                  </div>
                  <div>
                    <InputLabel label="Equity Oferecido (%)" required tooltip="Porcentagem da empresa que será cedida aos investidores." />
                    <div className="relative">
                      <InputField 
                        name="equityPercentage" 
                        type="number"
                        value={formData.equityPercentage} 
                        onChange={handleChange} 
                        placeholder="Ex: 10" 
                        rightElement="%"
                      />
                    </div>
                  </div>
                </div>

                {/* Card de Valuation Calculado */}
                <div className="bg-stone-950 rounded-xl p-6 border border-stone-800 flex flex-col items-center justify-center text-center h-full">
                  <p className="text-stone-400 text-sm mb-2 uppercase font-semibold tracking-wider">Valuation Pré-Money Estimado</p>
                  <div className="text-4xl font-bold text-blue-400 mb-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.valuation)}
                  </div>
                  <p className="text-xs text-stone-500 max-w-xs">
                    Cálculo automático baseado na meta ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.targetAmount || 0)}) 
                    dividido pelo equity ({formData.equityPercentage || 0}%).
                  </p>
                </div>
              </div>

              <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-400 font-medium text-sm">Importante sobre Valuation</h4>
                  <p className="text-blue-300/80 text-xs mt-1 leading-relaxed">
                    O valuation final pode sofrer ajustes durante o processo de due diligence e análise da curadoria da plataforma.
                    Certifique-se de que os valores inseridos são realistas e baseados em métricas de mercado.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-stone-800">
            {currentStep > 1 ? (
              <button 
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="flex items-center gap-2 px-6 py-2.5 text-stone-400 hover:text-stone-200 font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Voltar
              </button>
            ) : (
              <div /> /* Espaçador */
            )}

            {currentStep < 4 ? (
              <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-900/20"
              >
                Próximo <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Salvar e Criar
                  </>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
