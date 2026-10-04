import { useQuery } from "@tanstack/react-query";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCepLookup } from "~/hooks/use-cep-lookup";
import { useUpdateAddressMutation } from "~/hooks/use-update-address-mutation";
import { applyCepMask } from "~/lib/mask-utils";
import {
  citiesByStateQueryOptions,
  countriesQueryOptions,
  statesByCountryQueryOptions,
} from "~/lib/queries";
import type { Pais, UserData } from "~/types/auth";
import { CountrySelect } from "./country-select";

interface ProfileAddressCardProps {
  user: UserData | null | undefined;
}

interface AddressForm {
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  cidade: string;
  uf: string;
  pais: Pais | null;
  stateId: number | null;
}

function paisFromUser(u: UserData | null | undefined): Pais | null {
  if (!u?.pais) return null;
  if (typeof u.pais === "string") {
    try {
      return JSON.parse(u.pais) as Pais;
    } catch {
      return null;
    }
  }
  return u.pais;
}

function snapshot(u: UserData | null | undefined): AddressForm {
  return {
    endereco: u?.endereco ?? "",
    numero: u?.numero ?? "",
    complemento: u?.complemento ?? "",
    bairro: u?.bairro ?? "",
    cep: u?.cep ?? "",
    cidade: u?.cidade ?? "",
    uf: u?.uf ?? "",
    pais: paisFromUser(u),
    stateId: null,
  };
}

function formatCep(raw: string): string {
  return applyCepMask(raw);
}

function normalizeLocationName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

