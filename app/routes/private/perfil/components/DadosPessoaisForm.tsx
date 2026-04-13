/**
 * @file DadosPessoaisForm.tsx
 * @description Seção de dados pessoais do formulário de perfil
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Mail, Phone, User } from "lucide-react";
import { useFormContext } from "react-hook-form";
import type { PerfilFormData } from "~/types/profile";

interface DadosPessoaisFormProps {
  emailVerificado?: boolean;
  telefoneVerificado?: boolean;
}

const generoOptions = [
  { value: "HOMEM", label: "Masculino" },
  { value: "MULHER", label: "Feminino" },
  { value: "NAO_INFORMADO", label: "Prefiro não informar" },
];

/**
 * @name formatTelefone
 * @description Aplica máscara de telefone brasileiro.
 * Fixo: (11) 9999-9999
 * Móvel: (11) 9 9999-9999
 *
 * @param {string} value - Telefone digitado.
 * @returns {string} Telefone formatado.
 */
function formatTelefone(value: string): string {
  const apenasNumeros = value.replace(/\D/g, "");

  if (apenasNumeros.length <= 2) {
    return apenasNumeros;
  }
  if (apenasNumeros.length <= 6) {
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2)}`;
  }
  // Fixo: (11) 9999-9999 (10 dígitos)
  if (apenasNumeros.length <= 10) {
    return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 6)}-${apenasNumeros.slice(6, 10)}`;
  }
  // Móvel: (11) 9 9999-9999 (11 dígitos)
  return `(${apenasNumeros.slice(0, 2)}) ${apenasNumeros.slice(2, 3)} ${apenasNumeros.slice(3, 7)}-${apenasNumeros.slice(7, 11)}`;
}

/**
 * @name DadosPessoaisForm
 * @description Componente de formulário para dados pessoais do usuário
 *
 * @param {DadosPessoaisFormProps} props - Propriedades do componente
 * @returns {JSX.Element} Card com campos de dados pessoais
 */
export function DadosPessoaisForm({
  emailVerificado = false,
  telefoneVerificado = false,
}: DadosPessoaisFormProps) {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<PerfilFormData>();

  const genero = watch("genero");

  return (
    <Card className="bg-stone-900 border-stone-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-stone-100">
          Dados Pessoais
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Nome Completo */}
        <div className="space-y-2">
          <Label htmlFor="nome" className="text-sm text-stone-400">
            Nome completo
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
            <Input
              id="nome"
              {...register("nome")}
              placeholder="Digite seu nome completo"
              className="bg-stone-800 border-stone-700 text-stone-100 pl-10"
              aria-invalid={errors.nome ? "true" : "false"}
              aria-describedby={errors.nome ? "nome-error" : undefined}
            />
          </div>
          {errors.nome && (
            <p id="nome-error" className="text-xs text-red-400">
              {errors.nome.message}
            </p>
          )}
        </div>

        {/* E-mail */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-stone-400">
            E-mail
          </Label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="seu@email.com"
                disabled
                className="bg-stone-800/50 border-stone-700 text-stone-400 pl-10"
              />
            </div>
            <Badge
              variant="secondary"
              className={
                emailVerificado
                  ? "bg-green-600/20 text-green-400 border-green-600/30"
                  : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
              }
            >
              {emailVerificado ? "Verificado" : "Pendente"}
            </Badge>
          </div>
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="telefone" className="text-sm text-stone-400">
            Telefone
          </Label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                id="telefone"
                type="tel"
                {...register("telefone")}
                placeholder="(11) 99999-9999"
                className="bg-stone-800 border-stone-700 text-stone-100 pl-10"
                aria-invalid={errors.telefone ? "true" : "false"}
                aria-describedby={
                  errors.telefone ? "telefone-error" : undefined
                }
                onChange={(e) =>
                  setValue("telefone", formatTelefone(e.target.value), {
                    shouldValidate: true,
                  })
                }
              />
            </div>
            <Badge
              variant="secondary"
              className={
                telefoneVerificado
                  ? "bg-green-600/20 text-green-400 border-green-600/30"
                  : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
              }
            >
              {telefoneVerificado ? "Verificado" : "Pendente"}
            </Badge>
          </div>
          {errors.telefone && (
            <p id="telefone-error" className="text-xs text-red-400">
              {errors.telefone.message}
            </p>
          )}
        </div>

        {/* Data de Nascimento e Gênero */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_nascimento" className="text-sm text-stone-400">
              Data de nascimento
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                id="data_nascimento"
                type="date"
                {...register("data_nascimento")}
                className="bg-stone-800 border-stone-700 text-stone-100 pl-10"
                aria-invalid={errors.data_nascimento ? "true" : "false"}
                aria-describedby={
                  errors.data_nascimento ? "data-nascimento-error" : undefined
                }
              />
            </div>
            {errors.data_nascimento && (
              <p id="data-nascimento-error" className="text-xs text-red-400">
                {errors.data_nascimento.message}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="genero" className="text-sm text-stone-400">
              Gênero
            </Label>
            <Select
              value={genero}
              onValueChange={(value) =>
                setValue(
                  "genero",
                  value as "HOMEM" | "MULHER" | "NAO_INFORMADO" | "",
                )
              }
            >
              <SelectTrigger className="bg-stone-800 border-stone-700 text-stone-100 w-50">
                <SelectValue
                  className="text-stone-100"
                  placeholder="Selecione um genero"
                />
              </SelectTrigger>
              <SelectContent className="bg-stone-800 border-stone-700">
                {generoOptions.map((option) => (
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
      </CardContent>
    </Card>
  );
}
