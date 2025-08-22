"use client";

import { useCallback } from "react";
import FileUploader from "@/components/comp-545";

/**
 * CampoDocumentoUpload
 * Wrapper fino para reutilizar o componente shadcn `comp-545`.
 * Responsabilidade: padronizar label e repassar arquivo selecionado ao chamador.
 */
export type CampoDocumentoUploadProps = {
  label?: string;
  onChange?: (file: File | null) => void;
  accept?: string; // ex: "image/*,application/pdf"
  maxSizeMB?: number; // default via comp-545 = 2MB (pode ajustar via prop)
};

export function CampoDocumentoUpload({
  label = "Documento",
  onChange,
  accept = "image/svg+xml,image/png,image/jpeg,image/jpg,image/gif,application/pdf",
  maxSizeMB = 5,
}: CampoDocumentoUploadProps) {
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
      <FileUploader accept={accept} maxSizeMB={maxSizeMB} onFileChange={handleFileChange} />
    </div>
  );
}
