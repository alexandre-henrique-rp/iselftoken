'use client';

import {
  AREA_ATUACAO_OPTIONS,
  ESTAGIO_OPTIONS,
  type StartupFormData as StartupType,
} from '@/types/startup';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Globe,
  LucideIcon,
  Plus,
  Save,
  Settings,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import * as z from 'zod';

// --- Interfaces & Schemas ---

const startupSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  razao_social: z.string().min(1, 'Razão social é obrigatória'),
  cnpj: z.string().min(14, 'CNPJ inválido'),
  data_fundacao: z.string(),
  area_atuacao: z.string(),
  estagio: z.string(),
  site: z.string().optional(),
  logo_url: z.string().optional(),
  descritivo_basico: z.string(),
  // País
  pais: z.object({
    iso3: z.string(),
    nome: z.string(),
    emoji: z.string(),
  }),
  // Pitch Detalhado
  problema: z.string().optional(),
  solucao: z.string().optional(),
  diferencial: z.string().optional(),
  modelo_receita: z.string().optional(),
  mercado_alvo: z.string().optional(),
  compradores: z.string().optional(),
  // Mídia
  pdf_url: z.string().optional(),
  youtube_url: z.string().optional(),
  // Financeiro
  valuation_calculado: z.number().optional(),
  total_captado: z.number().optional(),
  // Recursos
  recursos: z
    .object({
      fundados: z.number(),
      desenvolvimento: z.number(),
      comercial: z.number(),
      marketing: z.number(),
      nuvem: z.number(),
      juridico: z.number(),
      reserva: z.number(),
    })
    .refine(
      (data) => {
        const sum = Object.values(data).reduce((a, b) => a + b, 0);
        return Math.abs(sum - 100) < 0.1;
      },
      { message: 'A soma dos recursos deve ser 100%' },
    ),
  // Campanha
  campanha: z
    .array(
      z.object({
        id: z.number(),
        status: z.string(),
        dt_inicio: z.string(),
        dt_fim: z.string(),
        meta_captacao: z.number(),
        equity_oferecido: z.number(),
      }),
    )
    .optional(),
  // Banco
  banco: z
    .object({
      nome: z.string().optional(),
      agencia: z.string().optional(),
      conta: z.string().optional(),
      tipo: z.string().optional(),
      nome_titular: z.string().optional(),
    })
    .optional(),
  // Listas
  redes: z.array(
    z.object({
      id: z.number(),
      nome: z.string(),
      url: z.string(),
    }),
  ),
  socios: z.array(
    z.object({
      id: z.number(),
      nome: z.string(),
      porcentagem: z.number(),
      percentual_time: z.string(),
    }),
  ),
  teams: z.array(
    z.object({
      id: z.number(),
      nome: z.string(),
      cargo: z.string(),
      foto_url: z.string(),
    }),
  ),
  selos: z
    .array(
      z.object({
        id: z.number(),
        nome: z.string(),
        url: z.string(),
      }),
    )
    .optional(),
  // Configurações
  part_lucro: z.boolean().optional(),
  part_lucro_regras: z.string().optional(),
  beneficios: z.boolean().optional(),
  beneficios_regras: z.string().optional(),
  termos: z.boolean().optional(),
  repasse: z.boolean().optional(),
  // Prêmios
  premio: z.boolean().optional(),
  premio_dt: z.string().optional(),
  premio_pg: z.string().optional(),
  // Status
  ativo: z.string().optional(),
  ativo_adm: z.string().optional(),
});

type StartupFormData = z.infer<typeof startupSchema>;

interface StartupEditFormProps {
  initialData: Partial<StartupType>;
}

interface Country {
  id: number;
  iso3: string;
  name: string;
  emoji: string;
}

// --- Componentes Auxiliares de Estilo (Baseados no Design System) ---

