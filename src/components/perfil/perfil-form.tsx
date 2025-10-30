'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CampoAvatarUpload } from './campo-avatar-upload';
import { CampoDocumentoUpload } from './campo-documento-upload';
import { applyPhoneMask, applyCepMask } from '@/lib/mask-utils';
import {
  User,
  Phone,
  MapPin,
  Camera,
  IdCard,
  FileText,
  Building,
  Save,
  X,
} from 'lucide-react';
import { BotaoIselfBioWebcam } from '../botao-iselfbio-webcam';
import SelectPais from './select_pais';
import SelectUf from './select_uf';
import SelectCity from './select_city';

/**
 * Converte valores vindos da API (booleanos, numéricos ou strings) em booleano consistente.
 * Garante que campos de checkbox reflitam corretamente o estado salvo no backend.
 */
function normalizarValorBooleano(valor?: unknown): boolean {
  if (typeof valor === 'boolean') {
    return valor;
  }

  if (typeof valor === 'number') {
    return valor === 1;
  }

  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase();

    if (['true', '1', 'on', 'sim', 'yes'].includes(normalizado)) {
      return true;
    }

    if (['false', '0', 'off', 'nao', 'não', 'no'].includes(normalizado)) {
      return false;
    }
  }

  return false;
}

export type PerfilMin = {
  id?: number;
  nome?: string;
  email?: string;
  role?: 'fundador' | 'afiliado' | 'admin' | 'investidor';
  telefone?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
  dt_nascimento?: string;
  bio_facial?: string;
  avatar?: string;
  tipo_documento?: string;
  reg_documento?: string;
  documento?: string;
  termos?: boolean;
  status?: string;
  startups?: unknown[];
  indicados?: unknown[];
  fundador?: boolean;
  afiliado?: boolean;
  persent_ganho?: number;
};

// Schema simplificado - campos opcionais quando vazios
const schema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  dt_nascimento: z.string().optional(),
  email: z.string().email('Email inválido'),
  telefone: z.string().min(10, 'Telefone inválido'),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  pais: z.string().optional(),
  tipo_documento: z.string().optional(),
  reg_documento: z.string().optional(),
  termos: z.boolean().optional(),
  incluir_startup_captacao: z.boolean().optional(),
  termos_fundador: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export type PerfilFormProps = {
  perfil: PerfilMin;
};

