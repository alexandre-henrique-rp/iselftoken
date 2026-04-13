/**
 * @file DocumentacaoForm.tsx
 * @description Seção de documentação do formulário de perfil
 */

import { FileText, Hash } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { TipoDocumento } from "~/types/document";
import type { PerfilFormData } from "~/types/profile";

const tiposDocumento: { value: TipoDocumento; label: string }[] = [
  { value: "CPF", label: "CPF" },
  { value: "CNH", label: "CNH" },
  { value: "PASSAPORTE", label: "Passaporte" },
  { value: "CÉDULA_IDENTIDADE", label: "Cédula de Identidade" },
  { value: "CARTEIRA_MOTORISTA", label: "Carteira de Motorista" },
  { value: "DNI", label: "DNI (Documento Nacional de Identidade)" },
  { value: "CUIT", label: "CUIT (Argentina)" },
  { value: "RUT", label: "RUT (Chile/Uruguai)" },
  { value: "SSN", label: "SSN (EUA)" },
  { value: "NATIONAL_ID", label: "ID Nacional" },
  { value: "BIRTH_CERTIFICATE", label: "Certidão de Nascimento" },
];

/**
 * @name DocumentacaoForm
 * @description Componente de formulário para dados de documentação
 *
 * @returns {JSX.Element} Card com campos de documentação
 */
export function DocumentacaoForm() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<PerfilFormData>();

  const tipoDocumento = watch("tipo_documento");

  return (
    <Card className="bg-stone-900 border-stone-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-stone-100">
          Documentação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Tipo de Documento */}
          <div className="space-y-2">
            <Label htmlFor="tipo_documento" className="text-sm text-stone-400">
              Tipo de documento
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 z-10" />
              <Select
                value={tipoDocumento}
                onValueChange={(value: TipoDocumento) =>
                  setValue("tipo_documento", value)
                }
              >
                <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100 pl-10">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-stone-800 border-stone-700">
                  {tiposDocumento.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      className="text-stone-100 focus:bg-stone-700 focus:text-stone-100"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Número do Documento */}
          <div className="space-y-2">
            <Label htmlFor="reg_documento" className="text-sm text-stone-400">
              Número do documento
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                id="reg_documento"
                {...register("reg_documento")}
                placeholder="Digite o número"
                className="bg-stone-800 border-stone-700 text-stone-100 pl-10"
                aria-invalid={errors.reg_documento ? "true" : "false"}
                aria-describedby={
                  errors.reg_documento ? "reg-documento-error" : undefined
                }
              />
            </div>
            {errors.reg_documento && (
              <p id="reg-documento-error" className="text-xs text-red-400">
                {errors.reg_documento.message}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