const CardPremium = ({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="border-border bg-card rounded-xl border p-6 shadow-sm transition-all duration-200 hover:shadow-md">
    <div className="border-border mb-6 flex items-center justify-between border-b pb-4">
      <h3 className="text-foreground text-lg font-medium">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const LabelPremium = ({ children }: { children: React.ReactNode }) => (
  <label className="text-muted-foreground mb-2 block text-sm font-medium">
    {children}
  </label>
);

const InputPremium = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-2.5 text-sm transition-all focus:border-[#d500f9] focus:ring-1 focus:ring-[#d500f9] focus:outline-none disabled:opacity-50 ${props.className}`}
  />
);

const TextareaPremium = (
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>,
) => (
  <textarea
    {...props}
    className={`border-border bg-background text-foreground placeholder:text-muted-foreground min-h-[120px] w-full resize-none overflow-y-auto rounded-lg border px-4 py-3 text-sm transition-all focus:border-[#d500f9] focus:ring-1 focus:ring-[#d500f9] focus:outline-none ${props.className}`}
  />
);

// --- Componente Principal ---

export default function StartupEditForm({ initialData }: StartupEditFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dados');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  // React Hook Form
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<StartupFormData>({
    resolver: zodResolver(startupSchema),
    defaultValues: {
      ...initialData,
      nome: initialData.nome || '',
      razao_social: initialData.razao_social || '',
      cnpj: initialData.cnpj || '',
      data_fundacao: initialData.data_fundacao || '',
      area_atuacao: initialData.area_atuacao || '',
      estagio: initialData.estagio || '',
      site: initialData.site || '',
      logo_url: initialData.logo_url || '',
      descritivo_basico: initialData.descritivo_basico || '',
      problema: initialData.problema || '',
      solucao: initialData.solucao || '',
      diferencial: initialData.diferencial || '',
      modelo_receita: initialData.modelo_receita || '',
      mercado_alvo: initialData.mercado_alvo || '',
      compradores: initialData.compradores || '',
      pdf_url: initialData.pdf_url || '',
      youtube_url: initialData.youtube_url || '',
      valuation_calculado: initialData.valuation_calculado || 0,
      total_captado: initialData.total_captado || 0,
      recursos: initialData.recursos || {
        fundados: 0,
        desenvolvimento: 0,
        comercial: 0,
        marketing: 0,
        nuvem: 0,
        juridico: 0,
        reserva: 0,
      },
      campanha: initialData.campanha || [],
      pais: initialData.pais || { iso3: 'BRA', nome: 'Brasil', emoji: '🇧🇷' },
      banco: initialData.banco || {
        nome: '',
        agencia: '',
        conta: '',
        tipo: '',
        nome_titular: '',
      },
      socios: initialData.socios || [],
      teams: initialData.teams || [],
      redes: initialData.redes || [],
      selos: initialData.selos || [],
      part_lucro_regras: initialData.part_lucro_regras || '',
      beneficios_regras: initialData.beneficios_regras || '',
      premio_dt: initialData.premio_dt || '',
      premio_pg: initialData.premio_pg || '',
      ativo: initialData.ativo || '',
      ativo_adm: initialData.ativo_adm || '',
    },
  });

  // Field Arrays
  const {
    fields: sociosFields,
    append: appendSocio,
    remove: removeSocio,
  } = useFieldArray({ control, name: 'socios' });
  const {
    fields: teamFields,
    append: appendTeam,
    remove: removeTeam,
  } = useFieldArray({ control, name: 'teams' });
  const {
    fields: redesFields,
    append: appendRede,
    remove: removeRede,
  } = useFieldArray({ control, name: 'redes' });
  const {
    fields: selosFields,
    append: appendSelo,
    remove: removeSelo,
  } = useFieldArray({ control, name: 'selos' });

  // Load Countries
  useEffect(() => {
    fetch('/api/location/countries')
      .then((res) => res.json())
      .then((data) => setCountries(data.data || []))
      .catch((err) => console.error('Erro ao carregar países', err));
  }, []);

  // Watchers para configs
  const partLucro = watch('part_lucro');
  const beneficios = watch('beneficios');
  const premio = watch('premio');

  // Recalcula total de recursos
  const recursos = watch('recursos');
  const totalRecursos = useMemo(() => {
    if (!recursos) return 0;
    return Object.values(recursos).reduce((a, b) => Number(a) + Number(b), 0);
  }, [recursos]);

  const onSubmit = async (data: StartupFormData) => {
    setIsSubmitting(true);
    try {
      // Simulação de envio (Payload Structure)
      console.log('Payload PUT:', data);

      // TODO: Implementar fetch real
      // await fetch(`/api/startup/${initialData.id}`, { method: 'PUT', body: JSON.stringify(data) });

      await new Promise((r) => setTimeout(r, 1000)); // Fake delay
      alert('Startup atualizada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderResourceSlider = (key: keyof typeof recursos, label: string) => (
    <div className="mb-4">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-[#d500f9]">
          {recursos?.[key] || 0}%
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        {...register(`recursos.${key}`, { valueAsNumber: true })}
        className="bg-secondary h-2 w-full cursor-pointer appearance-none rounded-lg accent-[#d500f9]"
      />
    </div>
  );

  const TabButton = ({
    id,
    label,
    icon: Icon,
  }: {
    id: string;
    label: string;
    icon: LucideIcon;
  }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-all ${
        activeTab === id
          ? 'border-[#d500f9] text-[#d500f9]'
          : 'text-muted-foreground hover:text-foreground border-transparent'
      }`}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-background text-foreground flex h-[calc(100vh-4rem)] flex-col overflow-hidden"
    >
      {/* Header Fixo */}
      <div className="border-border bg-background/80 z-20 shrink-0 border-b backdrop-blur-md">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="hover:bg-secondary text-muted-foreground hover:text-foreground rounded-full p-2"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-foreground text-lg leading-tight font-bold">
                  Editar Startup: {initialData.nome}
                </h1>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
                  Status: {initialData.status || 'Ativa'}
                </div>
              </div>
            </div>

            {/* Abas de Navegação */}
            <div className="hidden md:flex">
              <TabButton id="dados" label="Dados Gerais" icon={Building2} />
              <TabButton id="localizacao" label="Localização" icon={Globe} />
              <TabButton id="financeiro" label="Financeiro" icon={DollarSign} />
              <TabButton id="time" label="Time" icon={Users} />
              <TabButton id="config" label="Config" icon={Settings} />
            </div>
          </div>
        </div>
      </div>

      {/* Menu Mobile (Abas) */}
      <div className="border-border bg-background shrink-0 overflow-x-auto border-b md:hidden">
        <div className="flex min-w-max px-4">
          <TabButton id="dados" label="Geral" icon={Building2} />
          <TabButton id="localizacao" label="Local" icon={Globe} />
          <TabButton id="financeiro" label="Finan" icon={DollarSign} />
          <TabButton id="time" label="Time" icon={Users} />
          <TabButton id="config" label="Config" icon={Settings} />
        </div>
      </div>

      {/* Área de Conteúdo com Scroll Próprio */}
      <main className="animate-in fade-in flex-1 overflow-y-auto p-6 duration-500">
        <div className="container mx-auto max-w-6xl space-y-6">
          {/* ABA: DADOS GERAIS */}
          {activeTab === 'dados' && (
            <div className="space-y-6">
              <CardPremium
                title="Identidade Corporativa"
                action={
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-[#d500f9] hover:underline"
                  >
                    <Upload size={12} /> Upload Logo
                  </button>
                }
              >
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="flex shrink-0 justify-center">
                    <div className="border-border bg-secondary relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2">
                      {initialData.logo_url ? (
                        <Image
                          src={initialData.logo_url}
                          alt="Logo"
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <Building2
                          className="text-muted-foreground"
                          size={32}
                        />
                      )}
                    </div>
                  </div>
                  <div className="grid flex-1 gap-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <LabelPremium>Nome Fantasia</LabelPremium>
                        <InputPremium
                          {...register('nome')}
                          placeholder="Ex: TechStart"
                        />
                        {errors.nome && (
                          <span className="text-xs text-red-500">
                            {errors.nome.message}
                          </span>
                        )}
                      </div>
                      <div>
                        <LabelPremium>Razão Social</LabelPremium>
                        <InputPremium
                          {...register('razao_social')}
                          placeholder="Ex: TechStart LTDA"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <LabelPremium>CNPJ</LabelPremium>
                        <InputPremium
                          {...register('cnpj')}
                          placeholder="00.000.000/0001-00"
                        />
                      </div>
                      <div>
                        <LabelPremium>Data Fundação</LabelPremium>
                        <InputPremium
                          type="date"
                          {...register('data_fundacao')}
                        />
                      </div>
                      <div>
                        <LabelPremium>Área de Atuação</LabelPremium>
                        <select
                          {...register('area_atuacao')}
                          className="border-border bg-background text-foreground w-full rounded-lg border px-4 py-2.5 text-sm focus:border-[#d500f9] focus:outline-none"
                        >
                          <option value="">Selecione...</option>
                          {AREA_ATUACAO_OPTIONS.map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <LabelPremium>Estágio Atual</LabelPremium>
                        <select
                          {...register('estagio')}
                          className="border-border bg-background text-foreground w-full rounded-lg border px-4 py-2.5 text-sm focus:border-[#d500f9] focus:outline-none"
                        >
                          <option value="">Selecione...</option>
                          {ESTAGIO_OPTIONS.map((estagio) => (
                            <option key={estagio} value={estagio}>
                              {estagio}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <LabelPremium>Website</LabelPremium>
                        <InputPremium
                          {...register('site')}
                          placeholder="https://suastartup.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardPremium>

              <CardPremium title="Pitch & Descrição">
                <div className="space-y-4">
                  <div>
                    <LabelPremium>Descritivo Básico</LabelPremium>
                    <TextareaPremium
                      rows={3}
                      {...register('descritivo_basico')}
                      placeholder="Descreva sua startup em poucas palavras..."
                    />
                  </div>
                  <div>
                    <LabelPremium>O Problema</LabelPremium>
                    <TextareaPremium
                      rows={3}
                      {...register('problema')}
                      placeholder="Qual problema sua startup resolve?"
                    />
                  </div>
                  <div>
                    <LabelPremium>A Solução</LabelPremium>
                    <TextareaPremium
                      rows={3}
                      {...register('solucao')}
                      placeholder="Como sua startup resolve este problema?"
                    />
                  </div>
                  <div>
                    <LabelPremium>Diferencial Competitivo</LabelPremium>
                    <TextareaPremium
                      rows={3}
                      {...register('diferencial')}
                      placeholder="O que diferencia sua solução da concorrência?"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <LabelPremium>Modelo de Receita</LabelPremium>
                      <TextareaPremium
                        rows={3}
                        {...register('modelo_receita')}
                        placeholder="Como sua startup ganha dinheiro?"
                      />
                    </div>
                    <div>
                      <LabelPremium>Mercado Alvo</LabelPremium>
                      <TextareaPremium
                        rows={3}
                        {...register('mercado_alvo')}
                        placeholder="Qual é o seu mercado-alvo?"
                      />
                    </div>
                  </div>
                  <div>
                    <LabelPremium>Perfil dos Compradores</LabelPremium>
                    <TextareaPremium
                      rows={2}
                      {...register('compradores')}
                      placeholder="Quem são seus clientes ideais?"
                    />
                  </div>
                </div>
              </CardPremium>

              <CardPremium
                title="Redes Sociais"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      appendRede({ id: Date.now(), nome: '', url: '' })
                    }
                    className="flex items-center gap-1 text-xs text-[#d500f9] hover:underline"
                  >
                    <Plus size={12} /> Adicionar
                  </button>
                }
              >
                <div className="space-y-3">
                  {redesFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border-border bg-background/50 flex items-center gap-4 rounded-lg border p-3"
                    >
                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                        <InputPremium
                          {...register(`redes.${index}.nome`)}
                          placeholder="Nome da rede (ex: LinkedIn)"
                        />
                        <InputPremium
                          {...register(`redes.${index}.url`)}
                          placeholder="URL do perfil"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRede(index)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {redesFields.length === 0 && (
                    <p className="text-muted-foreground py-4 text-center text-sm italic">
                      Nenhuma rede social adicionada.
                    </p>
                  )}
                </div>
              </CardPremium>

              <CardPremium title="Mídia e Documentos">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <LabelPremium>PDF Pitch Deck</LabelPremium>
                    <InputPremium
                      {...register('pdf_url')}
                      placeholder="URL do PDF"
                    />
                  </div>
                  <div>
                    <LabelPremium>Vídeo YouTube</LabelPremium>
                    <InputPremium
                      {...register('youtube_url')}
                      placeholder="URL do vídeo"
                    />
                  </div>
                </div>
              </CardPremium>
            </div>
          )}

          {/* ABA: LOCALIZAÇÃO */}
          {activeTab === 'localizacao' && (
            <div className="space-y-6">
              <CardPremium title="Localização e Mercado">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <LabelPremium>País de Origem</LabelPremium>
                    <Controller
                      control={control}
                      name="pais"
                      render={({ field }) => (
                        <select
                          className="border-border bg-background text-foreground w-full rounded-lg border px-4 py-2.5 text-sm focus:border-[#d500f9] focus:outline-none"
                          value={field.value?.iso3}
                          onChange={(e) => {
                            const selected = countries.find(
                              (c) => c.iso3 === e.target.value,
                            );
                            if (selected) {
                              field.onChange({
                                iso3: selected.iso3,
                                nome: selected.name,
                                emoji: selected.emoji,
                              });
                            }
                          }}
                        >
                          <option value="">Selecione...</option>
                          {countries.map((c) => (
                            <option key={c.id} value={c.iso3}>
                              {c.emoji} {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                  <div>
                    <LabelPremium>Mercado Alvo</LabelPremium>
                    <InputPremium placeholder="Ex: B2B, SaaS..." />
                  </div>
                </div>
              </CardPremium>
            </div>
          )}

          {/* ABA: FINANCEIRO */}
          {activeTab === 'financeiro' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <CardPremium title="Valuation & Captação">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#d500f9]/30 bg-gradient-to-br from-[#d500f9]/10 to-[#d500f9]/5 p-6">
                      <div className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                        Valuation Calculado
                      </div>
                      <div className="text-foreground text-3xl font-light">
                        {watch('valuation_calculado')
                          ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(watch('valuation_calculado') || 0)
                          : 'R$ 0,00'}
                      </div>
                    </div>
                    <div className="border-border bg-secondary/20 rounded-lg border p-4">
                      <div className="text-muted-foreground mb-2 text-xs font-medium">
                        Total Captado
                      </div>
                      <div className="text-foreground text-xl font-semibold">
                        {watch('total_captado')
                          ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(watch('total_captado') || 0)
                          : 'R$ 0,00'}
                      </div>
                    </div>
                  </div>
                </CardPremium>

                <CardPremium title="Destinação dos Recursos">
                  <div className="space-y-2">
                    {renderResourceSlider('fundados', 'Fundadores')}
                    {renderResourceSlider('desenvolvimento', 'Desenvolvimento')}
                    {renderResourceSlider('comercial', 'Comercial')}
                    {renderResourceSlider('marketing', 'Marketing')}
                    {renderResourceSlider('juridico', 'Jurídico')}
                    {renderResourceSlider('reserva', 'Reserva')}

                    <div
                      className={`mt-6 flex items-center justify-between rounded-lg border px-4 py-3 ${Math.abs(totalRecursos - 100) < 0.1 ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-red-500 bg-red-500/10 text-red-500'}`}
                    >
                      <span className="font-medium">Total Alocado</span>
                      <span className="text-xl font-bold">
                        {totalRecursos.toFixed(0)}%
                      </span>
                    </div>
                    {Math.abs(totalRecursos - 100) >= 0.1 && (
                      <p className="mt-1 text-right text-xs text-red-500">
                        A soma deve ser exatamente 100%
                      </p>
                    )}
                  </div>
                </CardPremium>
              </div>

              <CardPremium title="Dados Bancários">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <LabelPremium>Banco</LabelPremium>
                    <InputPremium
                      {...register('banco.nome')}
                      placeholder="Nome do Banco"
                    />
                  </div>
                  <div>
                    <LabelPremium>Tipo de Conta</LabelPremium>
                    <select
                      {...register('banco.tipo')}
                      className="border-border bg-background text-foreground w-full rounded-lg border px-4 py-2.5 text-sm focus:border-[#d500f9] focus:outline-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="Conta Corrente">Conta Corrente</option>
                      <option value="Conta Poupança">Conta Poupança</option>
                    </select>
                  </div>
                  <div>
                    <LabelPremium>Agência</LabelPremium>
                    <InputPremium
                      {...register('banco.agencia')}
                      placeholder="0001"
                    />
                  </div>
                  <div>
                    <LabelPremium>Conta</LabelPremium>
                    <InputPremium
                      {...register('banco.conta')}
                      placeholder="12345-6"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <LabelPremium>Nome do Titular</LabelPremium>
                    <InputPremium
                      {...register('banco.nome_titular')}
                      placeholder="Nome completo do titular da conta"
                    />
                  </div>
                </div>
              </CardPremium>

              {watch('campanha') && watch('campanha')!.length > 0 && (
                <CardPremium title="Campanhas de Captação">
                  <div className="space-y-3">
                    {watch('campanha')!.map((camp, idx) => (
                      <div
                        key={idx}
                        className="border-border bg-secondary/20 rounded-lg border p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-foreground text-sm font-semibold">
                            Campanha #{camp.id}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              camp.status === 'Ativo'
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-gray-500/10 text-gray-500'
                            }`}
                          >
                            {camp.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Início
                            </div>
                            <div className="text-foreground font-medium">
                              {new Date(camp.dt_inicio).toLocaleDateString(
                                'pt-BR',
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Fim
                            </div>
                            <div className="text-foreground font-medium">
                              {new Date(camp.dt_fim).toLocaleDateString(
                                'pt-BR',
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Meta
                            </div>
                            <div className="text-foreground font-medium">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(camp.meta_captacao)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">
                              Equity
                            </div>
                            <div className="text-foreground font-medium">
                              {camp.equity_oferecido}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardPremium>
              )}
            </div>
          )}

          {/* ABA: TIME */}
          {activeTab === 'time' && (
            <div className="space-y-6">
              <CardPremium
                title="Sócios & Equity"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      appendSocio({
                        id: 0,
                        nome: '',
                        porcentagem: 0,
                        percentual_time: '',
                      })
                    }
                    className="btn-secondary border-border hover:bg-secondary flex items-center gap-1 rounded border px-3 py-1 text-xs"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                }
              >
                <div className="grid grid-cols-1 gap-4">
                  {sociosFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-secondary/30 border-border flex items-center gap-4 rounded-lg border p-4"
                    >
                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
                        <InputPremium
                          {...register(`socios.${index}.nome`)}
                          placeholder="Nome do Sócio"
                        />
                        <InputPremium
                          type="number"
                          step="0.1"
                          {...register(`socios.${index}.porcentagem`, {
                            valueAsNumber: true,
                          })}
                          placeholder="% Equity"
                        />
                        <InputPremium
                          {...register(`socios.${index}.percentual_time`)}
                          placeholder="% Dedicação"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSocio(index)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {sociosFields.length === 0 && (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      Nenhum sócio cadastrado.
                    </p>
                  )}
                </div>
              </CardPremium>

              <CardPremium
                title="Equipe Executiva"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      appendTeam({ id: 0, nome: '', cargo: '', foto_url: '' })
                    }
                    className="btn-secondary border-border hover:bg-secondary flex items-center gap-1 rounded border px-3 py-1 text-xs"
                  >
                    <Plus size={14} /> Adicionar
                  </button>
                }
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {teamFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="bg-secondary/30 border-border group relative flex items-start gap-3 rounded-lg border p-4"
                    >
                      <div className="bg-secondary text-muted-foreground relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs">
                        {/* Placeholder image since actual upload is not implemented */}
                        IMG
                      </div>
                      <div className="flex-1 space-y-2">
                        <InputPremium
                          {...register(`teams.${index}.nome`)}
                          placeholder="Nome"
                          className="h-8 text-xs"
                        />
                        <InputPremium
                          {...register(`teams.${index}.cargo`)}
                          placeholder="Cargo"
                          className="h-8 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTeam(index)}
                        className="text-muted-foreground absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </CardPremium>
            </div>
          )}

          {/* ABA: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <CardPremium title="Regras de Negócio">
                <div className="space-y-4">
                  {/* Participação nos Lucros */}
                  <div className="space-y-2">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        partLucro
                          ? 'border-[#d500f9] bg-[#d500f9]/5'
                          : 'border-border hover:bg-secondary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        {...register('part_lucro')}
                        className="h-5 w-5 rounded border-gray-300 accent-[#d500f9]"
                      />
                      <span className="text-foreground text-sm font-medium">
                        Participação nos Lucros
                      </span>
                    </label>

                    {partLucro && (
                      <div className="animate-in slide-in-from-top-2 fade-in ml-2 border-l-2 border-[#d500f9]/30 pl-4 duration-300">
                        <LabelPremium>Regras de Distribuição</LabelPremium>
                        <TextareaPremium
                          {...register('part_lucro_regras')}
                          placeholder="Descreva como será feita a distribuição dos lucros..."
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* Benefícios Extras */}
                  <div className="space-y-2">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        beneficios
                          ? 'border-[#d500f9] bg-[#d500f9]/5'
                          : 'border-border hover:bg-secondary/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        {...register('beneficios')}
                        className="h-5 w-5 rounded border-gray-300 accent-[#d500f9]"
                      />
                      <span className="text-foreground text-sm font-medium">
                        Benefícios Extras
                      </span>
                    </label>

                    {beneficios && (
                      <div className="animate-in slide-in-from-top-2 fade-in ml-2 border-l-2 border-[#d500f9]/30 pl-4 duration-300">
                        <LabelPremium>Detalhamento dos Benefícios</LabelPremium>
                        <TextareaPremium
                          {...register('beneficios_regras')}
                          placeholder="Liste os benefícios e as regras de elegibilidade..."
                          rows={3}
                        />
                      </div>
                    )}
                  </div>

                  {/* Repasse */}
                  <label className="border-border hover:bg-secondary/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      {...register('repasse')}
                      className="h-5 w-5 rounded border-gray-300 accent-[#d500f9]"
                    />
                    <span className="text-foreground text-sm font-medium">
                      Permite Repasse de Tokens
                    </span>
                  </label>

                  {/* Termos Legais */}
                  <label className="border-border hover:bg-secondary/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      {...register('termos')}
                      className="h-5 w-5 rounded border-gray-300 accent-[#d500f9]"
                    />
                    <span className="text-foreground text-sm font-medium">
                      Aceite dos Termos Legais
                    </span>
                  </label>
                </div>
              </CardPremium>

              <CardPremium
                title="Selos & Certificações"
                action={
                  <button
                    type="button"
                    onClick={() =>
                      appendSelo({ id: Date.now(), nome: '', url: '' })
                    }
                    className="flex items-center gap-1 text-xs text-[#d500f9] hover:underline"
                  >
                    <Plus size={12} /> Adicionar
                  </button>
                }
              >
                <div className="space-y-3">
                  {selosFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="border-border bg-background/50 flex items-center gap-4 rounded-lg border p-3"
                    >
                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
                        <InputPremium
                          {...register(`selos.${index}.nome`)}
                          placeholder="Nome do selo/certificação"
                        />
                        <InputPremium
                          {...register(`selos.${index}.url`)}
                          placeholder="URL de verificação"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSelo(index)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  {selosFields.length === 0 && (
                    <p className="text-muted-foreground py-4 text-center text-sm italic">
                      Nenhum selo adicionado.
                    </p>
                  )}
                </div>
              </CardPremium>

              <CardPremium title="Prêmios & Reconhecimentos">
                <div className="space-y-4">
                  <label className="border-border hover:bg-secondary/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                    <input
                      type="checkbox"
                      {...register('premio')}
                      className="h-5 w-5 rounded border-gray-300 accent-[#d500f9]"
                    />
                    <span className="text-foreground text-sm font-medium">
                      Startup possui prêmios ou reconhecimentos
                    </span>
                  </label>

                  {premio && (
                    <div className="animate-in slide-in-from-top-2 fade-in space-y-4 rounded-lg border border-[#d500f9]/20 bg-[#d500f9]/5 p-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <LabelPremium>Data do Prêmio</LabelPremium>
                          <InputPremium
                            type="date"
                            {...register('premio_dt')}
                          />
                        </div>
                        <div>
                          <LabelPremium>Nome/Categoria do Prêmio</LabelPremium>
                          <InputPremium
                            {...register('premio_pg')}
                            placeholder="Ex: Melhor Startup Fintech 2023"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardPremium>

              <CardPremium title="Status Administrativo">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <LabelPremium>Status Cliente</LabelPremium>
                    <select
                      {...register('ativo')}
                      className="border-border bg-background text-foreground w-full rounded-lg border px-4 py-2.5 text-sm focus:border-[#d500f9] focus:outline-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                      <option value="pausado">Pausado</option>
                    </select>
                  </div>
                  <div>
                    <LabelPremium>Status Administrativo</LabelPremium>
                    <select
                      {...register('ativo_adm')}
                      className="border-border bg-background text-foreground w-full rounded-lg border px-4 py-2.5 text-sm focus:border-[#d500f9] focus:outline-none"
                    >
                      <option value="">Selecione...</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="pendente">Pendente</option>
                      <option value="rejeitado">Rejeitado</option>
                      <option value="em_analise">Em Análise</option>
                    </select>
                  </div>
                </div>
              </CardPremium>
            </div>
          )}
        </div>
      </main>

      {/* Action Bar Sticky Bottom */}
      <div className="border-border bg-background shrink-0 border-t p-4 backdrop-blur-lg">
        <div className="container mx-auto flex max-w-6xl justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="border-border text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || Math.abs(totalRecursos - 100) >= 0.1}
            className="flex items-center gap-2 rounded-lg bg-[#d500f9] px-8 py-2.5 text-sm font-medium text-white shadow-[0_4px_14px_rgba(213,0,249,0.4)] transition-all hover:bg-[#e040fb] hover:shadow-[0_6px_20px_rgba(213,0,249,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              'Salvando...'
            ) : (
              <>
                <Save size={16} /> Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
