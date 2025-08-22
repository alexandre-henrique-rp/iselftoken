"use client";

import { useCallback } from "react";
import AvatarUploader from "@/components/comp-543";

/**
 * CampoAvatarUpload
 * Wrapper fino para reutilizar o componente shadcn `comp-543`.
 * Responsabilidade única: padronizar label e repassar arquivo selecionado para o chamador.
 */
export type CampoAvatarUploadProps = {
  label?: string;
  onChange?: (file: File | null) => void;
  accept?: string; // default: "image/*"
};

export function CampoAvatarUpload({
  label = "Avatar",
  onChange,
  accept = "image/*",
}: CampoAvatarUploadProps) {
  const handleFileChange = useCallback(
    (fileUnknown: unknown) => {
      const f = fileUnknown as File | null;
      onChange?.(f ?? null);
    },
    [onChange]
  );

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <AvatarUploader accept={accept} onFileChange={handleFileChange} />
    </div>
  );
}
