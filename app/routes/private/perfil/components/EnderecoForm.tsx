/**
 * @file EnderecoForm.tsx
 * @description Seção de endereço com busca automática de CEP
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Home, MapPin, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { SelectCidade } from "~/components/selectCidade";
import { SelectEstado } from "~/components/selectEstado";
import { SelectPais } from "~/components/selectPais";
import type { BrasilCepResponse, ViaCepResponse } from "~/types/address";
import type { PaisType } from "~/types/paises";
import type { PerfilFormData } from "~/types/profile";

/**
 * @name EnderecoForm
 * @description Componente de formulário para endereço com busca de CEP via ViaCEP
 *
 * @returns {JSX.Element} Card com campos de endereço
 */
export function EnderecoForm() {
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext<PerfilFormData>();

  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [stateId, setStateId] = useState<number | null>(null);
  const cep = (watch("cep") as string | undefined) ?? "";
  const paisWatch = watch("pais");
  const ufWatch = watch("uf") ?? "";
  const cidadeWatch = watch("cidade");

  // Busca o stateId quando os dados vêm do banco (uf existe mas stateId é null)
  useEffect(() => {
    if (!paisWatch?.id || !ufWatch || stateId) return;

    (async () => {
      try {
        const response = await fetch(`/api/geral/estados/${paisWatch.id}`);
        const data = await response.json();
        const estados = data.data || [];
        const estadoEncontrado = estados.find(
          (e: { iso2: string }) => e.iso2 === ufWatch,
        );
        if (estadoEncontrado) {
          setStateId(estadoEncontrado.id);
        }
      } catch (error) {
        console.error("Erro ao buscar estado:", error);
      }
    })();
  }, [paisWatch?.id, ufWatch, stateId]);
  const telefoneAtual = watch("telefone") ?? "";

  const buscarCep = useCallback(
    async (cepValue: string) => {
      const cepLimpo = cepValue.replace(/\D/g, "");

      if (cepLimpo.length !== 8) {
        setCepError("CEP deve ter 8 dígitos");
        return;
      }

      setIsLoadingCep(true);
      setCepError(null);

      try {
        const response = await fetch(
          `https://viacep.com.br/ws/${cepLimpo}/json/`,
        );
        const data: ViaCepResponse = await response.json();
        console.log("🚀 ~ data:", data);

        const responseInfo = await fetch(`/api/geral/cep/${cepLimpo}`);
        const dataInfo: BrasilCepResponse = await responseInfo.json();
        console.log("🚀 ~ dataInfo:", dataInfo);

        if (data.erro) {
          setCepError("CEP não encontrado");
          return;
        }

        setValue("endereco", dataInfo.street, { shouldValidate: true });
        setValue("bairro", dataInfo.neighborhood, { shouldValidate: true });
        setValue("cidade", dataInfo.city, { shouldValidate: true });
        // Nota: não preenche uf automaticamente pois usa ID numérico do dropdown
      } catch {
        setCepError("Erro ao buscar CEP. Tente novamente.");
      } finally {
        setIsLoadingCep(false);
      }
    },
    [setValue],
  );

  const handleCepBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.replace(/\D/g, "").length === 8) {
      buscarCep(value);
    }
  };

  const formatCep = (value: string): string => {
    const limpo = value.replace(/\D/g, "");
    if (limpo.length <= 5) return limpo;
    return `${limpo.slice(0, 5)}-${limpo.slice(5, 8)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    setValue("cep", formatted, { shouldValidate: true });
  };

  const handlePaisChange = (value: PaisType) => {
    setValue("pais", value, { shouldValidate: true });
    setValue("uf", "", { shouldValidate: true });
    setStateId(null);
    setValue("cidade", "", { shouldValidate: true });
  };

  const handleEstadoChange = (value: { id: number; iso2: string }) => {
    setValue("uf", value.iso2, { shouldValidate: true });
    setStateId(value.id);
    setValue("cidade", "", { shouldValidate: true });
  };

  const handleCidadeChange = (value: string) => {
    setValue("cidade", value, { shouldValidate: true });
  };

  return (
    <Card className="bg-stone-900 border-stone-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-stone-100">
          Endereço
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CEP */}
        <div className="space-y-2">
          <Label htmlFor="cep" className="text-sm text-stone-400">
            CEP
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                id="cep"
                {...register("cep")}
                onChange={handleCepChange}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                maxLength={9}
                className="bg-stone-800 border-stone-700 text-stone-100 pl-10"
                aria-invalid={errors.cep || cepError ? "true" : "false"}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => buscarCep(cep)}
              disabled={isLoadingCep || cep?.replace(/\D/g, "").length !== 8}
              className="bg-stone-800 border-stone-700 hover:bg-stone-700"
            >
              {isLoadingCep ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          {cepError && <p className="text-xs text-red-400">{cepError}</p>}
          {errors.cep && (
            <p className="text-xs text-red-400">{errors.cep.message}</p>
          )}
        </div>

        {/* Rua e Número */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="endereco" className="text-sm text-stone-400">
              Rua
            </Label>
            <div className="relative">
              <Home className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                id="endereco"
                {...register("endereco")}
                placeholder="Nome da rua"
                className="bg-stone-800 border-stone-700 text-stone-100 pl-10"
                aria-invalid={errors.endereco ? "true" : "false"}
              />
            </div>
            {errors.endereco && (
              <p className="text-xs text-red-400">{errors.endereco.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero" className="text-sm text-stone-400">
              Número
            </Label>
            <Input
              id="numero"
              {...register("numero")}
              placeholder="123"
              className="bg-stone-800 border-stone-700 text-stone-100"
              aria-invalid={errors.numero ? "true" : "false"}
            />
            {errors.numero && (
              <p className="text-xs text-red-400">{errors.numero.message}</p>
            )}
          </div>
        </div>

        {/* Complemento e Bairro */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="complemento" className="text-sm text-stone-400">
              Complemento
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" />
              <Input
                id="complemento"
                {...register("complemento")}
                placeholder="Apto, Bloco, etc."
                className="bg-stone-800 border-stone-700 text-stone-100 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bairro" className="text-sm text-stone-400">
              Bairro
            </Label>
            <Input
              id="bairro"
              {...register("bairro")}
              placeholder="Nome do bairro"
              className="bg-stone-800 border-stone-700 text-stone-100"
              aria-invalid={errors.bairro ? "true" : "false"}
            />
            {errors.bairro && (
              <p className="text-xs text-red-400">{errors.bairro.message}</p>
            )}
          </div>
        </div>

        {/* País, Estado e Cidade */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pais" className="text-sm text-stone-400">
              País
            </Label>
            <div className="relative">
              <SelectPais value={paisWatch} onChange={handlePaisChange} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uf" className="text-sm text-stone-400">
              Estado
            </Label>
            <div className="relative">
              <SelectEstado
                pais={paisWatch}
                value={ufWatch}
                onChange={handleEstadoChange}
              />
            </div>
            {errors.uf && (
              <p className="text-xs text-red-400">{errors.uf.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cidade" className="text-sm text-stone-400">
              Cidade
            </Label>
            <div className="relative">
              <SelectCidade
                pais={paisWatch}
                estadoId={stateId}
                value={cidadeWatch}
                onChange={handleCidadeChange}
              />
            </div>
            {errors.cidade && (
              <p className="text-xs text-red-400">{errors.cidade.message}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
