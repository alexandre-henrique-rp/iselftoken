/**
 * @file FileUpload.tsx
 * @description Componente de upload de arquivos para KYC com preview e estados
 */

import { Button } from "@/components/ui/button";
import { AlertCircle, Check, FileText, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import type { DocType, UploadStatus } from "~/types/kyc";

interface FileUploadProps {
  tipo: DocType;
  label: string;
  description?: string;
  accept?: string;
  status?: UploadStatus;
  previewUrl?: string;
  onUpload: (file: File, preview: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

const tipoLabels: Record<DocType, string> = {
  documento: "Documento Oficial",
  comprovante: "Comprovante de Residência",
  biofacial: "Selfie com Documento",
};

/**
 * @name FileUpload
 * @description Componente de upload de arquivo com drag-and-drop, preview e estados visuais
 *
 * @param {FileUploadProps} props - Propriedades do componente
 * @returns {JSX.Element} Área de upload interativa
 */
export function FileUpload({
  label,
  description = "Arraste um arquivo ou clique para selecionar",
  accept = ".pdf,.png,.jpg,.jpeg",
  status = "pendente",
  previewUrl,
  onUpload,
  onRemove,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setError("Formato não suportado. Use PDF, PNG ou JPG.");
      return false;
    }

    if (file.size > maxSize) {
      setError("Arquivo muito grande. Máximo 5MB.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleFile = (file: File) => {
    if (!validateFile(file)) return;

    const preview = file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : "";

    onUpload(file, preview);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const statusConfig = {
    pendente: { border: "border-stone-700", bg: "bg-stone-900" },
    enviado: { border: "border-blue-600", bg: "bg-blue-600/10" },
    aprovado: { border: "border-green-600", bg: "bg-green-600/10" },
    rejeitado: { border: "border-red-600", bg: "bg-red-600/10" },
  };

  const currentStatus = statusConfig[status];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-stone-300">{label}</label>

      {previewUrl ? (
        <div
          className={`relative rounded-lg border-2 ${currentStatus.border} ${currentStatus.bg} p-4`}
        >
          <div className="flex items-center gap-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-20 w-20 rounded object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded bg-stone-800">
                <FileText className="h-8 w-8 text-stone-500" />
              </div>
            )}

            <div className="flex-1">
              <p className="text-sm font-medium text-stone-200">
                {tipoLabels[label.toLowerCase() as DocType] || label}
              </p>
              <div className="mt-1 flex items-center gap-2">
                {status === "aprovado" && (
                  <span className="flex items-center gap-1 text-xs text-green-400">
                    <Check className="h-3 w-3" /> Aprovado
                  </span>
                )}
                {status === "enviado" && (
                  <span className="text-xs text-blue-400">Enviado</span>
                )}
                {status === "rejeitado" && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <AlertCircle className="h-3 w-3" /> Rejeitado
                  </span>
                )}
                {status === "pendente" && (
                  <span className="text-xs text-stone-500">Pendente</span>
                )}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={disabled}
              className="text-stone-400 hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative rounded-lg border-2 border-dashed p-6 transition-all
            ${isDragging ? "border-[#d500f9] bg-[#d500f9]/5" : "border-stone-700 bg-stone-900"}
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-stone-600"}
          `}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleInputChange}
            disabled={disabled}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={`Upload de ${label}`}
          />

          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-800">
              <Upload className="h-5 w-5 text-stone-400" />
            </div>
            <p className="text-sm text-stone-300">{description}</p>
            <p className="text-xs text-stone-500">PDF, PNG ou JPG até 5MB</p>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}
