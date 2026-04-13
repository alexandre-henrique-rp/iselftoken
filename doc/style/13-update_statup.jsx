import React, { useState, useEffect } from 'react';
import { 
  Save, X, Upload, Globe, DollarSign, Users, 
  Settings, MapPin, FileText, CheckCircle, 
  AlertCircle, Plus, Trash2, PieChart, Briefcase,
  ChevronLeft, Loader2, Building, Banknote, Sparkles,
  BrainCircuit, ThumbsUp, ThumbsDown, Star
} from 'lucide-react';

// ============================================
// GEMINI API CONFIGURATION
// ============================================
const apiKey = ""; // Provided by execution environment

// ============================================
// MOCK DATA (Estado Inicial)
// ============================================

const initialData = {
  id: '1',
  status: 'approved',
  identity: {
    fantasyName: 'FinFlow',
    legalName: 'FinFlow Tecnologia Ltda',
    cnpj: '12.345.678/0001-90',
    foundationDate: '2023-05-10',
    segment: 'FinTech',
    logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop'
  },
  description: {
    problem: 'PMEs perdem 20h/mês com gestão financeira manual.',
    solution: 'Plataforma automatizada com IA generativa.',
    differential: 'Integração nativa com 50 bancos e UX simplificado.',
    revenueModel: 'SaaS B2B recorrente.'
  },
  location: {
    iso3: 'BRA',
    name: 'Brasil',
    emoji: '🇧🇷'
  },
  financial: {
    targetAmount: 840000,
    equityPercentage: 15,
    minTicket: 100,
    allocation: {
      development: 40,
      marketing: 30,
      operations: 20,
      legal: 10
    }
  },
  team: {
    partners: [
      { id: 1, name: 'Ricardo Mendes', role: 'CEO', equity: 60 },
      { id: 2, name: 'Ana Silva', role: 'CTO', equity: 40 }
    ],
    members: [
      { id: 1, name: 'Carlos Eduardo', role: 'Head of Sales', avatar: '' }
    ]
  },
  config: {
    active: true,
    profitShare: true,
    showBadges: true,
    allowQuestions: true
  }
};

// ============================================
// COMPONENTES UI
// ============================================

const Card = ({ title, children, className = "" }) => (
  <div className={`bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-sm ${className}`}>
    {title && (
      <div className="mb-6 border-b border-stone-800 pb-4">
        <h3 className="text-lg font-bold text-stone-50">{title}</h3>
      </div>
    )}
    {children}
  </div>
);

const InputLabel = ({ label }) => (
  <label className="block text-sm font-medium text-stone-400 mb-1.5">{label}</label>
);

const InputField = ({ className = "", ...props }) => (
  <input
    className={`w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-sm ${className}`}
    {...props}
  />
);

const TextArea = ({ rows = 4, ...props }) => (
  <textarea
    className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all text-sm resize-none"
    rows={rows}
    {...props}
  />
);

const ToggleSwitch = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 bg-stone-950 rounded-lg border border-stone-800">
    <span className="text-sm font-medium text-stone-300">{label}</span>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-blue-600' : 'bg-stone-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

const AllocationSlider = ({ label, value, onChange, color = "bg-blue-600" }) => (
  <div className="mb-4">
    <div className="flex justify-between text-sm mb-2">
      <span className="text-stone-400">{label}</span>
      <span className="text-stone-100 font-bold">{value}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    analysis: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20'
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${styles[status] || 'bg-stone-800 text-stone-400'}`}>
      {status === 'approved' ? 'Aprovada' : status}
    </span>
  );
};

// ============================================
// COMPONENTE: TAB STEPPER (Sem Rolagem)
// ============================================

const TabStepper = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="w-full mb-8">
      {/* Container Relativo para posicionar a linha */}
      <div className="relative flex justify-between items-start pt-2">
        
        {/* Linha de Conexão (Fundo) */}
        <div className="absolute top-5 md:top-6 left-4 right-4 h-0.5 bg-stone-800 z-0" />

        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          
          return (
            <button 
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="group flex flex-col items-center relative z-10 w-full focus:outline-none"
            >
              {/* Ícone com Fundo Opaco para cobrir a linha */}
              <div 
                className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 mb-2
                  ${isActive 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/50 scale-110' 
                    : 'bg-stone-900 border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-300'}
                `}
              >
                <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              
              {/* Rótulo */}
              <span 
                className={`
                  text-[10px] md:text-xs font-medium transition-colors duration-300 text-center hidden sm:block
                  ${isActive ? 'text-blue-400' : 'text-stone-500 group-hover:text-stone-300'}
                `}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: MODAL DE ANÁLISE DE IA
