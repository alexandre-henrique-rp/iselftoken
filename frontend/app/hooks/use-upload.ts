import { useMutation } from "@tanstack/react-query";

/**
 * Tipos de upload aceitos pelo backend (defesa em profundidade — cada
 * tipo tem sua allow-list de MIME types).
 *
 * Ver backend/src/api/uploads/uploads.controller.ts (KIND_ALLOWED_MIMES).
 */
export type UploadKind =
  | "avatar"
  | "documento"
  | "comprovante"
  | "biofacial"
  | "startup-logo"
  | "startup-cover"
  | "startup-team-photo"
  | "pitch-deck";

interface UploadVars {
  file: File | Blob;
  filename?: string;
  kind?: UploadKind;
}

export type ProfileUploadField =
  | "avatar_upload_id"
  | "documento_upload_id"
  | "comprovante_upload_id"
  | "biofacial_upload_id";

export interface UploadResult {
  id: number;
  publicId: string;
  rejectionReason?: string;
  url?: string;
  profileField?: ProfileUploadField;
  url_md?: string;
  url_web?: string;
  url_sm?: string;
}

/**
 * pronto, suas URLs públicas estáveis e o campo de perfil aplicável.
 *
 * Se `kind` for passado, o backend valida o MIME type dentro da allow-list
 * específica daquele slot. Sem `kind`, usa a matriz legacy (backward compat).
 */
export function useUploadMutation() {
  return useMutation<UploadResult, Error, UploadVars>({
    mutationFn: async ({ file, filename, kind }) => {
      const formData = new FormData();
      if (filename) {
        formData.append("file", file, filename);
      } else {
        formData.append("file", file);
      }

      const qs = kind ? `?kind=${encodeURIComponent(kind)}` : "";

      let res: Response;
      try {
        res = await fetch(`/api/uploads${qs}`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });
      } catch {
        throw new Error(
          "Falha na conexão com o servidor. Verifique sua internet e tente novamente.",
        );
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const serverMessage =
          data?.detalhe?.message || data?.message || data?.detalhe?.error;

        if (res.status === 413) {
          throw new Error(
            serverMessage ||
              "O arquivo excede o tamanho máximo permitido pelo servidor.",
          );
        }
        if (res.status === 400) {
          throw new Error(
            serverMessage ||
              "Arquivo inválido. Verifique o tipo e tente novamente.",
          );
        }
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            "Sua sessão expirou. Entre novamente para enviar o arquivo.",
          );
        }
        if (res.status === 429) {
          throw new Error(
            "Muitos uploads em pouco tempo. Aguarde um momento e tente novamente.",
          );
        }

        throw new Error(
          serverMessage ||
            `Erro ao enviar arquivo (código ${res.status}). Tente novamente.`,
        );
      }

      const result = data?.data?.data ?? data?.data ?? data;
      if (typeof result?.id !== "number") {
        throw new Error("O servidor não retornou o identificador do upload.");
      }

      return {
        id: result.id,
        publicId: result.publicId ?? "",
        rejectionReason: result.rejectionReason ?? undefined,
        url: result.url ?? undefined,
        url_md: result.url_md ?? undefined,
        url_web: result.url_web ?? undefined,
        profileField:
          result.profileField === "avatar_upload_id" ||
          result.profileField === "documento_upload_id" ||
          result.profileField === "comprovante_upload_id" ||
          result.profileField === "biofacial_upload_id"
            ? result.profileField
            : undefined,
      };
    },
  });
}
