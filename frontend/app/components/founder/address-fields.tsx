import type { UseFormReturn } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import { cn } from "~/lib/utils";

interface AddressFieldsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
}

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function AddressFields({ form }: AddressFieldsProps) {
  const { register, setValue, watch, formState: { errors } } = form;
  const cep = watch("cep") ?? "";

  const handleCepChange = (raw: string) => {
    setValue("cep", formatCep(raw), { shouldValidate: true, shouldDirty: true });
  };

  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-8">
      <header>
        <h2 className="text-2xl font-black tracking-tight italic">Endereço</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Endereço da sede informado no CNPJ. Buscar o CNPJ preenche estes campos automaticamente.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
        <div className="space-y-2 md:col-span-2">
          <label htmlFor="cep" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            CEP
          </label>
          <input
            id="cep"
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="00000-000"
            className={cn("input-field", errors.cep && "border-red-500")}
          />
          {errors.cep && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {String(errors.cep.message ?? "")}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-4">
          <label htmlFor="logradouro" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Logradouro
          </label>
          <input
            id="logradouro"
            {...register("logradouro")}
            className={cn("input-field", errors.logradouro && "border-red-500")}
            placeholder="Rua, avenida, alameda…"
          />
          {errors.logradouro && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {String(errors.logradouro.message ?? "")}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="numero" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Número
          </label>
          <input
            id="numero"
            {...register("numero")}
            className={cn("input-field", errors.numero && "border-red-500")}
            placeholder="123"
          />
          {errors.numero && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {String(errors.numero.message ?? "")}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-4">
          <label htmlFor="complemento" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Complemento (opcional)
          </label>
          <input
            id="complemento"
            {...register("complemento")}
            className="input-field"
            placeholder="Sala 102, andar 17…"
          />
        </div>

        <div className="space-y-2 md:col-span-3">
          <label htmlFor="bairro" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Bairro
          </label>
          <input
            id="bairro"
            {...register("bairro")}
            className={cn("input-field", errors.bairro && "border-red-500")}
          />
          {errors.bairro && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {String(errors.bairro.message ?? "")}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label htmlFor="cidade" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Cidade
          </label>
          <input
            id="cidade"
            {...register("cidade")}
            className={cn("input-field", errors.cidade && "border-red-500")}
          />
          {errors.cidade && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {String(errors.cidade.message ?? "")}
            </p>
          )}
        </div>

        <div className="space-y-2 md:col-span-1">
          <label htmlFor="uf" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            UF
          </label>
          <select
            id="uf"
            {...register("uf")}
            className={cn("input-field cursor-pointer", errors.uf && "border-red-500")}
          >
            <option value="">--</option>
            {UF_OPTIONS.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          {errors.uf && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {String(errors.uf.message ?? "")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
