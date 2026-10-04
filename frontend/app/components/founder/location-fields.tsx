import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { fetchCepLookup } from "~/hooks/use-cep-lookup";
import {
  citiesByStateQueryOptions,
  countriesQueryOptions,
  statesByCountryQueryOptions,
  type Country,
  type State,
  type City,
} from "~/lib/queries";
import type { EditSectionProps } from "./_section-props";
import type { CnpjLookupResponse } from "./corporate-identity";

interface LocationForm {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  /** Nome do país (ex.: "Brasil"). O save resolve o ISO3 pela lista de países. */
  pais: string;
}

const defaults: LocationForm = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  estado: "",
  pais: "",
};

const SECTION_ID = "location-fields";
const TOTAL = 8;

interface LocationFieldsProps extends EditSectionProps {
  startup?: any;
  /** Resultado da última busca de CNPJ — preenche cep/cidade/estado. */
  lookupData?: CnpjLookupResponse | null;
}

function formatCep(cep: string): string {
  const digits = cep.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

type CepState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok" }
  | { status: "error"; message: string };

export function LocationFields({
  reportStatus,
  registerReset,
  registerGetValues,
  startup,
  lookupData,
}: LocationFieldsProps) {
  const { register, watch, formState, reset, getValues, setValue } =
    useForm<LocationForm>({
      defaultValues: defaults,
      mode: "onChange",
    });

  const { data: countries = [] } = useQuery<Country[]>(countriesQueryOptions);
  const [cepState, setCepState] = useState<CepState>({ status: "idle" });

  // Nome oficial do Brasil na lista de países (para o auto-preenchimento via CEP).
  const brasilName = useMemo(() => {
    const br = countries.find((c) => c.iso3 === "BRA");
    return br?.name ?? "Brasil";
  }, [countries]);

  // Popula com dados reais da startup quando disponíveis.
  // Endereço é persistido dentro do JSON `pais` (Startup não tem colunas próprias).
  useEffect(() => {
    if (!startup) return;
    const realData: Partial<LocationForm> = {};
    // Registros novos usam `pais.logradouro`; registros antigos podem ter
    // usado `pais.rua` ou o objeto top-level `endereco`. Normalizamos somente
    // na leitura para que o campo Logradouro não apareça vazio na edição.
    const pais = startup.pais ?? {};
    const endereco = startup.endereco ?? {};
    const firstValue = (...values: unknown[]): string | undefined => {
      const value = values.find(
        (candidate): candidate is string =>
          typeof candidate === "string" && candidate.trim().length > 0,
      );
      return value?.trim();
    };
    const cep = firstValue(pais.cep, endereco.cep, startup.cep);
    const logradouro = firstValue(
      pais.logradouro,
      pais.rua,
      endereco.logradouro,
      endereco.rua,
      startup.logradouro,
    );
    const numero = firstValue(pais.numero, endereco.numero, startup.numero);
    const complemento = firstValue(
      pais.complemento,
      endereco.complemento,
      startup.complemento,
    );
    const bairro = firstValue(pais.bairro, endereco.bairro, startup.bairro);
    const cidade = firstValue(pais.cidade, endereco.cidade, startup.cidade);
    const estado = firstValue(
      pais.uf,
      pais.estado,
      endereco.uf,
      endereco.estado,
      startup.uf,
    );

    if (cep) realData.cep = formatCep(cep);
    if (logradouro) realData.logradouro = logradouro;
    if (numero) realData.numero = numero;
    if (complemento) realData.complemento = complemento;
    if (bairro) realData.bairro = bairro;
    if (cidade) realData.cidade = cidade;
    if (estado) realData.estado = estado;
    if (pais.nome) realData.pais = pais.nome;
    else if (startup.paisIso3) realData.pais = startup.paisIso3;
    if (Object.keys(realData).length > 0) {
      reset({ ...defaults, ...realData });
    }
  }, [startup, reset]);

  const values = watch();
  const selectedCountry = countries.find(
    (country) =>
      country.name === values.pais || country.iso3 === values.pais,
  );
  const statesQuery = useQuery<State[]>(
    statesByCountryQueryOptions(selectedCountry?.id ?? null),
  );
  const states = statesQuery.data ?? [];
  const selectedState = states.find(
    (state) => state.iso2 === values.estado || state.name === values.estado,
  );
  const citiesQuery = useQuery<City[]>(
    citiesByStateQueryOptions(
      selectedCountry?.id ?? null,
      selectedState?.id ?? null,
    ),
  );
  const cities = citiesQuery.data ?? [];
  const dirty = Object.keys(formState.dirtyFields).length;
  const filled = Object.values(values).filter(Boolean).length;

  // Campos só travam se tiver campanha ativa (OPEN/FUNDED)
  const hasCampaignActive =
    startup?.campaignStatus === "open" || startup?.campaignStatus === "funded";
  const isLocked = hasCampaignActive;

  useEffect(() => {
    reportStatus({ id: SECTION_ID, dirty, filled, total: TOTAL });
  }, [dirty, filled, reportStatus]);

  useEffect(() => {
    if (!registerReset) return;
    registerReset(SECTION_ID, () => {
      reset(defaults);
      setCepState({ status: "idle" });
    });
  }, [registerReset, reset]);

  useEffect(() => {
    if (!registerGetValues) return;
    registerGetValues(SECTION_ID, () => ({
      values: getValues(),
      dirtyFields: formState.dirtyFields,
    }));
  }, [registerGetValues, getValues, formState]);

  // Integração ViaCEP: dispara ao completar 8 dígitos (no change/blur).
  // Preenche logradouro, bairro, cidade, estado (UF) e país automaticamente.
  const runCepLookup = useCallback(async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepState(
        digits.length === 0
          ? { status: "idle" }
          : { status: "error", message: "O CEP deve ter 8 dígitos." },
      );
      return;
    }
    setCepState({ status: "loading" });
    try {
      const result = await fetchCepLookup(digits);
      if (!result) {
        setCepState({ status: "error", message: "CEP não encontrado." });
        return;
      }
      if (result.logradouro)
        setValue("logradouro", result.logradouro, {
          shouldDirty: true,
          shouldValidate: true,
        });
      if (result.bairro)
        setValue("bairro", result.bairro, {
          shouldDirty: true,
          shouldValidate: true,
        });
      if (result.cidade)
        setValue("cidade", result.cidade, {
          shouldDirty: true,
          shouldValidate: true,
        });
      if (result.uf)
        setValue("estado", result.uf, {
          shouldDirty: true,
          shouldValidate: true,
        });
      setValue("pais", brasilName, {
        shouldDirty: true,
        shouldValidate: true,
      });
      setCepState({ status: "ok" });
    } catch (err) {
      setCepState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Não foi possível consultar o CEP. Preencha manualmente.",
      });
    }
  }, [brasilName, setValue]);

  // CNPJ fornece apenas o CEP para a localização. O restante do endereço
  // deve vir exclusivamente da consulta ViaCEP, evitando misturar fontes.
  useEffect(() => {
    const cep = lookupData?.cep;
    if (!cep) return;

    const formattedCep = formatCep(cep);
    setValue("cep", formattedCep, {
      shouldDirty: true,
      shouldValidate: true,
    });
    void runCepLookup(formattedCep);
  }, [lookupData?.cep, runCepLookup, setValue]);

  const handleCepChange = (raw: string) => {
    const formatted = formatCep(raw);
    setValue("cep", formatted, { shouldDirty: true, shouldValidate: true });
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      void runCepLookup(formatted);
    } else if (cepState.status !== "idle") {
      setCepState({ status: "idle" });
    }
  };

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight italic">
            Localização
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Digite o CEP para preencher cidade, estado e país automaticamente
          </p>
        </div>
        <span className="pill">
          {filled}/{TOTAL} campos
        </span>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CEP + País lado a lado */}
        <div className="space-y-2">
          <label className="label-tag" htmlFor="cep">
            CEP
          </label>
          <div className="relative">
            <input
              id="cep"
              className="input-field disabled:opacity-60 disabled:cursor-not-allowed pr-10"
              disabled={isLocked}
              placeholder="00000-000"
              inputMode="numeric"
              value={values.cep}
              onChange={(e) => handleCepChange(e.target.value)}
              onBlur={(e) => runCepLookup(e.target.value)}
              aria-invalid={cepState.status === "error" || undefined}
              aria-describedby="cep-feedback"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {cepState.status === "loading" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {cepState.status === "ok" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
              {cepState.status === "error" && (
                <AlertCircle className="h-4 w-4 text-rose-400" />
              )}
            </span>
          </div>
          <p id="cep-feedback" className="min-h-[16px] text-xs">
            {cepState.status === "loading" && (
              <span className="text-muted-foreground">Consultando CEP…</span>
            )}
            {cepState.status === "error" && (
              <span className="flex items-center gap-1 font-semibold text-rose-400">
                <AlertCircle className="h-3 w-3" />
                {cepState.message}
              </span>
            )}
            {cepState.status === "ok" && (
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Endereço preenchido pelo CEP.
              </span>
            )}
          </p>
        </div>

        <div className="space-y-2">
          <label className="label-tag" htmlFor="pais">
            País
          </label>
          <select
            id="pais"
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLocked}
            value={
              countries.find((c) => c.name === values.pais) ? values.pais : ""
            }
            onChange={(e) => {
              const nextCountry = e.target.value;
              setValue("pais", nextCountry, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("estado", "", { shouldDirty: true, shouldValidate: true });
              setValue("cidade", "", { shouldDirty: true, shouldValidate: true });
            }}
          >
            <option value="" disabled>
              Selecione um país
            </option>
            {countries.map((pais) => (
              <option key={pais.iso3} value={pais.name}>
                {pais.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="label-tag" htmlFor="logradouro">
            Logradouro
          </label>
          <input
            id="logradouro"
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLocked}
            placeholder="Rua, avenida ou rodovia"
            {...register("logradouro")}
          />
        </div>
        <div className="space-y-2">
          <label className="label-tag" htmlFor="numero">
            Número
          </label>
          <input
            id="numero"
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLocked}
            placeholder="Número"
            {...register("numero")}
          />
        </div>
        <div className="space-y-2">
          <label className="label-tag" htmlFor="complemento">
            Complemento
          </label>
          <input
            id="complemento"
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLocked}
            placeholder="Sala, conjunto, bloco..."
            {...register("complemento")}
          />
        </div>
        <div className="space-y-2">
          <label className="label-tag" htmlFor="bairro">
            Bairro
          </label>
          <input
            id="bairro"
            className="input-field disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isLocked}
            placeholder="Bairro"
            {...register("bairro")}
          />
        </div>

        {/* Estado e cidade dependem do país selecionado. */}
        <div className="space-y-2">
          <label className="label-tag" htmlFor="estado">
            Estado / Região
          </label>
          <select
            id="estado"
            className="input-field disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLocked || !selectedCountry || statesQuery.isLoading}
            value={values.estado}
            onChange={(e) => {
              setValue("estado", e.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              });
              setValue("cidade", "", { shouldDirty: true, shouldValidate: true });
            }}
          >
            <option value="" disabled>
              {!selectedCountry
                ? "Selecione um país primeiro"
                : statesQuery.isLoading
                  ? "Carregando estados..."
                  : "Selecione um estado/região"}
            </option>
            {values.estado && !selectedState && (
              <option value={values.estado}>{values.estado}</option>
            )}
            {states.map((state) => (
              <option key={state.id} value={state.iso2}>
                {state.name} ({state.iso2})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="label-tag" htmlFor="cidade">
            Cidade
          </label>
          <select
            id="cidade"
            className="input-field disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLocked || !selectedState || citiesQuery.isLoading}
            value={values.cidade}
            onChange={(e) =>
              setValue("cidade", e.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <option value="" disabled>
              {!selectedState
                ? "Selecione um estado primeiro"
                : citiesQuery.isLoading
                  ? "Carregando cidades..."
                  : "Selecione uma cidade"}
            </option>
            {values.cidade && !cities.some((city) => city.name === values.cidade) && (
              <option value={values.cidade}>{values.cidade}</option>
            )}
            {cities.map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}
