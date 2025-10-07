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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { BotaoIselfBioWebcam } from '../botao-iselfbio-webcam';
import SelectPais from './select_pais';
import SelectUf from './select_uf';
import SelectCity from './select_city';

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
      termos: perfil?.termos ?? false,
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
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-8">
      {/* Dados Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados Pessoais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Seu nome completo"
                className={errors.nome ? 'border-red-500' : ''}
              />
              {errors.nome && (
                <span className="text-sm text-red-500">{errors.nome.message}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dt_nascimento">Data de Nascimento</Label>
              <Input
                id="dt_nascimento"
                type="date"
                {...register('dt_nascimento')}
                className={errors.dt_nascimento ? 'border-red-500' : ''}
              />
              {errors.dt_nascimento && (
                <span className="text-sm text-red-500">{errors.dt_nascimento.message}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Contato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="seu@email.com"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <span className="text-sm text-red-500">{errors.email.message}</span>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                {...register('telefone')}
                placeholder="(99) 99999-9999"
                onChange={(e) => setValue('telefone', applyPhoneMask(e.target.value))}
                className={errors.telefone ? 'border-red-500' : ''}
              />
              {errors.telefone && (
                <span className="text-sm text-red-500">{errors.telefone.message}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pais">País</Label>
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

            <div className="grid gap-2">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                {...register('cep')}
                placeholder="99999-999"
                onChange={(e) => {
                  const masked = applyCepMask(e.target.value);
                  setValue('cep', masked);
                  handleCepChange(masked);
                }}
                className="w-40"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="uf">UF</Label>
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

            <div className="grid gap-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                {...register('numero')}
                placeholder="123"
                className="w-40"
              />
            </div>
          </div>

          <div className="flex w-full gap-4">
            <div className="grid w-full gap-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                {...register('endereco')}
                placeholder="Rua, Avenida, etc."
              />
            </div>
          </div>

          <div className="flex w-full gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cidade">Cidade</Label>
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
            <div className="grid gap-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input
                id="bairro"
                {...register('bairro')}
                placeholder="Centro"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documento de Identificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="h-5 w-5" />
            Documento de Identificação
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label>Tipo de Documento</Label>
              <Controller
                name="tipo_documento"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
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

            <div className="grid gap-2">
              <Label htmlFor="reg_documento">Número do Documento</Label>
              <Input
                id="reg_documento"
                {...register('reg_documento')}
                placeholder="000.000.000-00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Biometria e Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Biometria e Avatar
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="grid gap-3">
              <Label>Avatar</Label>
              <CampoAvatarUpload accept="image/*" onChange={setAvatarFile} />
              <p className="text-muted-foreground text-xs">
                Envie uma foto sua (JPG, PNG, máx. 2MB)
              </p>
            </div>

            <div className="grid gap-3">
              <Label>Documento</Label>
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

          <Separator />

          <div className="grid gap-3">
            <Label>Captura Biométrica (iSelfBio)</Label>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-lg p-2">
                  <Camera className="text-primary h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Capturar foto via webcam</p>
                  <p className="text-muted-foreground text-sm">
                    {webcamBase64 ? 'Foto capturada com sucesso' : 'Nenhuma foto capturada'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {webcamBase64 && (
                  <Badge className="bg-green-100 text-green-800">✓ Capturada</Badge>
                )}
                <BotaoIselfBioWebcam label="Capturar" onCapture={setWebcamBase64} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Fundador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Informações de Fundador
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 font-semibold text-blue-900">Captação de Investimento</h3>
            <p className="mb-4 text-sm text-blue-800">
              Se você possui uma startup e deseja incluí-la em nosso processo de captação de
              investimentos, marque a opção abaixo.
            </p>

            <div className="flex items-start space-x-3">
              <Controller
                name="incluir_startup_captacao"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="incluir_startup_captacao"
                    checked={!!field.value}
                    onCheckedChange={(value) => field.onChange(value === true)}
                    className="mt-1"
                  />
                )}
              />
              <Label htmlFor="incluir_startup_captacao" className="text-sm leading-relaxed text-blue-900">
                <strong>Eu tenho uma startup e quero incluí-la para captação</strong>
              </Label>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start space-x-2">
              <Controller
                name="termos_fundador"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="termos_fundador"
                    checked={!!field.value}
                    onCheckedChange={(value) => field.onChange(value === true)}
                    className="mt-1"
                  />
                )}
              />
              <Label htmlFor="termos_fundador" className="text-sm">
                Li e aceito os termos específicos para fundadores de startup{' '}
                <a
                  href={termosFundadorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline hover:text-blue-800"
                >
                  (ver termos)
                </a>
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informações Adicionais
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-4">
            <div className="flex items-center space-x-2">
              <Controller
                name="termos"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="termos"
                    checked={!!field.value}
                    onCheckedChange={(value) => field.onChange(value === true)}
                  />
                )}
              />
              <Label htmlFor="termos" className="text-sm">
                Aceito os termos e condições de uso
              </Label>
            </div>

            {perfil?.status && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Input
                  id="status"
                  value={perfil.status}
                  disabled
                  className="bg-muted"
                />
                <p className="text-muted-foreground text-xs">Campo somente leitura</p>
              </div>
            )}

            {perfil?.role && (
              <div className="grid gap-2">
                <Label>Role/Perfil</Label>
                <Badge variant="outline" className="w-fit">
                  {perfil.role.charAt(0).toUpperCase() + perfil.role.slice(1)}
                </Badge>
                <p className="text-muted-foreground text-xs">Campo somente leitura</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-3 pt-6">
        <Button type="button" variant="outline" disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Salvando...
            </div>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </div>
    </form>
  );
}
