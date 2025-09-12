"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { CampoAvatarUpload } from "./campo-avatar-upload";
import { CampoDocumentoUpload } from "./campo-documento-upload";
import { BotaoIselfBioWebcam } from "./botao-iselfbio-webcam";
import { applyPhoneMask, applyCepMask } from "@/lib/mask-utils";
import { User, Phone, MapPin, Camera, IdCard, FileText, Building } from "lucide-react";

// Tipos básicos alinhados ao que a page já usa
export type PerfilMin = {
  id?: string | number;
  nome?: string;
  email?: string;
  role?: "fundador" | "afiliado" | "admin" | "investidor";
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

// Schema Zod completo para validação do formulário de perfil
const schema = z.object({
  // Dados Pessoais
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome deve ter no máximo 100 caracteres"),
  dt_nascimento: z.string().refine(v => !Number.isNaN(Date.parse(v)), {
    message: "Data de nascimento inválida",
  }).optional(),
  
  // Contato
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  
  // Endereço
  cep: z.string().min(9, "CEP inválido").optional(),
  endereco: z.string().min(3, "Endereço deve ter pelo menos 3 caracteres").optional(),
  numero: z.string().min(1, "Número é obrigatório").optional(),
  bairro: z.string().min(2, "Bairro deve ter pelo menos 2 caracteres").optional(),
  cidade: z.string().min(2, "Cidade deve ter pelo menos 2 caracteres").optional(),
  uf: z.string().length(2, "UF deve ter 2 caracteres").optional(),
  pais: z.string().min(2, "País deve ter pelo menos 2 caracteres").optional(),
  
  // Documento de Identificação
  tipo_documento: z.string().min(1, "Selecione o tipo de documento").optional(),
  reg_documento: z.string().min(3, "Número do documento deve ter pelo menos 3 caracteres").optional(),
  documento: z.string().url("URL inválida").optional(),
  
  // Biometria e Avatar
  bio_facial: z.string().url("URL inválida").optional(),
  
  // Outros
  termos: z.boolean().optional(),
  status: z.string().optional(),
  
  // Fundador
  fundador: z.boolean().optional(),
  incluir_startup_captacao: z.boolean().optional(),
  termos_fundador: z.boolean().optional(),
});

export type PerfilFormValues = z.infer<typeof schema>;

export type PerfilFormProps = {
  perfil?: PerfilMin | null;
};

export function PerfilForm({ perfil }: PerfilFormProps) {
  const defaultValues = useMemo<PerfilFormValues>(() => ({
    nome: perfil?.nome ?? "",
    dt_nascimento: perfil?.dt_nascimento ?? "",
    email: perfil?.email ?? "",
    telefone: perfil?.telefone ?? "",
    cep: perfil?.cep ?? "",
    endereco: perfil?.endereco ?? "",
    numero: perfil?.numero ?? "",
    bairro: perfil?.bairro ?? "",
    cidade: perfil?.cidade ?? "",
    uf: perfil?.uf ?? "",
    pais: perfil?.pais ?? "BR",
    tipo_documento: perfil?.tipo_documento ?? "",
    documento: perfil?.documento ?? "",
    bio_facial: perfil?.bio_facial ?? "",
    termos: perfil?.termos ?? false,
    status: perfil?.status ?? "",
    fundador: perfil?.fundador ?? false,
    incluir_startup_captacao: false,
    termos_fundador: false,
    reg_documento: perfil?.reg_documento ?? "",
  }), [perfil]);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PerfilFormValues>({ resolver: zodResolver(schema), defaultValues });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [webcamBase64, setWebcamBase64] = useState<string | null>(null);
  
  // Auto-preenchimento de endereço via CEP
  const handleCepChange = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setValue("endereco", data.logradouro || "");
          setValue("bairro", data.bairro || "");
          setValue("cidade", data.localidade || "");
          setValue("uf", data.uf || "");
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      }
    }
  }, [setValue]);
  
  // Handlers de máscara
  const handleTelefoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyPhoneMask(e.target.value);
    setValue("telefone", masked);
  }, [setValue]);
  
  const handleCepChangeWithMask = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCepMask(e.target.value);
    setValue("cep", masked);
    handleCepChange(masked);
  }, [setValue, handleCepChange]);

  const onSubmit = useCallback(async (values: PerfilFormValues) => {
    try {
      const formData = new FormData();
      
      // Dados pessoais
      formData.set("nome", values.nome);
      if (values.dt_nascimento) formData.set("dt_nascimento", values.dt_nascimento);
      
      // Contato
      formData.set("email", values.email);
      formData.set("telefone", values.telefone);
      
      // Endereço
      if (values.cep) formData.set("cep", values.cep);
      if (values.endereco) formData.set("endereco", values.endereco);
      if (values.numero) formData.set("numero", values.numero);
      if (values.bairro) formData.set("bairro", values.bairro);
      if (values.cidade) formData.set("cidade", values.cidade);
      if (values.uf) formData.set("uf", values.uf);
      if (values.pais) formData.set("pais", values.pais);
      
      // Documento
      if (values.tipo_documento) formData.set("tipo_documento", values.tipo_documento);
      if (values.reg_documento) formData.set("reg_documento", values.reg_documento);
      if (values.documento) formData.set("documento", values.documento);
      
      // Outros
      if (values.termos !== undefined) formData.set("termos", values.termos.toString());
      if (values.status) formData.set("status", values.status);
      
      // Fundador
      if (values.fundador !== undefined) formData.set("fundador", values.fundador.toString());
      if (values.incluir_startup_captacao !== undefined) formData.set("incluir_startup_captacao", values.incluir_startup_captacao.toString());
      if (values.termos_fundador !== undefined) formData.set("termos_fundador", values.termos_fundador.toString());
      
      // Arquivos
      if (avatarFile) formData.set("avatar", avatarFile);
      if (docFile) formData.set("documento", docFile);
      if (webcamBase64) formData.set("bio_facial", webcamBase64);

      const res = await fetch("/api/perfil", {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao atualizar perfil");
      }

      const result = await res.json();
      if (result.status === 'success') {
        toast.success(result.message || "Perfil atualizado com sucesso");
        // Opcionalmente, recarregar a página ou atualizar estado
        window.location.reload();
      } else {
        throw new Error(result.message || "Erro ao atualizar perfil");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar perfil";
      toast.error(message);
    }
  }, [avatarFile, docFile, webcamBase64]);

  // URL dos Termos do Fundador (pode ser site externo). Configure NEXT_PUBLIC_TERMS_URL_FUNDADOR no .env
  const termosFundadorUrl = (process.env.NEXT_PUBLIC_TERMS_URL_FUNDADOR ?? "/termos");

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
                {...register("nome")} 
                placeholder="Seu nome completo"
                className={errors.nome ? "border-red-500" : ""}
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
                {...register("dt_nascimento")} 
                className={errors.dt_nascimento ? "border-red-500" : ""}
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
                {...register("email")} 
                placeholder="seu@email.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <span className="text-sm text-red-500">{errors.email.message}</span>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input 
                id="telefone" 
                {...register("telefone")} 
                placeholder="(99) 99999-9999"
                onChange={handleTelefoneChange}
                className={errors.telefone ? "border-red-500" : ""}
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
        <CardContent className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="cep">CEP</Label>
              <Input 
                id="cep" 
                {...register("cep")} 
                placeholder="99999-999"
                onChange={handleCepChangeWithMask}
                className={errors.cep ? "border-red-500" : ""}
              />
              {errors.cep && (
                <span className="text-sm text-red-500">{errors.cep.message}</span>
              )}
            </div>
            
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input 
                id="endereco" 
                {...register("endereco")} 
                placeholder="Rua, Avenida, etc."
                className={errors.endereco ? "border-red-500" : ""}
              />
              {errors.endereco && (
                <span className="text-sm text-red-500">{errors.endereco.message}</span>
              )}
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="numero">Número</Label>
              <Input 
                id="numero" 
                {...register("numero")} 
                placeholder="123"
                className={errors.numero ? "border-red-500" : ""}
              />
              {errors.numero && (
                <span className="text-sm text-red-500">{errors.numero.message}</span>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Input 
                id="bairro" 
                {...register("bairro")} 
                placeholder="Centro"
                className={errors.bairro ? "border-red-500" : ""}
              />
              {errors.bairro && (
                <span className="text-sm text-red-500">{errors.bairro.message}</span>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input 
                id="cidade" 
                {...register("cidade")} 
                placeholder="São Paulo"
                className={errors.cidade ? "border-red-500" : ""}
              />
              {errors.cidade && (
                <span className="text-sm text-red-500">{errors.cidade.message}</span>
              )}
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="uf">UF</Label>
              <Input 
                id="uf" 
                {...register("uf")} 
                placeholder="SP"
                maxLength={2}
                className={errors.uf ? "border-red-500" : ""}
              />
              {errors.uf && (
                <span className="text-sm text-red-500">{errors.uf.message}</span>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="pais">País</Label>
              <Controller
                name="pais"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o país" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BR">Brasil</SelectItem>
                      <SelectItem value="AR">Argentina</SelectItem>
                      <SelectItem value="US">Estados Unidos</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="ES">Espanha</SelectItem>
                    </SelectContent>
                  </Select>
                )}
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
              {errors.tipo_documento && (
                <span className="text-sm text-red-500">{errors.tipo_documento.message}</span>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="reg_documento">Número do Documento</Label>
              <Input 
                id="reg_documento" 
                {...register("reg_documento")} 
                placeholder="000.000.000-00"
                className={errors.reg_documento ? "border-red-500" : ""}
              />
              {errors.reg_documento && (
                <span className="text-sm text-red-500">{errors.reg_documento.message}</span>
              )}
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
              <p className="text-xs text-muted-foreground">
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
              <p className="text-xs text-muted-foreground">
                Envie uma foto do documento (JPG, PNG, PDF, máx. 5MB)
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid gap-3">
            <Label>Captura Biométrica (iSelfBio)</Label>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Capturar foto via webcam</p>
                  <p className="text-sm text-muted-foreground">
                    {webcamBase64 ? "Foto capturada com sucesso" : "Nenhuma foto capturada"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {webcamBase64 && (
                  <Badge className="bg-green-100 text-green-800">
                    ✓ Capturada
                  </Badge>
                )}
                <BotaoIselfBioWebcam label="Capturar" onCapture={setWebcamBase64} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Fundador - Sempre Visível */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Informações de Fundador
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                Captação de Investimento
              </h3>
              <p className="text-sm text-blue-800 mb-4">
                Se você possui uma startup e deseja incluí-la em nosso processo de captação de investimentos, 
                marque a opção abaixo. Isso permitirá que investidores tenham acesso ao seu projeto.
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
                      className="mt-1 border-zinc-600 hover:border-zinc-700 focus-visible:ring-zinc-500 dark:border-zinc-500 dark:hover:border-zinc-400"
                    />
                  )}
                />
                <Label htmlFor="incluir_startup_captacao" className="text-sm text-blue-900 leading-relaxed">
                  <strong>Eu tenho uma startup e quero incluí-la para captação</strong>
                  <br />
                  <span className="text-blue-700 text-xs">
                    Ao marcar esta opção, sua startup ficará visível para investidores em nossa plataforma
                  </span>
                </Label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Termos Específicos para Fundadores</h4>
              <div className="p-3 bg-gray-50 rounded-md mb-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong>
                    <a
                      href={termosFundadorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-blue-700 hover:text-blue-800"
                    >
                      Termos e Condições para Fundadores
                    </a>:
                  </strong><br />
                  • Ao incluir sua startup na plataforma, você autoriza a divulgação das informações fornecidas para investidores qualificados.<br />
                  • As informações da startup podem ser utilizadas para análise de investimento e due diligence.<br />
                  • Você se compromete a fornecer informações verdadeiras e atualizadas sobre sua empresa.<br />
                  • A plataforma não garante captação de investimento, servindo apenas como facilitadora do processo.<br />
                  • Você pode remover sua startup da plataforma a qualquer momento através do seu painel de controle.
                </p>
              </div>
              
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
                  Li e aceito os termos específicos para fundadores de startup
                  {" "}
                  <a
                    href={termosFundadorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-700 hover:text-blue-800"
                  >
                    (ver termos)
                  </a>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Outros Campos */}
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
            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Input 
                id="status" 
                {...register("status")} 
                placeholder="Status da conta"
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Campo somente leitura
              </p>
            </div>
            
            {perfil?.role && (
              <div className="grid gap-2">
                <Label>Role/Perfil</Label>
                <Badge variant="outline" className="w-fit">
                  {perfil.role.charAt(0).toUpperCase() + perfil.role.slice(1)}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Campo somente leitura
                </p>
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
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Salvando...
            </div>
          ) : (
            "Salvar Alterações"
          )}
        </Button>
      </div>
    </form>
  );
}
