import type { UseFormReturn } from "react-hook-form";
import { AlertCircle } from "lucide-react";
import {
  applyCpfCnpjMask,
  digitsOnlyHandlerWithMax,
} from "~/lib/mask-utils";
import { cn } from "~/lib/utils";

interface BankingDetailsProps {
  mode?: "create" | "edit";
  form: UseFormReturn<any>;
}

export function BankingDetails({ form }: BankingDetailsProps) {
  return (
    <section className="glass-card rounded-3xl p-8 lg:p-10 space-y-8">
      <header>
        <h2 className="text-2xl font-black tracking-tight italic">Dados bancários</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Conta para recebimento dos aportes. Dados criptografados e acessíveis apenas pelo financeiro iSelfToken.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FieldText name="titular" label="Titular" form={form} />
        <FieldText name="documentoTitular" label="CPF/CNPJ do titular" form={form} placeholder="000.000.000-00 ou 00.000.000/0000-00" />
        <FieldText name="banco" label="Banco" form={form} placeholder="Ex: Itaú" />
        <FieldRadio name="tipoConta" label="Tipo de conta" form={form} options={[{ value: "corrente", label: "Corrente" }, { value: "poupanca", label: "Poupança" }]} />
        <FieldText
          name="agencia"
          label="Agência"
          form={form}
          placeholder="1234"
          numericInput
          numericMaxLength={10}
        />
        <FieldText
          name="conta"
          label="Conta"
          form={form}
          placeholder="56789"
          numericInput
          numericMaxLength={20}
        />
        <FieldText name="digito" label="Dígito" form={form} placeholder="0" />
        <div className="md:col-span-2">
          <FieldText name="chavePix" label="Chave PIX (opcional)" form={form} placeholder="email, CPF, telefone ou aleatória" />
        </div>
      </div>
    </section>
  );
}

interface FieldTextProps {
  name: string;
  label: string;
  form: UseFormReturn<any>;
  placeholder?: string;
  numericInput?: boolean;
  numericMaxLength?: number;
}

function FieldText({ name, label, form, placeholder, numericInput, numericMaxLength }: FieldTextProps) {
  const err = form.formState.errors[name];
  const registerProps = form.register(name);
  const currentValue = form.watch(name);
  const isDocument = name === "documentoTitular";
  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      <input
        id={name}
        {...registerProps}
        value={isDocument ? applyCpfCnpjMask(String(currentValue ?? "")) : undefined}
        placeholder={placeholder}
        inputMode={numericInput || isDocument ? "numeric" : undefined}
        maxLength={isDocument ? 18 : numericInput ? numericMaxLength : undefined}
        onChange={(e) => {
          if (isDocument) {
            form.setValue(name, applyCpfCnpjMask(e.target.value), {
              shouldDirty: true,
              shouldValidate: true,
            });
            return;
          }
          if (numericInput) {
            digitsOnlyHandlerWithMax(numericMaxLength)(e);
          }
          registerProps.onChange(e);
        }}
        className={cn("input-field", err && "border-red-500")}
      />
      {err && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {String(err.message ?? "")}
        </p>
      )}
    </div>
  );
}

interface FieldRadioProps {
  name: string;
  label: string;
  form: UseFormReturn<any>;
  options: { value: string; label: string }[];
}

function FieldRadio({ name, label, form, options }: FieldRadioProps) {
  const err = form.formState.errors[name];
  return (
    <div className="space-y-2">
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-3">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 cursor-pointer rounded-xl bg-black/30 border border-white/5 px-4 py-3 text-sm hover:border-primary/40 transition-colors">
            <input type="radio" value={opt.value} {...form.register(name)} className="accent-primary" />
            {opt.label}
          </label>
        ))}
      </div>
      {err && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {String(err.message ?? "")}
        </p>
      )}
    </div>
  );
}
