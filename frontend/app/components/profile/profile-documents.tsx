import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, IdCard, ImageIcon, ScanFace } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ProfileUploadField, UploadKind } from "~/hooks/use-upload";
import { useUploadMutation } from "~/hooks/use-upload";
import { resolveAssetUrl } from "~/lib/asset-url";
import { meQueryOptions } from "~/lib/queries";
import { getUploadWebUrl } from "~/lib/upload-url";
import type { UserData } from "~/types/auth";
import { LivenessModal, type LivenessResult } from "./liveness-modal";
import { ProfileDocumentTile, type TileStatus } from "./profile-document-tile";

interface ProfileDocumentsProps {
  user: UserData | null | undefined;
}

type DocSlot = "avatar" | "documento" | "biofacial" | "comprovante";

const ALLOWED_BY_SLOT: Record<DocSlot, string[]> = {
  avatar: ["image/jpeg", "image/png"],
  documento: ["image/jpeg", "image/png", "application/pdf"],
  comprovante: ["image/jpeg", "image/png", "application/pdf"],
  biofacial: ["video/mp4", "video/webm"],
};

const SLOT_LABELS: Record<DocSlot, string> = {
  avatar: "Avatar",
  documento: "Identidade",
  biofacial: "Selfie",
  comprovante: "Comprovante",
};

const SLOT_TO_KIND: Record<DocSlot, UploadKind> = {
  avatar: "avatar",
  documento: "documento",
  comprovante: "comprovante",
  biofacial: "biofacial",
};

const SLOT_UPLOAD_FIELDS: Record<DocSlot, ProfileUploadField> = {
  avatar: "avatar_upload_id",
  documento: "documento_upload_id",
  biofacial: "biofacial_upload_id",
  comprovante: "comprovante_upload_id",
};

const SLOT_FIELDS: Record<
  DocSlot,
  keyof Pick<UserData, "avatar" | "documento" | "biofacial" | "comprovante">
> = {
  avatar: "avatar",
  documento: "documento",
  biofacial: "biofacial",
  comprovante: "comprovante",
};

function statusFromUser(
  user: UserData | null | undefined,
  slot: DocSlot,
): TileStatus {
  const doc = user?.[SLOT_FIELDS[slot]];
  if (!doc) {
    // BUG-FT-005: rejeição admin recente cujo KYCProfile já foi deletado
    // pelo cleanup (CASE.md:884). O backend popula `lastKycRejectionSlot`
    // no payload público para o /profile exibir "Faça upload novamente"
    // em vez do genérico "Upload". Consideramos "recente" até 90 dias para
    // manter audit trail e evitar UX quebrada em rejeições muito antigas.
    if (isRecentRejection(user, slot)) return "REJECTED_NO_DOC";
    return "EMPTY";
  }
  if (doc.status === "APPROVED") return "APPROVED";
  if (doc.status === "REJECTED") return "REJECTED";
  return "PENDING";
}

/** Janela em que uma rejeição recente deve aparecer como "Faça upload novamente". */
const RECENT_REJECTION_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

function isRecentRejection(
  user: UserData | null | undefined,
  slot: DocSlot,
): boolean {
  if (!user?.lastKycRejectionAt) return false;
  if (user.lastKycRejectionSlot !== slot) return false;
  const ts = Date.parse(user.lastKycRejectionAt);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < RECENT_REJECTION_WINDOW_MS;
}

function rejectionReasonForSlot(
  user: UserData | null | undefined,
  slot: DocSlot,
): string | null {
  if (user?.lastKycRejectionSlot === slot && user.lastKycRejectionReason) {
    return user.lastKycRejectionReason;
  }
  return null;
}

function previewFromUser(
  user: UserData | null | undefined,
  slot: DocSlot,
): string | null {
  const doc = user?.[SLOT_FIELDS[slot]];
  if (!doc) return null;
  return resolveAssetUrl(getUploadWebUrl(doc));
}

/**
 * Envia a telemetria da prova de vida ao backend (Fase 2). Fire-and-forget:
 * erros são apenas logados; nunca bloqueiam o fluxo de KYC do usuário.
 */
