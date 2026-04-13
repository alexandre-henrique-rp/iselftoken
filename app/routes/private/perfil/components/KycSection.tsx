/**
 * @file KycSection.tsx
 * @description Seção de verificação KYC com uploads de documentos
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  Camera,
  Check,
  Clock,
  Shield,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { DocType, UploadDoc } from "~/types/kyc";
import { CameraModal } from "./CameraModal";
import { FileUpload } from "./FileUpload";

interface KycSectionProps {
  uploads: Record<DocType, UploadDoc>;
  kycStatus?: "pendente" | "em_analise" | "aprovado" | "reprovado";
  onUpload: (tipo: DocType, file: File, preview: string) => void;
  onRemove: (tipo: DocType) => void;
}

const statusConfig = {
  pendente: {
    color: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
    icon: Clock,
    label: "Pendente",
    message: "Envie seus documentos para verificação",
  },
  em_analise: {
    color: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    icon: Clock,
    label: "Em análise",
    message: "Seus documentos estão sendo analisados",
  },
  aprovado: {
    color: "bg-green-600/20 text-green-400 border-green-600/30",
    icon: Check,
    label: "Aprovado",
    message: "Sua identidade foi verificada",
  },
  reprovado: {
    color: "bg-red-600/20 text-red-400 border-red-600/30",
    icon: XCircle,
    label: "Reprovado",
    message: "Documentos rejeitados. Veja o motivo.",
  },
};

const uploadLabels: Record<DocType, { title: string; description: string }> = {
  documento: {
    title: "Documento Oficial",
    description: "Frente do documento legível (RG, CNH ou Passaporte)",
  },
  biofacial: {
    title: "Selfie com Documento",
    description: "Rosto visível segurando o documento",
  },
  comprovante: {
    title: "Comprovante de Residência",
    description: "Conta de luz, água, etc. (últimos 3 meses)",
  },
};

/**
 * @name KycSection
 * @description Componente de seção KYC com uploads e status
 *
 * @param {KycSectionProps} props - Propriedades do componente
 * @returns {JSX.Element} Card com uploads KYC
 */
export function KycSection({
  uploads,
  kycStatus = "pendente",
  onUpload,
  onRemove,
}: KycSectionProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const status = statusConfig[kycStatus];
  const StatusIcon = status.icon;

  const handleCameraCapture = (file: File) => {
    const preview = URL.createObjectURL(file);
    onUpload("biofacial", file, preview);
  };

  return (
    <>
      <Card className="bg-stone-900 border-stone-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#d500f9]" />
            <CardTitle className="text-lg font-semibold text-stone-100">
              Verificação KYC
            </CardTitle>
          </div>
          <Badge
            variant="secondary"
            className={`${status.color} flex items-center gap-1`}
          >
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mensagem de status */}
          <div
            className={`rounded-lg p-3 text-sm ${status.color.replace(
              "border-",
              "",
            )}`}
          >
            <p className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              {status.message}
            </p>
          </div>

          {/* Área de uploads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(uploadLabels) as DocType[]).map((tipo) => {
              const upload = uploads[tipo];
              const label = uploadLabels[tipo];

              return (
                <div key={tipo} className="space-y-2">
                  {tipo === "biofacial" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-300">
                        {label.title}
                      </label>
                      {upload?.preview ? (
                        <div className="relative rounded-lg border-2 border-green-600 bg-green-600/10 p-4">
                          <div className="flex items-center gap-4">
                            <img
                              src={upload.preview}
                              alt="Selfie"
                              className="h-20 w-20 rounded object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-stone-200">
                                Selfie capturada
                              </p>
                              <span className="flex items-center gap-1 text-xs text-green-400">
                                <Check className="h-3 w-3" /> Capturada
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemove(tipo)}
                              className="text-stone-400 hover:text-red-400"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCameraOpen(true)}
                          className="w-full h-32 flex flex-col items-center justify-center gap-2 border-dashed border-stone-700 bg-stone-800 hover:bg-stone-700 hover:border-[#d500f9]"
                        >
                          <Camera className="h-8 w-8 text-stone-500" />
                          <span className="text-sm text-stone-400">
                            {label.description}
                          </span>
                          <span className="text-xs text-stone-500">
                            Clique para abrir câmera
                          </span>
                        </Button>
                      )}
                    </div>
                  ) : (
                    <FileUpload
                      tipo={tipo}
                      label={label.title}
                      description={label.description}
                      accept=".pdf,.png,.jpg,.jpeg"
                      status={upload?.status || "pendente"}
                      previewUrl={upload?.preview}
                      onUpload={(file, preview) =>
                        onUpload(tipo, file, preview)
                      }
                      onRemove={() => onRemove(tipo)}
                      disabled={
                        kycStatus === "em_analise" || kycStatus === "aprovado"
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Nota importante */}
          <div className="rounded-lg bg-stone-800/50 p-3 text-xs text-stone-400">
            <p className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#d500f9]" />
              <span>
                Os documentos devem estar legíveis e em boas condições de
                visualização. O processo de análise pode levar até 48 horas.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal da câmera */}
      <CameraModal
        isOpen={isCameraOpen}
        onCapture={handleCameraCapture}
        onClose={() => setIsCameraOpen(false)}
      />
    </>
  );
}