export function PerfilForm({ perfil }: PerfilFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [webcamBase64, setWebcamBase64] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: perfil?.nome ?? '',
      dt_nascimento: perfil?.dt_nascimento ?? '',
      email: perfil?.email ?? '',
      telefone: perfil?.telefone ?? '',
      cep: perfil?.cep ? perfil.cep.replace(/(\d{5})(\d{3})/, '$1-$2') : '',
      endereco: perfil?.endereco ?? '',
      numero: perfil?.numero ?? '',
      bairro: perfil?.bairro ?? '',
      cidade: perfil?.cidade ?? '',
      uf: perfil?.uf ?? '',
      pais: perfil?.pais ?? 'BRA',
      tipo_documento: perfil?.tipo_documento ?? '',
      reg_documento: perfil?.reg_documento ?? '',
      termos: normalizarValorBooleano(perfil?.termos),
      incluir_startup_captacao: false,
      termos_fundador: false,
    },
  });

  // Buscar CEP
  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setValue('endereco', data.logradouro || '');
          setValue('bairro', data.bairro || '');
          setValue('cidade', data.localidade || '');
          setValue('uf', data.uf || '');
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();

      // Campos básicos
      formData.append('nome', values.nome);
      formData.append('email', values.email.trim());
      formData.append('telefone', values.telefone.replace(/\D/g, ''));

      // Campos opcionais
      if (values.dt_nascimento) formData.append('dt_nascimento', values.dt_nascimento);
      if (values.cep) formData.append('cep', values.cep.replace(/\D/g, ''));
      if (values.endereco) formData.append('endereco', values.endereco);
      if (values.numero) formData.append('numero', values.numero);
      if (values.bairro) formData.append('bairro', values.bairro);
      if (values.cidade) formData.append('cidade', values.cidade);
      if (values.uf) formData.append('uf', values.uf);
      if (values.pais) formData.append('pais', values.pais);
      if (values.tipo_documento) formData.append('tipo_documento', values.tipo_documento);
      if (values.reg_documento) formData.append('reg_documento', values.reg_documento.replace(/\D/g, ''));

      // Booleans
      formData.append('termos', String(values.termos ?? false));
      formData.append('incluir_startup_captacao', String(values.incluir_startup_captacao ?? false));
      formData.append('termos_fundador', String(values.termos_fundador ?? false));

      // Arquivos
      if (avatarFile) formData.append('avatar', avatarFile);
      if (docFile) formData.append('documento', docFile);
      if (webcamBase64) formData.append('bio_facial', webcamBase64);

      const res = await fetch(`/api/perfil/${perfil.id}`, {
        method: 'PUT',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.message || 'Falha ao atualizar perfil');
      }

      toast.success(result.message || 'Perfil atualizado com sucesso');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil';
      toast.error(message);
      console.error('Erro no submit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const termosFundadorUrl = process.env.NEXT_PUBLIC_TERMS_URL_FUNDADOR ?? '/termos';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Tabs defaultValue="pessoal" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:inline-grid lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="pessoal" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Dados Pessoais</span>
            <span className="sm:hidden">Pessoal</span>
          </TabsTrigger>
          <TabsTrigger value="endereco" className="gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Endereço</span>
            <span className="sm:hidden">Local</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <IdCard className="h-4 w-4" />
            <span className="hidden sm:inline">Documentos</span>
            <span className="sm:hidden">Docs</span>
          </TabsTrigger>
          <TabsTrigger value="fundador" className="gap-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Fundador</span>
            <span className="sm:hidden">Startup</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Dados Pessoais */}
        <TabsContent value="pessoal" className="mt-6 space-y-6">
          <Card className="border-border bg-card transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <User className="text-primary h-5 w-5" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Mantenha suas informações pessoais atualizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-foreground">
                    Nome Completo *
                  </Label>
                  <Input
                    id="nome"
                    {...register('nome')}
                    placeholder="Seu nome completo"
                    className={`transition-colors ${errors.nome ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                  />
                  {errors.nome && (
                    <span className="flex items-center gap-1 text-sm text-red-500">
                      <span className="text-xs">⚠</span> {errors.nome.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dt_nascimento" className="text-foreground">
                    Data de Nascimento
                  </Label>
                  <Input
                    id="dt_nascimento"
                    type="date"
                    {...register('dt_nascimento')}
                    className={`transition-colors ${errors.dt_nascimento ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-primary'}`}
                  />
                  {errors.dt_nascimento && (
                    <span className="flex items-center gap-1 text-sm text-red-500">
                      <span className="text-xs">⚠</span>{' '}
                      {errors.dt_nascimento.message}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Phone className="text-blue h-5 w-5" />
                Contato
              </CardTitle>
              <CardDescription>
                Informações de contato para comunicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">
                    E-mail *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="seu@email.com"
                    className={`transition-colors ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-blue'}`}
                  />
                  {errors.email && (
                    <span className="flex items-center gap-1 text-sm text-red-500">
                      <span className="text-xs">⚠</span> {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone" className="text-foreground">
                    Telefone *
                  </Label>
                  <Input
                    id="telefone"
                    {...register('telefone')}
                    placeholder="(99) 99999-9999"
                    onChange={(e) =>
                      setValue('telefone', applyPhoneMask(e.target.value))
                    }
                    className={`transition-colors ${errors.telefone ? 'border-red-500 focus-visible:ring-red-500' : 'focus-visible:ring-blue'}`}
                  />
                  {errors.telefone && (
                    <span className="flex items-center gap-1 text-sm text-red-500">
                      <span className="text-xs">⚠</span>{' '}
                      {errors.telefone.message}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Endereço */}
        <TabsContent value="endereco" className="mt-6">
          <Card className="border-border bg-card transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <MapPin className="text-green h-5 w-5" />
                Endereço Completo
              </CardTitle>
              <CardDescription>
                Preencha seu endereço para localização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="pais" className="text-foreground">
                    País
                  </Label>
                  <Controller
                    name="pais"
                    control={control}
                    render={({ field }) => (
                      <SelectPais
                        value={field.value}
                        onChange={field.onChange}
                        isLoading={() => {}}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep" className="text-foreground">
                    CEP
                  </Label>
                  <Input
                    id="cep"
                    {...register('cep')}
                    placeholder="99999-999"
                    onChange={(e) => {
                      const masked = applyCepMask(e.target.value);
                      setValue('cep', masked);
                      handleCepChange(masked);
                    }}
                    className="focus-visible:ring-green"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uf" className="text-foreground">
                    UF
                  </Label>
                  <Controller
                    name="uf"
                    control={control}
                    render={({ field }) => (
                      <SelectUf
                        pais={watch('pais') || 'BRA'}
                        value={field.value || ''}
                        onChange={field.onChange}
                        isLoading={false}
                        IsLoadingState={() => {}}
                      />
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero" className="text-foreground">
                    Número
                  </Label>
                  <Input
                    id="numero"
                    {...register('numero')}
                    placeholder="123"
                    className="focus-visible:ring-green"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco" className="text-foreground">
                  Endereço
                </Label>
                <Input
                  id="endereco"
                  {...register('endereco')}
                  placeholder="Rua, Avenida, etc."
                  className="focus-visible:ring-green"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cidade" className="text-foreground">
                    Cidade
                  </Label>
                  <Controller
                    name="cidade"
                    control={control}
                    render={({ field }) => (
                      <SelectCity
                        pais={watch('pais') || 'BRA'}
                        uf={watch('uf') || ''}
                        value={field.value || ''}
                        onChange={field.onChange}
                        isLoading={false}
                        isLoadingState={false}
                      />
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro" className="text-foreground">
                    Bairro
                  </Label>
                  <Input
                    id="bairro"
                    {...register('bairro')}
                    placeholder="Centro"
                    className="focus-visible:ring-green"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Documentos */}
        <TabsContent value="documentos" className="mt-6 space-y-6">
          <Card className="border-border bg-card transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <IdCard className="text-primary h-5 w-5" />
                Documento de Identificação
              </CardTitle>
              <CardDescription>
                Informações do seu documento oficial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-foreground">Tipo de Documento</Label>
                  <Controller
                    name="tipo_documento"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="focus:ring-primary">
                          <SelectValue placeholder="Selecione o tipo de documento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPF">CPF</SelectItem>
                          <SelectItem value="RG">RG</SelectItem>
                          <SelectItem value="DNI">DNI</SelectItem>
                          <SelectItem value="Passport">Passport</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg_documento" className="text-foreground">
                    Número do Documento
                  </Label>
                  <Input
                    id="reg_documento"
                    {...register('reg_documento')}
                    placeholder="000.000.000-00"
                    className="focus-visible:ring-primary"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Camera className="text-blue h-5 w-5" />
                Biometria e Arquivos
              </CardTitle>
              <CardDescription>
                Upload de avatar, documentos e captura biométrica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label className="text-foreground">Avatar</Label>
                  <CampoAvatarUpload
                    accept="image/*"
                    onChange={setAvatarFile}
                  />
                  <p className="text-muted-foreground text-xs">
                    Envie uma foto sua (JPG, PNG, máx. 2MB)
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-foreground">Documento</Label>
                  <CampoDocumentoUpload
                    accept="image/*,application/pdf"
                    maxSizeMB={5}
                    onChange={setDocFile}
                  />
                  <p className="text-muted-foreground text-xs">
                    Envie uma foto do documento (JPG, PNG, PDF, máx. 5MB)
                  </p>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="space-y-3">
                <Label className="text-foreground">
                  Captura Biométrica (iSelfBio)
                </Label>
                <div className="border-border bg-muted/30 hover:bg-muted/50 flex flex-col gap-4 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-lg p-3">
                      <Camera className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">
                        Capturar foto via webcam
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {webcamBase64
                          ? 'Foto capturada com sucesso'
                          : 'Nenhuma foto capturada'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {webcamBase64 && (
                      <Badge className="bg-green/10 text-green hover:bg-green/20">
                        <svg
                          className="mr-1 h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Capturada
                      </Badge>
                    )}
                    <BotaoIselfBioWebcam
                      label="Capturar"
                      onCapture={setWebcamBase64}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Fundador */}
        <TabsContent value="fundador" className="mt-6 space-y-6">
          <Card className="border-border bg-card transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building className="text-primary h-5 w-5" />
                Informações de Fundador
              </CardTitle>
              <CardDescription>
                Configure sua participação como fundador de startup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-blue/20 bg-blue/5 dark:border-blue/30 dark:bg-blue/10 rounded-xl border p-6">
                <div className="mb-4 flex items-start gap-3">
                  <div className="bg-blue/10 dark:bg-blue/20 rounded-lg p-2">
                    <Building className="text-blue h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1 font-semibold">
                      Captação de Investimento
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Se você possui uma startup e deseja incluí-la em nosso
                      processo de captação de investimentos, marque a opção
                      abaixo.
                    </p>
                  </div>
                </div>

                <div className="bg-background/50 dark:bg-background/30 flex items-start space-x-3 rounded-lg p-4">
                  <Controller
                    name="incluir_startup_captacao"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        id="incluir_startup_captacao"
                        checked={!!field.value}
                        onCheckedChange={(value) =>
                          field.onChange(value === true)
                        }
                        className="data-[state=checked]:bg-blue data-[state=checked]:border-blue mt-1"
                      />
                    )}
                  />
                  <Label
                    htmlFor="incluir_startup_captacao"
                    className="text-foreground cursor-pointer text-sm leading-relaxed"
                  >
                    <strong>
                      Eu tenho uma startup e quero incluí-la para captação
                    </strong>
                  </Label>
                </div>
              </div>

              <Separator className="bg-border" />

              <div className="border-border bg-muted/30 flex items-start space-x-3 rounded-lg border p-4">
                <Controller
                  name="termos_fundador"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="termos_fundador"
                      checked={!!field.value}
                      onCheckedChange={(value) =>
                        field.onChange(value === true)
                      }
                      className="mt-1"
                    />
                  )}
                />
                <Label
                  htmlFor="termos_fundador"
                  className="text-foreground cursor-pointer text-sm leading-relaxed"
                >
                  Li e aceito os termos específicos para fundadores de startup{' '}
                  <a
                    href={termosFundadorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue hover:text-blue/80 font-medium underline"
                  >
                    (ver termos)
                  </a>
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <FileText className="text-green h-5 w-5" />
                Informações Adicionais
              </CardTitle>
              <CardDescription>
                Termos de uso e informações do perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-border bg-muted/30 flex items-start space-x-3 rounded-lg border p-4">
                <Controller
                  name="termos"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="termos"
                      checked={!!field.value}
                      onCheckedChange={(value) =>
                        field.onChange(value === true)
                      }
                    />
                  )}
                />
                <Label
                  htmlFor="termos"
                  className="text-foreground cursor-pointer text-sm leading-relaxed"
                >
                  Aceito os termos e condições de uso
                </Label>
              </div>

              {(perfil?.status || perfil?.role) && (
                <div className="border-border bg-muted/30 space-y-4 rounded-lg border p-4">
                  <p className="text-muted-foreground text-sm font-medium">
                    Informações Somente Leitura
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {perfil?.role && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">
                          Perfil:
                        </span>
                        <Badge
                          variant="outline"
                          className="border-primary/30 bg-primary/5 text-primary"
                        >
                          {perfil.role.charAt(0).toUpperCase() +
                            perfil.role.slice(1)}
                        </Badge>
                      </div>
                    )}
                    {perfil?.status && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground text-sm">
                          Status:
                        </span>
                        <Badge
                          variant="outline"
                          className="border-green/30 bg-green/5 text-green"
                        >
                          {perfil.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Botões de Ação - Fixos no bottom */}
      <div className="border-border bg-card/95 sticky bottom-0 z-10 flex justify-end gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          className="hover:bg-muted gap-2"
        >
          <X className="h-4 w-4" />
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[150px] gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