export function ProfileAddressCard({ user }: ProfileAddressCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AddressForm>(() => snapshot(user));

  const isBrazil = form.pais?.iso3?.toUpperCase() === "BRA";
  const countriesQuery = useQuery(countriesQueryOptions);
  const brazilCountry =
    countriesQuery.data?.find(
      (country) => country.id === 31 && country.iso3.toUpperCase() === "BRA",
    ) ??
    countriesQuery.data?.find(
      (country) => country.iso3.toUpperCase() === "BRA",
    );
  const countryId = isBrazil ? (form.pais?.id ?? null) : null;
  const statesQuery = useQuery(statesByCountryQueryOptions(countryId));
  const citiesQuery = useQuery(
    citiesByStateQueryOptions(countryId, form.stateId),
  );

  // Sem país selecionado, o CEP ainda pode identificar automaticamente o Brasil.
  // Para países estrangeiros, o ViaCEP permanece desativado.
  const shouldLookupCep = !form.pais || isBrazil;
  const cepQuery = useCepLookup(shouldLookupCep ? form.cep : "");
  const lastAppliedCepRef = useRef<string>("");
  useEffect(() => {
    if (!shouldLookupCep || !cepQuery.data) return;
    const data = cepQuery.data;
    const digits = form.cep.replace(/\D/g, "");
    if (lastAppliedCepRef.current === digits) return;
    lastAppliedCepRef.current = digits;
    setForm((f) => ({
      ...f,
      endereco: data.logradouro || f.endereco,
      bairro: data.bairro || f.bairro,
      cidade: data.cidade || f.cidade,
      uf: data.uf || f.uf,
    }));
  }, [cepQuery.data, form.cep, shouldLookupCep]);

  // Uma resposta válida do ViaCEP confirma que o endereço é brasileiro.
  // Usa o registro da API de países, cujo id do Brasil é 31.
  useEffect(() => {
    if (!cepQuery.data || form.pais || !brazilCountry) return;
    setForm((f) =>
      f.pais
        ? f
        : {
            ...f,
            pais: {
              id: brazilCountry.id,
              iso3: brazilCountry.iso3,
              nome: brazilCountry.name,
              emoji: brazilCountry.emoji,
            },
          },
    );
  }, [brazilCountry, cepQuery.data, form.pais]);

  // Hydrate id on the saved pais (legacy data only stored iso3/nome/emoji) once countries load.
  useEffect(() => {
    if (!form.pais || form.pais.id) return;
    const match = countriesQuery.data?.find((c) => c.iso3 === form.pais?.iso3);
    if (match) {
      setForm((f) =>
        f.pais ? { ...f, pais: { ...f.pais, id: match.id } } : f,
      );
    }
  }, [countriesQuery.data, form.pais]);

  // Resolve stateId from the ViaCEP UF only for Brazil.
  useEffect(() => {
    if (!isBrazil || !form.uf || form.stateId) return;
    const match = statesQuery.data?.find((s) => s.iso2 === form.uf);
    if (match) setForm((f) => ({ ...f, stateId: match.id }));
  }, [isBrazil, statesQuery.data, form.uf, form.stateId]);

  // Resolve the ViaCEP city to the canonical city name from the database.
  useEffect(() => {
    if (!isBrazil || !form.stateId || !form.cidade || !citiesQuery.data) {
      return;
    }
    const normalizedCity = normalizeLocationName(form.cidade);
    const match = citiesQuery.data.find(
      (city) => normalizeLocationName(city.name) === normalizedCity,
    );
    if (match && match.name !== form.cidade) {
      setForm((f) => ({ ...f, cidade: match.name }));
    }
  }, [citiesQuery.data, form.cidade, form.stateId, isBrazil]);

  // Reset form to user snapshot whenever we exit edit mode (or user data changes outside editing).
  useEffect(() => {
    if (!editing) setForm(snapshot(user));
  }, [user, editing]);

  const paisRead = paisFromUser(user);
  const ufLabel = useMemo(() => {
    const stateName = statesQuery.data?.find((s) => s.iso2 === user?.uf)?.name;
    return stateName ? `${user?.uf} — ${stateName}` : user?.uf;
  }, [statesQuery.data, user?.uf]);

  const mutation = useUpdateAddressMutation();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form, {
      onSuccess: () => setEditing(false),
    });
  };

  const handleCountryChange = (pais: Pais | null) => {
    setForm((f) => ({
      ...f,
      pais,
      uf: "",
      stateId: null,
      cidade: "",
    }));
  };

  const handleStateChange = (stateId: number) => {
    const state = statesQuery.data?.find((s) => s.id === stateId);
    setForm((f) => ({
      ...f,
      stateId: state?.id ?? null,
      uf: state?.iso2 ?? "",
      cidade: "",
    }));
  };

  return (
    <section className="glass-panel rounded-xl border border-white/5 p-5 md:p-6">
      <header className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-foreground sm:text-lg">
          <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="size-4" />
          </span>
          Endereço
        </h2>
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={mutation.isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-surface-container-high transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="address-form"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              Salvar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            Editar
          </button>
        )}
      </header>

      {editing ? (
        <form id="address-form" onSubmit={handleSave} className="grid gap-3.5">
          {/* CEP primeiro para disparar o ViaCEP e preencher o endereço/bairro. */}
          <Field label="CEP">
            <div className="relative">
              <input
                inputMode="numeric"
                value={form.cep}
                onChange={(e) => {
                  const masked = formatCep(e.target.value);
                  setForm((f) => ({ ...f, cep: masked }));
                  // Reseta o ref quando o usuário começa a digitar outro CEP
                  if (lastAppliedCepRef.current !== masked.replace(/\D/g, "")) {
                    lastAppliedCepRef.current = "";
                  }
                }}
                placeholder="00000-000"
                className={inputClass}
                aria-invalid={
                  cepQuery.isError ||
                  (form.cep.replace(/\D/g, "").length === 8 &&
                    cepQuery.data === null)
                }
                maxLength={9}
              />
              {cepQuery.isFetching ? (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-primary" />
              ) : cepQuery.isError ? (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-destructive"
                  aria-live="polite"
                >
                  CEP não encontrado
                </span>
              ) : null}
            </div>
            {cepQuery.isError ? (
              <p className="text-[11px] text-destructive mt-1">
                {(cepQuery.error as Error).message}. Preencha o endereço
                manualmente.
              </p>
            ) : null}
          </Field>

          <Field label="Logradouro">
            <input
              value={form.endereco}
              onChange={(e) =>
                setForm((f) => ({ ...f, endereco: e.target.value }))
              }
              className={inputClass}
              placeholder="Rua, avenida, travessa..."
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
            <Field label="Nº">
              <input
                value={form.numero}
                onChange={(e) =>
                  setForm((f) => ({ ...f, numero: e.target.value }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="Complemento">
              <input
                value={form.complemento}
                onChange={(e) =>
                  setForm((f) => ({ ...f, complemento: e.target.value }))
                }
                className={inputClass}
                placeholder="Apto, sala, bloco..."
              />
            </Field>
          </div>

          <Field label="Bairro">
            <input
              value={form.bairro}
              onChange={(e) =>
                setForm((f) => ({ ...f, bairro: e.target.value }))
              }
              className={inputClass}
            />
          </Field>

          <Field label="País">
            <CountrySelect value={form.pais} onChange={handleCountryChange} />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Estado">
              {isBrazil ? (
                <select
                  value={form.stateId ?? ""}
                  onChange={(e) => handleStateChange(Number(e.target.value))}
                  disabled={!countryId || statesQuery.isLoading}
                  className={selectClass}
                >
                  <option value="" disabled>
                    {!countryId
                      ? "Selecione o país primeiro"
                      : statesQuery.isLoading
                        ? "Carregando..."
                        : "Selecione"}
                  </option>
                  {statesQuery.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.iso2} — {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.uf}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      uf: e.target.value,
                      stateId: null,
                    }))
                  }
                  className={inputClass}
                  placeholder="Estado ou província"
                />
              )}
            </Field>
            <Field label="Cidade">
              {isBrazil ? (
                <select
                  value={form.cidade}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cidade: e.target.value }))
                  }
                  disabled={!form.stateId || citiesQuery.isLoading}
                  className={selectClass}
                >
                  <option value="" disabled>
                    {!form.stateId
                      ? "Selecione o estado primeiro"
                      : citiesQuery.isLoading
                        ? "Carregando..."
                        : "Selecione"}
                  </option>
                  {form.cidade &&
                  !citiesQuery.data?.some((c) => c.name === form.cidade) ? (
                    <option value={form.cidade}>{form.cidade}</option>
                  ) : null}
                  {citiesQuery.data?.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.cidade}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cidade: e.target.value }))
                  }
                  className={inputClass}
                  placeholder="Cidade"
                />
              )}
            </Field>
          </div>

          {mutation.isError ? (
            <p className="text-xs text-destructive font-medium">
              {mutation.error.message}
            </p>
          ) : null}
        </form>
      ) : (
        <dl className="grid gap-3.5 sm:grid-cols-2">
          <ReadField
            label="CEP"
            value={user?.cep ? formatCep(user.cep) : undefined}
          />
          <ReadField
            label="Logradouro"
            value={[user?.endereco, user?.numero, user?.complemento]
              .filter(Boolean)
              .join(", ")}
            full
          />
          <ReadField label="Bairro" value={user?.bairro} />
          <ReadField label="Cidade" value={user?.cidade} />
          <ReadField label="Estado" value={ufLabel ?? undefined} />
          <ReadField
            label="País"
            value={paisRead ? `${paisRead.emoji} ${paisRead.nome}` : undefined}
            full
          />
        </dl>
      )}
    </section>
  );
}

const inputClass =
  "w-full bg-surface-container-high border-none border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all py-2.5 px-3.5 text-foreground rounded-lg text-sm";
const selectClass =
  "w-full bg-surface-container-high border-none border-b-2 border-transparent focus:border-primary focus:ring-0 transition-all py-2.5 px-3.5 text-foreground rounded-lg text-sm appearance-none cursor-pointer disabled:opacity-60";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 ml-0.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function ReadField({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string | undefined;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground px-0.5">
        {value || "—"}
      </dd>
    </div>
  );
}