// ============================================

const AnalysisModal = ({ isOpen, onClose, isLoading, analysis }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-stone-800 bg-stone-900/50 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-50">Análise de Venture Capital</h3>
              <p className="text-xs text-stone-400">Feedback gerado por IA sobre sua startup</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-200 transition-colors p-2 hover:bg-stone-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                </div>
              </div>
              <p className="text-stone-300 font-medium">Analisando modelo de negócio...</p>
              <p className="text-stone-500 text-sm">Avaliando pitch, métricas e mercado.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Score */}
              <div className="flex items-center justify-between bg-stone-950 p-4 rounded-xl border border-stone-800">
                <span className="text-sm font-medium text-stone-400">Nota de Prontidão</span>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`w-5 h-5 ${s <= (analysis.score / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-stone-700'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xl font-bold text-stone-50 ml-2">{analysis.score}/100</span>
                </div>
              </div>

              {/* Strengths */}
              <div>
                <h4 className="flex items-center gap-2 text-green-400 font-semibold mb-3">
                  <ThumbsUp className="w-4 h-4" /> Pontos Fortes
                </h4>
                <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4 space-y-2">
                  {analysis.strengths?.map((item, i) => (
                    <div key={i} className="flex gap-3 text-stone-300 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div>
                <h4 className="flex items-center gap-2 text-amber-400 font-semibold mb-3">
                  <ThumbsDown className="w-4 h-4" /> Pontos de Atenção
                </h4>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 space-y-2">
                  {analysis.weaknesses?.map((item, i) => (
                    <div key={i} className="flex gap-3 text-stone-300 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-stone-200 font-semibold mb-2">Veredito da IA</h4>
                <p className="text-stone-400 text-sm leading-relaxed bg-stone-800/50 p-4 rounded-xl">
                  {analysis.summary}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-900/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-lg transition-colors"
          >
            Fechar Relatório
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// PÁGINA PRINCIPAL
// ============================================

export default function EditStartupPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [data, setData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [allocationTotal, setAllocationTotal] = useState(0);
  const [generatingField, setGeneratingField] = useState(null);
  
  // AI Analysis States
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState({ score: 0, strengths: [], weaknesses: [], summary: '' });

  // Recalcular total de alocação
  useEffect(() => {
    const total = Object.values(data.financial.allocation).reduce((a, b) => a + b, 0);
    setAllocationTotal(total);
  }, [data.financial.allocation]);

  // Handlers genéricos
  const updateField = (section, field, value) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const updateAllocation = (key, value) => {
    setData(prev => ({
      ...prev,
      financial: {
        ...prev.financial,
        allocation: { ...prev.financial.allocation, [key]: value }
      }
    }));
  };

  // 1. Função para Melhorar Texto Específico (Tiny AI)
  const handleGenerateAI = async (field) => {
    setGeneratingField(field);
    try {
      const fieldMap = {
        'problem': 'o problema que a startup resolve',
        'solution': 'a solução proposta',
        'differential': 'o diferencial competitivo e vantagens injustas',
        'revenueModel': 'o modelo de receita e monetização'
      };

      const context = `Startup: ${data.identity.fantasyName}. Segmento: ${data.identity.segment}.`;
      const currentValue = data.description[field];
      
      let prompt = "";
      if (currentValue && currentValue.length > 10) {
        prompt = `Aja como um especialista em Pitch Decks de Startups. Reescreva o seguinte texto sobre ${fieldMap[field]} de forma mais persuasiva, profissional e concisa para atrair investidores de Venture Capital. Mantenha o idioma Português. Texto original: "${currentValue}". Contexto da startup: ${context}`;
      } else {
        prompt = `Aja como um especialista em Pitch Decks de Startups. Escreva um texto curto (máximo 3 frases), persuasivo e direto sobre ${fieldMap[field]} para a seguinte startup: ${context}. O texto deve ser focado em atrair investidores. Responda apenas com o texto sugerido em Português.`;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });

      if (!response.ok) throw new Error('Falha na geração de texto');

      const result = await response.json();
      const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        updateField('description', field, generatedText.trim());
      }

    } catch (error) {
      console.error(error);
      alert("Não foi possível gerar o conteúdo com IA.");
    } finally {
      setGeneratingField(null);
    }
  };

  // 2. Função para Análise Completa da Startup (Full Analysis AI)
  const handleAnalyzeStartup = async () => {
    setShowAnalysis(true);
    setIsAnalyzing(true);

    try {
      const startupContext = JSON.stringify({
        name: data.identity.fantasyName,
        segment: data.identity.segment,
        description: data.description,
        financial: data.financial,
        team: data.team.partners.map(p => `${p.name} (${p.role})`)
      });

      const prompt = `
        Atue como um analista sênior de Venture Capital. Analise os dados desta startup e forneça um feedback estruturado em formato JSON.
        Dados da startup: ${startupContext}.
        
        Retorne APENAS um JSON válido com esta estrutura exata, sem blocos de código ou markdown:
        {
          "score": (número de 0 a 100 indicando prontidão para investimento),
          "strengths": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
          "weaknesses": ["ponto de atenção 1", "ponto de atenção 2", "ponto de atenção 3"],
          "summary": "Um parágrafo de resumo com veredito final sobre a viabilidade do negócio."
        }
      `;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!response.ok) throw new Error('Falha na análise');

      const result = await response.json();
      const textResponse = result.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonResponse = JSON.parse(textResponse);

      setAnalysisResult(jsonResponse);

    } catch (error) {
      console.error(error);
      setAnalysisResult({
        score: 0,
        strengths: ["Erro na análise"],
        weaknesses: ["Tente novamente mais tarde"],
        summary: "Não foi possível conectar com o analista de IA."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (allocationTotal !== 100) {
      alert("A alocação de recursos deve somar 100%.");
      return;
    }
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsSaving(false);
    alert("Dados salvos com sucesso!");
  };

  // Tabs Configuration
  const tabs = [
    { id: 'general', label: 'Dados Gerais', icon: Building }, 
    { id: 'location', label: 'Localização', icon: Globe },    
    { id: 'financial', label: 'Financeiro', icon: Banknote }, 
    { id: 'team', label: 'Time', icon: Users },
    { id: 'config', label: 'Configurações', icon: Settings },
  ];

  return (
    // Adicionado 'pb-32' para garantir espaço para o footer fixo
    <div className="min-h-screen bg-stone-950 text-stone-50 p-6 lg:p-8 pb-32 font-sans">
      <div className="max-w-5xl mx-auto">
      
        {/* HEADER (Estilo Create) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <a href="/dashboard/startups" className="inline-flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors text-sm">
              <ChevronLeft className="w-4 h-4" />
              Voltar para Dashboard
            </a>
            
            {/* Botão de Análise de IA */}
            <button 
              onClick={handleAnalyzeStartup}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg transition-all text-sm font-medium hover:shadow-[0_0_15px_rgba(168,85,247,0.15)]"
            >
              <BrainCircuit className="w-4 h-4" />
              Análise de VC com IA
            </button>
          </div>
          
          <div className="flex items-center gap-4">
             <h1 className="text-3xl font-bold text-stone-50 tracking-tight">Editar Startup</h1>
             <span className="text-stone-600 text-2xl">/</span>
             <span className="text-xl text-stone-400 font-medium">{data.identity.fantasyName}</span>
             <div className="ml-2">
                <Badge status={data.status} />
             </div>
          </div>
          <p className="text-stone-400 mt-1">Atualize as informações do seu projeto e gerencie sua campanha.</p>
        </div>

        {/* TAB STEPPER NAVIGATION */}
        <div className="mb-12">
          <TabStepper 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
          />
        </div>

        {/* CONTENT AREA */}
        
        {/* --- TAB: DADOS GERAIS --- */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <Card title="Identidade Visual & Corporativa">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-32 h-32 rounded-full border-2 border-dashed border-stone-700 bg-stone-950 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-blue-500 transition-colors">
                    <img src={data.identity.logo} alt="Logo" className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity" />
                    <Upload className="w-8 h-8 text-stone-400 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <button className="text-xs text-blue-400 hover:underline">Alterar Logo</button>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <InputLabel label="Nome Fantasia" />
                    <InputField 
                      value={data.identity.fantasyName} 
                      onChange={(e) => updateField('identity', 'fantasyName', e.target.value)} 
                    />
                  </div>
                  <div>
                    <InputLabel label="Razão Social" />
                    <InputField 
                      value={data.identity.legalName} 
                      onChange={(e) => updateField('identity', 'legalName', e.target.value)} 
                    />
                  </div>
                  <div>
                    <InputLabel label="CNPJ" />
                    <InputField 
                      value={data.identity.cnpj} 
                      onChange={(e) => updateField('identity', 'cnpj', e.target.value)} 
                    />
                  </div>
                  <div>
                    <InputLabel label="Data de Fundação" />
                    <InputField 
                      type="date"
                      value={data.identity.foundationDate} 
                      onChange={(e) => updateField('identity', 'foundationDate', e.target.value)} 
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Descritivo do Negócio">
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <InputLabel label="O Problema" />
                    <button 
                      onClick={() => handleGenerateAI('problem')}
                      disabled={generatingField === 'problem'}
                      className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                    >
                      {generatingField === 'problem' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {generatingField === 'problem' ? 'Gerando...' : 'Melhorar com IA'}
                    </button>
                  </div>
                  <TextArea 
                    value={data.description.problem}
                    onChange={(e) => updateField('description', 'problem', e.target.value)}
                    placeholder="Qual dor seu produto resolve?"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <InputLabel label="A Solução" />
                    <button 
                      onClick={() => handleGenerateAI('solution')}
                      disabled={generatingField === 'solution'}
                      className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                    >
                      {generatingField === 'solution' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      {generatingField === 'solution' ? 'Gerando...' : 'Melhorar com IA'}
                    </button>
                  </div>
                  <TextArea 
                    value={data.description.solution}
                    onChange={(e) => updateField('description', 'solution', e.target.value)}
                    placeholder="Como você resolve esse problema?"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <InputLabel label="Diferencial Competitivo" />
                      <button 
                        onClick={() => handleGenerateAI('differential')}
                        disabled={generatingField === 'differential'}
                        className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                      >
                        {generatingField === 'differential' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {generatingField === 'differential' ? 'Gerando...' : 'IA'}
                      </button>
                    </div>
                    <TextArea 
                      rows={3}
                      value={data.description.differential}
                      onChange={(e) => updateField('description', 'differential', e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <InputLabel label="Modelo de Receita" />
                      <button 
                        onClick={() => handleGenerateAI('revenueModel')}
                        disabled={generatingField === 'revenueModel'}
                        className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                      >
                        {generatingField === 'revenueModel' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        {generatingField === 'revenueModel' ? 'Gerando...' : 'IA'}
                      </button>
                    </div>
                    <TextArea 
                      rows={3}
                      value={data.description.revenueModel}
                      onChange={(e) => updateField('description', 'revenueModel', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* --- TAB: LOCALIZAÇÃO --- */}
        {activeTab === 'location' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <Card title="Localização da Sede">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div>
                  <InputLabel label="País de Origem" />
                  <div className="relative">
                    <select 
                      className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-lg px-4 py-2.5 appearance-none focus:ring-2 focus:ring-blue-600/50"
                      value={data.location.iso3}
                      onChange={(e) => updateField('location', 'iso3', e.target.value)}
                    >
                      <option value="BRA">Brasil</option>
                      <option value="USA">Estados Unidos</option>
                      <option value="PRT">Portugal</option>
                    </select>
                    <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
                  </div>
                  <p className="text-xs text-stone-500 mt-2">
                    Selecionar o país ajusta automaticamente as configurações fiscais e de moeda.
                  </p>
                </div>
                
                <div className="bg-stone-950 p-6 rounded-xl border border-stone-800 flex items-center gap-4">
                  <div className="text-6xl">{data.location.emoji}</div>
                  <div>
                    <p className="text-stone-400 text-sm">País Selecionado</p>
                    <h3 className="text-2xl font-bold text-stone-50">{data.location.name}</h3>
                    <p className="text-stone-500 text-xs font-mono mt-1">ISO: {data.location.iso3}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* --- TAB: FINANCEIRO --- */}
        {activeTab === 'financial' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <Card title="Estrutura da Oferta">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <InputLabel label="Meta de Captação (R$)" />
                  <InputField 
                    type="number"
                    value={data.financial.targetAmount}
                    onChange={(e) => updateField('financial', 'targetAmount', e.target.value)}
                  />
                </div>
                <div>
                  <InputLabel label="Equity Oferecido (%)" />
                  <InputField 
                    type="number"
                    value={data.financial.equityPercentage}
                    onChange={(e) => updateField('financial', 'equityPercentage', e.target.value)}
                  />
                </div>
                <div className="bg-stone-950 p-4 rounded-lg border border-stone-800">
                  <p className="text-xs text-stone-500 uppercase font-semibold">Valuation Implícito</p>
                  <p className="text-xl font-bold text-blue-400 mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      data.financial.targetAmount / (data.financial.equityPercentage / 100)
                    )}
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Alocação de Recursos">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div>
                  <div className="mb-6 flex justify-between items-center">
                    <p className="text-sm text-stone-400">Defina como o capital será utilizado.</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      allocationTotal === 100 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      Total: {allocationTotal}%
                    </span>
                  </div>
                  
                  <AllocationSlider 
                    label="Desenvolvimento / Produto" 
                    value={data.financial.allocation.development} 
                    onChange={(v) => updateAllocation('development', v)} 
                  />
                  <AllocationSlider 
                    label="Marketing & Vendas" 
                    value={data.financial.allocation.marketing} 
                    onChange={(v) => updateAllocation('marketing', v)} 
                  />
                  <AllocationSlider 
                    label="Operações" 
                    value={data.financial.allocation.operations} 
                    onChange={(v) => updateAllocation('operations', v)} 
                  />
                  <AllocationSlider 
                    label="Jurídico / Adm" 
                    value={data.financial.allocation.legal} 
                    onChange={(v) => updateAllocation('legal', v)} 
                  />
                </div>
                
                {/* Gráfico Visual Simples */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 rounded-full border-8 border-stone-800 flex items-center justify-center overflow-hidden bg-stone-950">
                    <PieChart className="w-16 h-16 text-stone-700" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-stone-50">{allocationTotal}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 mt-4 text-center max-w-xs">
                    O gráfico será gerado automaticamente na página pública com base nestes valores.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* --- TAB: TIME --- */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <Card title="Quadro Societário (Cap Table)">
              <div className="space-y-4">
                {data.team.partners.map((partner) => (
                  <div key={partner.id} className="flex items-center justify-between p-3 bg-stone-950 border border-stone-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-bold">
                        {partner.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-stone-200 font-medium">{partner.name}</p>
                        <p className="text-xs text-stone-500">{partner.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-stone-300">{partner.equity}% Equity</span>
                      <button className="text-stone-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                <button className="w-full py-2 border border-dashed border-stone-700 rounded-lg text-stone-400 hover:bg-stone-900 hover:text-stone-200 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Sócio
                </button>
              </div>
            </Card>

            <Card title="Time Executivo">
              <div className="space-y-4">
                {data.team.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-stone-950 border border-stone-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-400">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-stone-200 font-medium">{member.name}</p>
                        <p className="text-xs text-stone-500">{member.role}</p>
                      </div>
                    </div>
                    <button className="text-stone-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button className="w-full py-2 border border-dashed border-stone-700 rounded-lg text-stone-400 hover:bg-stone-900 hover:text-stone-200 transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Membro
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* --- TAB: CONFIG --- */}
        {activeTab === 'config' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <Card title="Configurações da Startup">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ToggleSwitch 
                  label="Startup Ativa (Visível)" 
                  checked={data.config.active}
                  onChange={(v) => updateField('config', 'active', v)}
                />
                <ToggleSwitch 
                  label="Repasse de Lucros (Dividendos)" 
                  checked={data.config.profitShare}
                  onChange={(v) => updateField('config', 'profitShare', v)}
                />
                <ToggleSwitch 
                  label="Exibir Selos de Verificação" 
                  checked={data.config.showBadges}
                  onChange={(v) => updateField('config', 'showBadges', v)}
                />
                <ToggleSwitch 
                  label="Permitir Perguntas de Investidores" 
                  checked={data.config.allowQuestions}
                  onChange={(v) => updateField('config', 'allowQuestions', v)}
                />
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* STICKY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-stone-950/80 backdrop-blur-xl border-t border-stone-800 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {allocationTotal !== 100 && activeTab === 'financial' && (
              <span className="text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> Alocação financeira deve ser 100%
              </span>
            )}
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2.5 text-stone-400 hover:text-stone-200 font-medium transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving || (allocationTotal !== 100)}
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE ANÁLISE */}
      <AnalysisModal 
        isOpen={showAnalysis} 
        onClose={() => setShowAnalysis(false)} 
        isLoading={isAnalyzing} 
        analysis={analysisResult} 
      />

    </div>
  );
}
