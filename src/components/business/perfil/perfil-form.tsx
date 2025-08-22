"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

import { CampoAvatarUpload } from "./campo-avatar-upload";
import { CampoDocumentoUpload } from "./campo-documento-upload";
import { BotaoIselfBioWebcam } from "./botao-iselfbio-webcam";

// Tipos básicos alinhados ao que a page já usa
export type PerfilMin = {
  id?: string | number;
  nome?: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  cidade?: string;
  uf?: string;
  pais?: string;
};

// Schema Zod para validação do formulário de perfil
const schema = z.object({
  nome: z.string().min(2, "Informe o nome"),
  telefone: z.string().min(8, "Informe o telefone"),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  pais: z.string().optional(),
  bio: z.string().max(500, "Máx. 500 caracteres").optional(),
  // Uploads são tratados fora do RHF via setValue quando necessário
});

export type PerfilFormValues = z.infer<typeof schema>;

export type PerfilFormProps = {
  perfil?: PerfilMin | null;
};

export function PerfilForm({ perfil }: PerfilFormProps) {
  const defaultValues = useMemo<PerfilFormValues>(() => ({
    nome: perfil?.nome ?? "",
    telefone: perfil?.telefone ?? "",
    cidade: perfil?.cidade ?? "",
    uf: perfil?.uf ?? "",
    pais: perfil?.pais ?? "",
    bio: "",
  }), [perfil]);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PerfilFormValues>({ resolver: zodResolver(schema), defaultValues });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [webcamBase64, setWebcamBase64] = useState<string | null>(null);

  const onSubmit = useCallback(async (values: PerfilFormValues) => {
    try {
      const formData = new FormData();
      formData.set("nome", values.nome);
      formData.set("telefone", values.telefone);
      if (values.cidade) formData.set("cidade", values.cidade);
      if (values.uf) formData.set("uf", values.uf);
      if (values.pais) formData.set("pais", values.pais);
      if (values.bio) formData.set("bio", values.bio);
      if (avatarFile) formData.set("avatar", avatarFile);
      if (docFile) formData.set("documento", docFile);
      if (webcamBase64) formData.set("webcamFoto", webcamBase64);

      const res = await fetch("/api/perfil", {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Falha ao atualizar perfil");
      }

      toast.success("Perfil atualizado com sucesso");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erro ao atualizar perfil";
      toast.error(message);
    }
  }, [avatarFile, docFile, webcamBase64]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="nome">Nome</label>
          <Input id="nome" {...register("nome")} placeholder="Seu nome" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="telefone">Telefone</label>
          <Input id="telefone" {...register("telefone")} placeholder="(99) 99999-9999" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="cidade">Cidade</label>
          <Input id="cidade" {...register("cidade")} placeholder="Cidade" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="uf">UF</label>
          <Input id="uf" {...register("uf")} placeholder="UF" />
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="pais">País</label>
          <Input id="pais" {...register("pais")} placeholder="País" />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium" htmlFor="bio">Bio</label>
        <textarea
          id="bio"
          {...register("bio")}
          placeholder="Fale sobre você (máx. 500 caracteres)"
          rows={4}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid gap-2">
          <CampoAvatarUpload accept="image/*" onChange={setAvatarFile} />
        </div>
        <div className="grid gap-2">
          <CampoDocumentoUpload accept="image/*,application/pdf" maxSizeMB={5} onChange={setDocFile} />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Captura via Webcam</label>
        <div className="flex items-center gap-3">
          <BotaoIselfBioWebcam label="Tirar foto" onCapture={setWebcamBase64} />
          {webcamBase64 ? (
            <span className="text-xs text-emerald-600">Foto capturada</span>
          ) : (
            <span className="text-xs text-zinc-500">Nenhuma foto capturada</span>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
