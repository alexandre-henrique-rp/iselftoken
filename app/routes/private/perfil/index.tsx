import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserCircle } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useLoaderData, useNavigation } from "react-router";
import { toast } from "sonner";
import type { DocType, UploadDoc } from "~/types/kyc";
import type { PerfilFormData, UserProfile } from "~/types/profile";
import { perfilSchema } from "~/types/schemas";
import type { User } from "~/types/user";
import type { Route } from "./+types";
import {
  DadosPessoaisForm,
  DocumentacaoForm,
  EnderecoForm,
  KycSection,
} from "./components";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Meu Perfil | iSelfToken" },
    {
      name: "description",
      content: "Gerencie seus dados pessoais e verificação KYC",
    },
  ];
}

const generoOptions = ["HOMEM", "MULHER", "NAO_INFORMADO"] as const;

/**
 * @name formatDateForInput
 * @description Converte data ISO para formato yyyy-MM-dd do input date
 *
 * @param {string} dateString - Data no formato ISO ou undefined
 * @returns {string} Data no formato yyyy-MM-dd ou string vazia
 */
function formatDateForInput(dateString?: string): string {
  if (!dateString) return "";
  // Extrai apenas a parte da data (yyyy-MM-dd) de uma string ISO
  const match = dateString.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

const mapGenero = (genero?: string): PerfilFormData["genero"] => {
  if (!genero) return "";

  return generoOptions.includes(genero as (typeof generoOptions)[number])
    ? (genero as PerfilFormData["genero"])
    : "";
};

function mapUserToFormData(user: UserProfile): PerfilFormData {
  return {
    nome: user.nome || "",
    email: user.email || "",
    telefone: user.telefone || "",
    data_nascimento: formatDateForInput(user.data_nascimento),
    genero: mapGenero(user.genero),
    endereco: user.endereco || "",
    numero: user.numero || "",
    complemento: user.complemento || "",
    bairro: user.bairro || "",
    cidade: user.cidade || "",
    uf: user.uf || "",
    cep: user.cep || "",
    pais: user.pais || undefined,
    tipo_documento: user.tipo_documento || "CPF",
    reg_documento: user.reg_documento || "",
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const response = await fetch(`${baseUrl}/api/user/me`, {
    headers: { Cookie: request.headers.get("cookie") ?? "" },
  });

  const data = await response.json();

  if (!response.ok) {
    return Response.json(
      { user: null, error: data.error || "Erro ao carregar perfil" },
      { status: response.status },
    );
  }

  return Response.json({ user: data.data, error: null });
}

export default function PerfilPage() {
  const { user, error } = useLoaderData<User | any>();
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";
  const isSubmitting = navigation.state === "submitting";

  const [uploads, setUploads] = useState<Record<DocType, UploadDoc>>({
    documento: {
      tipo: "documento",
      status: user?.documento_id ? "enviado" : "pendente",
    },
    comprovante: {
      tipo: "comprovante",
      status: user?.comprovante_id ? "enviado" : "pendente",
    },
    biofacial: {
      tipo: "biofacial",
      status: user?.biofacial_id ? "enviado" : "pendente",
    },
  });

  const methods = useForm<PerfilFormData>({
    resolver: zodResolver(perfilSchema),
    mode: "onSubmit",
    defaultValues: user ? mapUserToFormData(user) : undefined,
  });

  const handleUpload = async (tipo: DocType, file: File, preview: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tipo", tipo);

    toast.loading(`Enviando ${tipo}...`, { id: `upload-${tipo}` });

    const response = await fetch("/api/user/upload-doc", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      toast.error(data.error || "Erro no upload", { id: `upload-${tipo}` });
      return;
    }

    setUploads((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], arquivo: file, preview, status: "enviado" },
    }));

    toast.success("Documento enviado!", { id: `upload-${tipo}` });
  };

  const handleRemove = (tipo: DocType) => {
    setUploads((prev) => ({
      ...prev,
      [tipo]: { tipo, status: "pendente" },
    }));
  };

  const onSubmit = async (data: PerfilFormData) => {
    toast.loading("Salvando...", { id: "save-profile" });

    // Remove máscara do telefone antes de enviar
    const payload = {
      ...data,
      telefone: data.telefone.replace(/\D/g, ""),
    };

    const response = await fetch("/api/user/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      toast.error(result.error || "Erro ao salvar", { id: "save-profile" });
      return;
    }

    toast.success("Perfil atualizado!", { id: "save-profile" });
  };

  if (error || !user) {
    return (
      <div className="min-h-screen bg-stone-950 px-4 py-12">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-xl font-semibold text-stone-100">
            Erro ao carregar perfil
          </h1>
          <p className="mt-2 text-stone-400">
            {error || "Tente novamente mais tarde"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-8 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <UserCircle className="h-8 w-8 text-[#d500f9]" />
          <h1 className="text-2xl font-bold text-stone-100">Meu Perfil</h1>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
            <DadosPessoaisForm
              emailVerificado={true}
              telefoneVerificado={false}
            />
            <EnderecoForm />
            <DocumentacaoForm />
            <KycSection
              uploads={uploads}
              kycStatus="pendente"
              onUpload={handleUpload}
              onRemove={handleRemove}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                className="bg-stone-800 border-stone-700 hover:bg-stone-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#d500f9] hover:bg-[#b000d4]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar informações"
                )}
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