async function sendLivenessTelemetry(
  result: LivenessResult,
  kycProfileId: number,
  mimeType: string,
): Promise<void> {
  try {
    await fetch("/api/users/me/liveness-telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        kycProfileId,
        passed: result.rejectionReasons.length === 0,
        blinkCount: result.blinkCount,
        hasGlasses: result.hasGlasses,
        maxYawDeg: result.maxYawDeg,
        maxPitchDeg: result.maxPitchDeg,
        landmarkMovement: result.landmarkMovementScore,
        avgRelativeMovement: result.avgRelativeMovement,
        durationMs: Math.round(result.durationMs),
        mimeType,
        instructions: result.instructions,
        challengeResponseMs: result.challengeResponseMs ?? [],
        rejectionReasons: result.rejectionReasons,
        injectionSuspicious: result.injectionSuspicious ?? false,
        injectionReasons: result.injectionReasons ?? [],
      }),
    });
  } catch {
    // Silencioso por design: telemetria é best-effort.
  }
}

export function ProfileDocuments({ user }: ProfileDocumentsProps) {
  const queryClient = useQueryClient();
  const uploadMutation = useUploadMutation();
  const [pendingSlot, setPendingSlot] = useState<DocSlot | null>(null);
  const [livenessOpen, setLivenessOpen] = useState(false);
  const [pendingSlots, setPendingSlots] = useState<
    Partial<Record<DocSlot, boolean>>
  >({});
  const [previewUrls, setPreviewUrls] = useState<
    Partial<Record<DocSlot, string>>
  >({});
  const previewUrlsRef = useRef<Partial<Record<DocSlot, string>>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setPreview = (slot: DocSlot, url: string) => {
    const previousUrl = previewUrlsRef.current[slot];
    if (previousUrl?.startsWith("blob:")) URL.revokeObjectURL(previousUrl);

    previewUrlsRef.current = { ...previewUrlsRef.current, [slot]: url };
    setPreviewUrls((current) => ({ ...current, [slot]: url }));
  };

  const setLocalPreview = (slot: DocSlot, blob: Blob) => {
    setPreview(slot, URL.createObjectURL(blob));
  };

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => {
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, []);

  const patchUserDoc = useMutation<
    UserData,
    Error,
    { slot: DocSlot; uploadId: number }
  >({
    mutationFn: async ({ slot, uploadId }) => {
      const field = SLOT_UPLOAD_FIELDS[slot];
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ [field]: uploadId }),
      });
      const payload = (await res.json().catch(() => null)) as {
        error?: boolean;
        message?: string;
        data?: UserData;
      } | null;

      if (!res.ok || payload?.error || !payload?.data) {
        throw new Error(
          payload?.message &&
            payload.message !== "Operação realizada com sucesso."
            ? payload.message
            : `Não foi possível vincular o arquivo de ${SLOT_LABELS[slot].toLowerCase()} ao seu perfil. Tente novamente.`,
        );
      }

      return payload.data;
    },
    onSuccess: (updatedUser) => {
      // Usa a resposta do PATCH imediatamente. Não faz refetch que possa
      // substituir a imagem recém-vinculada por um snapshot antigo.
      queryClient.setQueryData<UserData>(meQueryOptions.queryKey, updatedUser);
    },
  });

  const handleFileUpload = async (
    slot: DocSlot,
    file: File,
    kind: UploadKind,
  ) => {
    setPendingSlots((current) => ({ ...current, [slot]: true }));
    try {
      const result = await uploadMutation.mutateAsync({ file, kind });

      // O upload já devolve a URL e o id. A imagem aparece imediatamente e o
      // mesmo id é vinculado ao campo correto do usuário no PATCH.
      if (result.url_web || result.url_md || result.url) {
        setPreview(slot, result.url_web ?? result.url_md ?? result.url!);
      }

      await patchUserDoc.mutateAsync({ slot, uploadId: result.id });
      toast.success(
        slot === "biofacial"
          ? "Selfie enviada e aguardando análise do Compliance."
          : `${SLOT_LABELS[slot]} atualizado com sucesso.`,
        { duration: 5000, richColors: true },
      );
      return result.id;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message === "Operação realizada com sucesso."
            ? `Não foi possível vincular o arquivo de ${SLOT_LABELS[slot].toLowerCase()} ao seu perfil. Tente novamente.`
            : error.message
          : `Não foi possível salvar ${SLOT_LABELS[slot].toLowerCase()}.`,
        { richColors: true },
      );
      return null;
    } finally {
      setPendingSlots((current) => {
        const next = { ...current };
        delete next[slot];
        return next;
      });
    }
  };

  const handleLivenessComplete = async (result: LivenessResult) => {
    setLivenessOpen(false);
    if (!result?.videoBlob) return;

    const maxVideoSize = 50 * 1024 * 1024;
    if (result.videoBlob.size > maxVideoSize) {
      toast.error(
        "O vídeo excede o limite de 50MB. Tente novamente com boa iluminação.",
        { richColors: true },
      );
      return;
    }

    setLocalPreview("biofacial", result.videoBlob);
    const rawMimeType = result.mimeType || result.videoBlob.type || "video/mp4";
    const mimeType = rawMimeType.split(";", 1)[0].trim().toLowerCase();
    const extension = mimeType === "video/mp4" ? "mp4" : "webm";
    const file = new File([result.videoBlob], `selfie.${extension}`, {
      type: mimeType,
    });
    const uploadId = await handleFileUpload(
      "biofacial",
      file,
      SLOT_TO_KIND.biofacial,
    );

    // Persiste a telemetria da prova de vida para auditoria do Compliance.
    // Fire-and-forget: uma falha aqui não deve impedir o envio do KYC.
    if (uploadId) {
      void sendLivenessTelemetry(result, uploadId, mimeType);
    }
  };

  const triggerSlot = (slot: DocSlot) => {
    if (slot === "biofacial") {
      setLivenessOpen(true);
      return;
    }
    setPendingSlot(slot);
    fileInputRef.current?.click();
  };

  const onFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const slot = pendingSlot;
    const file = event.target.files?.[0];
    event.target.value = "";
    setPendingSlot(null);
    if (!file || !slot) return;

    const allowedTypes = ALLOWED_BY_SLOT[slot];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Tipo de arquivo não permitido para ${SLOT_LABELS[slot]}.`);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("O arquivo excede o tamanho máximo de 10MB.");
      return;
    }

    if (slot === "avatar") setLocalPreview(slot, file);
    await handleFileUpload(slot, file, SLOT_TO_KIND[slot]);
  };

  const slots: Array<{ slot: DocSlot; label: string; icon: typeof ImageIcon }> =
    [
      { slot: "avatar", label: "Avatar", icon: ImageIcon },
      { slot: "documento", label: "Identidade", icon: IdCard },
      { slot: "biofacial", label: "Selfie", icon: ScanFace },
      { slot: "comprovante", label: "Comprovante", icon: FileText },
    ];

  const approvedCount = slots.filter(
    ({ slot }) => statusFromUser(user, slot) === "APPROVED",
  ).length;
  const isUploading = uploadMutation.isPending || patchUserDoc.isPending;

  return (
    <section
      id="documentos"
      className="glass-panel rounded-xl border border-white/5 p-5 md:p-6"
    >
      <header className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-foreground sm:text-lg">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4" />
          </span>
          Documentos & Verificação
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {approvedCount} de {slots.length} aprovados
        </span>
      </header>

      {isUploading && (
        <div
          className="mb-4 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary"
          role="status"
          aria-live="polite"
        >
          <span
            className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary"
            aria-hidden="true"
          />
          Enviando e salvando o documento.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {slots.map(({ slot, label, icon }) => (
          <ProfileDocumentTile
            key={slot}
            label={label}
            icon={icon}
            status={pendingSlots[slot] ? "PENDING" : statusFromUser(user, slot)}
            previewUrl={previewUrls[slot] ?? previewFromUser(user, slot)}
            previewType={slot === "biofacial" ? "video" : "image"}
            rejectionReason={rejectionReasonForSlot(user, slot)}
            disabled={isUploading}
            onClick={() => triggerSlot(slot)}
          />
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={
          pendingSlot
            ? ALLOWED_BY_SLOT[pendingSlot].join(",")
            : "image/jpeg,image/png,application/pdf"
        }
        className="hidden"
        onChange={onFilePicked}
      />

      <LivenessModal
        open={livenessOpen}
        onClose={() => setLivenessOpen(false)}
        onComplete={handleLivenessComplete}
      />
    </section>
  );
}
