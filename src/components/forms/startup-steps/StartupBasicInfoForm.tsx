'use client';

import { useSession } from '@/hooks/useSession';
import type {
  BancoInfo,
  Country,
  StartupFormData,
} from '@/types/startup';
import { useEffect, useState } from 'react';
import { Plus, Trash2, User } from 'lucide-react';

interface StartupBasicInfoFormProps {
  initialData: Partial<StartupFormData>;
  onNext: (data: StartupFormData) => void;
  onCancel: () => void;
}

type CountryWithTranslations = Country & {
  translations?: {
    br?: string;
    pt?: string;
    [key: string]: string | undefined;
  };
};

const AREAS_ATUACAO: string[] = [
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

const ESTAGIOS: string[] = [
  'Ideação',
  'MVP',
  'Tração',
  'Crescimento',
  'Escala',
];

const REDES_SOCIAIS_DISPONIVEIS: Array<{
  nome: string;
  iconSrc: string;
  placeholder: string;
}> = [
  {
    nome: 'LinkedIn',
    iconSrc: '/rede-sociais/linkedin-50.svg',
    placeholder: 'https://linkedin.com/company/',
  },
  {
    nome: 'Facebook',
    iconSrc: '/rede-sociais/facebook-50.svg',
    placeholder: 'https://facebook.com/',
  },
  {
    nome: 'Instagram',
    iconSrc: '/rede-sociais/instagram-50.svg',
    placeholder: 'https://instagram.com/',
  },
  {
    nome: 'Twitter/X',
    iconSrc: '/rede-sociais/twitter⁄x-50.svg',
    placeholder: 'https://twitter.com/',
  },
  {
    nome: 'YouTube',
    iconSrc: '/rede-sociais/youtube-50.svg',
    placeholder: 'https://youtube.com/@',
  },
  {
    nome: 'TikTok',
    iconSrc: '/rede-sociais/tiktok-50.svg',
    placeholder: 'https://tiktok.com/@',
  },
];

export default function StartupBasicInfoForm({
  initialData,
  onNext,
  onCancel,
}: StartupBasicInfoFormProps) {
  const [countries, setCountries] = useState<CountryWithTranslations[]>([]);
  const [loadingCountries, setLoadingCountries] = useState<boolean>(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedCountry, setSelectedCountry] = useState<CountryWithTranslations | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apiUser } = useSession();

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
    campanha: [],
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
    socios: [],
    teams: [],
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await fetch('/api/location/countries');
        if (!response.ok) throw new Error('Erro ao buscar países');
        const json = await response.json();
        setCountries(json?.data ?? []);
      } catch (error) {
        console.error('Erro ao carregar países:', error);
        // Fallback
        setCountries([{
            id: 1,
            name: 'Brazil',
            iso3: 'BRA',
            iso2: 'BR',
            emoji: '🇧🇷',
            native: 'Brasil',
            currency: 'BRL',
            currency_symbol: 'R$',
            translations: { br: 'Brasil', pt: 'Brasil' },
          } as CountryWithTranslations]);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    if (name.startsWith('banco.')) {
      const bancoField = name.split('.')[1] as keyof BancoInfo;
      setFormData((prev) => ({
        ...prev,
        banco: { ...prev.banco, [bancoField]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCountryChange = (iso3: string) => {
    const found = countries.find((c) => c.iso3 === iso3);
    if (found) {
      setSelectedCountry(found);
      setFormData((prev) => ({
        ...prev,
        pais: {
          iso3: found.iso3,
          nome: found.translations?.br || found.translations?.pt || found.name,
          emoji: found.emoji,
        },
      }));
    }
  };

  // Gestão de Redes Sociais
  const addRedeSocial = () => {
    const nextId = formData.redes.length > 0 ? Math.max(...formData.redes.map(r => r.id)) + 1 : 1;
    setFormData(prev => ({
      ...prev,
      redes: [...prev.redes, { id: nextId, nome: '', url: '' }]
    }));
  };

  const removeRedeSocial = (id: number) => {
    setFormData(prev => ({
      ...prev,
      redes: prev.redes.filter(r => r.id !== id)
    }));
  };

  const updateRedeSocial = (id: number, field: 'nome' | 'url', value: string) => {
    setFormData(prev => ({
      ...prev,
      redes: prev.redes.map(r => r.id === id ? { ...r, [field]: value } : r)
    }));
  };

  // Gestão de Sócios
  const addSocio = () => {
    const nextId = (formData.socios?.length || 0) > 0 ? Math.max(...(formData.socios?.map(s => s.id) || [0])) + 1 : 1;
    setFormData(prev => ({
      ...prev,
      socios: [...(prev.socios || []), { id: nextId, nome: '', porcentagem: 0, percentual_time: '' }]
    }));
  };

  const removeSocio = (id: number) => {
    setFormData(prev => ({
      ...prev,
      socios: prev.socios?.filter(s => s.id !== id)
    }));
  };

  const updateSocio = (id: number, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      socios: prev.socios?.map(s => s.id === id ? { ...s, [field]: value } : s)
    }));
  };

  // Gestão de Time
  const addTeam = () => {
    const nextId = (formData.teams?.length || 0) > 0 ? Math.max(...(formData.teams?.map(t => t.id) || [0])) + 1 : 1;
    setFormData(prev => ({
      ...prev,
      teams: [...(prev.teams || []), { id: nextId, nome: '', cargo: '', foto_url: '' }]
    }));
  };

  const removeTeam = (id: number) => {
    setFormData(prev => ({
      ...prev,
      teams: prev.teams?.filter(t => t.id !== id)
    }));
  };

  const updateTeam = (id: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      teams: prev.teams?.map(t => t.id === id ? { ...t, [field]: value } : t)
    }));
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.razao_social.trim()) newErrors.razao_social = 'Razão social é obrigatória';
    if (!formData.cnpj.trim()) newErrors.cnpj = 'CNPJ é obrigatório';
    if (!formData.area_atuacao) newErrors.area_atuacao = 'Selecione a área de atuação';
    if (!formData.estagio) newErrors.estagio = 'Selecione o estágio atual';
    if (!formData.data_fundacao) newErrors.data_fundacao = 'Data de fundação é obrigatória';
    if (!formData.descritivo_basico.trim()) newErrors.descritivo_basico = 'Faça um breve descritivo da startup';
    if (!formData.pais.iso3) newErrors.pais = 'Selecione o país de origem';

    if (formData.banco.nome || formData.banco.agencia || formData.banco.conta) {
        if (!formData.banco.nome) newErrors['banco.nome'] = 'Nome do banco obrigatório';
        if (!formData.banco.agencia) newErrors['banco.agencia'] = 'Agência obrigatória';
        if (!formData.banco.conta) newErrors['banco.conta'] = 'Conta obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextClick = () => {
    if (validateStep1()) {
      onNext(formData);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Updated styles using Tailwind semantic classes
  const commonInputClass = "w-full rounded-lg border bg-background px-4 py-3 text-sm text-foreground transition-all duration-300 placeholder:text-muted-foreground focus:outline-none";
  const errorInputClass = "border-destructive focus:border-destructive focus:ring-2 focus:ring-destructive/20";
  const normalInputClass = "border-border focus:border-[#d500f9]/30 focus:ring-2 focus:ring-[#d500f9]/10";

  const getInputClass = (fieldName: string) => 
    `${commonInputClass} ${errors[fieldName] ? errorInputClass : normalInputClass}`;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Seção 1: Dados Básicos */}
      <section className="rounded-smooth border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Informações Institucionais
          </h2>
          <p className="text-sm text-muted-foreground">
            Dados legais e de identificação da startup
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Nome Fantasia */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Nome Fantasia <span className="text-[#d500f9]">*</span>
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              placeholder="Ex: iSelfToken"
              className={getInputClass('nome')}
            />
            {errors.nome && (
              <p className="mt-2 text-xs text-destructive">⚠️ {errors.nome}</p>
            )}
          </div>

          {/* Razão Social */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Razão Social <span className="text-[#d500f9]">*</span>
            </label>
            <input
              type="text"
              name="razao_social"
              value={formData.razao_social}
              onChange={handleInputChange}
              placeholder="Ex: iSelf Tecnologia LTDA"
              className={getInputClass('razao_social')}
            />
             {errors.razao_social && (
              <p className="mt-2 text-xs text-destructive">⚠️ {errors.razao_social}</p>
            )}
          </div>

          {/* CNPJ */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              CNPJ / Tax ID <span className="text-[#d500f9]">*</span>
            </label>
            <input
              type="text"
              name="cnpj"
              value={formData.cnpj}
              onChange={handleInputChange}
              placeholder="00.000.000/0001-00"
              className={getInputClass('cnpj')}
            />
             {errors.cnpj && (
              <p className="mt-2 text-xs text-destructive">⚠️ {errors.cnpj}</p>
            )}
          </div>

          {/* Data de Fundação */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Data de Fundação <span className="text-[#d500f9]">*</span>
            </label>
            <input
              type="date"
              name="data_fundacao"
              value={formData.data_fundacao}
              onChange={handleInputChange}
              className={getInputClass('data_fundacao')}
            />
            {errors.data_fundacao && (
              <p className="mt-2 text-xs text-destructive">⚠️ {errors.data_fundacao}</p>
            )}
          </div>

          {/* País */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-foreground">
              País de Origem <span className="text-[#d500f9]">*</span>
            </label>
            {loadingCountries ? (
              <div className="h-11 w-full animate-pulse rounded-lg bg-muted"></div>
            ) : (
              <select
                name="pais"
                value={formData.pais.iso3}
                onChange={(e) => handleCountryChange(e.target.value)}
                className={getInputClass('pais')}
              >
                <option value="">Selecione um país...</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.iso3}>
                    {country.emoji} {country.translations?.br || country.name}
                  </option>
                ))}
              </select>
            )}
            {errors.pais && (
              <p className="mt-2 text-xs text-destructive">⚠️ {errors.pais}</p>
            )}
          </div>
        </div>
      </section>

      {/* Seção 2: Detalhes do Negócio */}
      <section className="rounded-smooth border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Detalhes do Negócio
          </h2>
          <p className="text-sm text-muted-foreground">
            Como sua startup se posiciona no mercado
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Área de Atuação */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Área de Atuação <span className="text-[#d500f9]">*</span>
            </label>
            <select
              name="area_atuacao"
              value={formData.area_atuacao}
              onChange={handleInputChange}
              className={getInputClass('area_atuacao')}
            >
              <option value="">Selecione...</option>
              {AREAS_ATUACAO.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
            {errors.area_atuacao && (
              <p className="mt-2 text-xs text-destructive">⚠️ {errors.area_atuacao}</p>
            )}
          </div>

          {/* Estágio */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Estágio Atual <span className="text-[#d500f9]">*</span>
            </label>
            <select
              name="estagio"
              value={formData.estagio}
              onChange={handleInputChange}
              className={getInputClass('estagio')}
            >
              <option value="">Selecione...</option>
              {ESTAGIOS.map((estagio) => (
                <option key={estagio} value={estagio}>
                  {estagio}
                </option>
              ))}
            </select>
            {errors.estagio && (
              <p className="mt-2 text-xs text-destructive">⚠️ {errors.estagio}</p>
            )}
          </div>

          {/* Descritivo Básico */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-foreground">
              Pitch Curto (Elevator Pitch) <span className="text-[#d500f9]">*</span>
            </label>
            <textarea
              name="descritivo_basico"
              value={formData.descritivo_basico}
              onChange={handleInputChange}
              rows={4}
              placeholder="Descreva sua startup em poucas palavras..."
              className={getInputClass('descritivo_basico')}
            />
             {errors.descritivo_basico && (
              <p className="mt-2 text-xs text-destructive">⚠️ {errors.descritivo_basico}</p>
            )}
          </div>

          {/* Site e URLs */}
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              Website
            </label>
            <input
              type="url"
              name="site"
              value={formData.site}
              onChange={handleInputChange}
              placeholder="https://suastartup.com"
              className={getInputClass('site')}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              URL do Logo
            </label>
            <input
              type="url"
              name="logo_url"
              value={formData.logo_url}
              onChange={handleInputChange}
              placeholder="https://..."
              className={getInputClass('logo_url')}
            />
          </div>
        </div>
      </section>

      {/* NOVA SEÇÃO: Time e Sócios */}
      <section className="rounded-smooth border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 border-b border-border pb-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Time & Sócios
            </h2>
            <p className="text-sm text-muted-foreground">
              Quem faz parte do projeto
            </p>
          </div>
        </div>

        <div className="space-y-8">
            {/* Sócios */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-foreground">Quadro Societário</h3>
                    <button type="button" onClick={addSocio} className="text-xs flex items-center gap-1 text-[#d500f9] hover:underline">
                        <Plus size={14} /> Adicionar Sócio
                    </button>
                </div>
                <div className="space-y-3">
                    {(formData.socios || []).map(socio => (
                        <div key={socio.id} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center bg-background/50 p-3 rounded-lg border border-border">
                            <input 
                                type="text" 
                                placeholder="Nome do Sócio"
                                value={socio.nome}
                                onChange={(e) => updateSocio(socio.id, 'nome', e.target.value)}
                                className={commonInputClass}
                            />
                            <input 
                                type="number" 
                                placeholder="% Equity"
                                value={socio.porcentagem || ''}
                                onChange={(e) => updateSocio(socio.id, 'porcentagem', parseFloat(e.target.value))}
                                className={commonInputClass}
                            />
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Dedicação (ex: 100%)"
                                    value={socio.percentual_time}
                                    onChange={(e) => updateSocio(socio.id, 'percentual_time', e.target.value)}
                                    className={commonInputClass}
                                />
                                <button type="button" onClick={() => removeSocio(socio.id)} className="text-muted-foreground hover:text-destructive">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {(formData.socios || []).length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum sócio adicionado.</p>}
                </div>
            </div>

            {/* Equipe Executiva */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-foreground">Equipe Executiva</h3>
                    <button type="button" onClick={addTeam} className="text-xs flex items-center gap-1 text-[#d500f9] hover:underline">
                        <Plus size={14} /> Adicionar Membro
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(formData.teams || []).map(team => (
                        <div key={team.id} className="flex items-start gap-3 bg-background/50 p-3 rounded-lg border border-border relative group">
                            <div className="h-10 w-10 rounded-full bg-secondary shrink-0 flex items-center justify-center text-muted-foreground">
                                <User size={20} />
                            </div>
                            <div className="flex-1 space-y-2">
                                <input 
                                    type="text" 
                                    placeholder="Nome"
                                    value={team.nome}
                                    onChange={(e) => updateTeam(team.id, 'nome', e.target.value)}
                                    className={`${commonInputClass} py-1.5 h-9`}
                                />
                                <input 
                                    type="text" 
                                    placeholder="Cargo"
                                    value={team.cargo}
                                    onChange={(e) => updateTeam(team.id, 'cargo', e.target.value)}
                                    className={`${commonInputClass} py-1.5 h-9`}
                                />
                            </div>
                            <button type="button" onClick={() => removeTeam(team.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                 {(formData.teams || []).length === 0 && <p className="text-sm text-muted-foreground italic">Nenhum membro adicionado.</p>}
            </div>
        </div>
      </section>
      
      {/* Seção 3: Redes Sociais */}
       <section className="rounded-smooth border border-border bg-card p-8 shadow-sm">
        <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              Redes Sociais
            </h2>
            <p className="text-sm text-muted-foreground">
              Onde encontrar sua startup
            </p>
          </div>
          <button
            type="button"
            onClick={addRedeSocial}
            className="flex items-center gap-2 rounded-lg bg-[#d500f9]/10 px-3 py-1.5 text-xs font-semibold text-[#d500f9] transition-colors hover:bg-[#d500f9]/20"
          >
            + Adicionar Rede
          </button>
        </div>

        <div className="space-y-4">
          {formData.redes.length === 0 && (
             <p className="text-sm text-muted-foreground italic text-center py-4">
                Nenhuma rede social adicionada ainda.
             </p>
          )}
          {formData.redes.map((rede) => (
            <div key={rede.id} className="flex items-start gap-4 rounded-lg border border-border bg-background/50 p-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <select
                        value={rede.nome}
                        onChange={(e) => updateRedeSocial(rede.id, 'nome', e.target.value)}
                        className={getInputClass(`rede_${rede.id}_nome`)}
                    >
                        <option value="">Selecione a rede...</option>
                        {REDES_SOCIAIS_DISPONIVEIS.map(rs => (
                            <option key={rs.nome} value={rs.nome}>{rs.nome}</option>
                        ))}
                    </select>
                 </div>
                 <div>
                    <input 
                        type="text"
                        value={rede.url}
                        onChange={(e) => updateRedeSocial(rede.id, 'url', e.target.value)}
                        placeholder="URL do perfil"
                        className={getInputClass(`rede_${rede.id}_url`)}
                    />
                 </div>
              </div>
              <button
                type="button"
                onClick={() => removeRedeSocial(rede.id)}
                className="mt-2 text-muted-foreground hover:text-destructive"
                title="Remover"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Seção 4: Dados Bancários (Simplificado) */}
      <section className="rounded-smooth border border-border bg-card p-8 shadow-sm">
         <div className="mb-8 border-b border-border pb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Dados Bancários
          </h2>
          <p className="text-sm text-muted-foreground">
            Conta para recebimento dos aportes
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Nome do Banco</label>
                <input type="text" name="banco.nome" value={formData.banco.nome} onChange={handleInputChange} className={getInputClass('banco.nome')} />
            </div>
            <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Agência</label>
                <input type="text" name="banco.agencia" value={formData.banco.agencia} onChange={handleInputChange} className={getInputClass('banco.agencia')} />
            </div>
             <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Conta</label>
                <input type="text" name="banco.conta" value={formData.banco.conta} onChange={handleInputChange} className={getInputClass('banco.conta')} />
            </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-end pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-input bg-transparent px-7 py-3 font-medium tracking-wide text-muted-foreground transition-all hover:border-[#d500f9] hover:text-[#d500f9]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleNextClick}
          className="inline-flex items-center justify-center gap-3 rounded-lg bg-[#d500f9] px-7 py-3 font-semibold tracking-wider text-white uppercase shadow-[0_6px_18px_rgba(213,0,249,0.35)] transition-all hover:scale-[1.01] hover:shadow-[0_10px_28px_rgba(213,0,249,0.45)]"
        >
          Próximo Passo ➡
        </button>
      </div>
    </div>
  );
}
