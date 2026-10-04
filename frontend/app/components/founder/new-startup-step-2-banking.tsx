import type { FieldError } from "react-hook-form";
import { FormFieldError, startupInputClass } from "./new-startup-form-field";
import type { StartupStepProps } from "./new-startup-types";
import { digitsOnlyHandlerWithMax } from "~/lib/mask-utils";

const BANK_OPTIONS = [
  "99Pay",
  "Agibank",
  "Banco BS2",
  "Banco BTG Pactual",
  "Banco do Brasil",
  "Banco Pan",
  "Banco Safra",
  "Banco Votorantim (BV)",
  "Bank of America",
  "Banrisul",
  "Bradesco",
  "BNP Paribas",
  "C6 Bank",
  "Caixa Econômica Federal",
  "Citibank",
  "Deutsche Bank",
  "Digio",
  "HSBC",
  "Inter",
  "Itaú Unibanco",
  "JP Morgan",
  "Mercado Pago",
  "Modalmais",
  "Neon",
  "Next (Bradesco)",
  "Nubank",
  "Original",
  "PagBank (PagSeguro)",
  "PayPal",
  "PicPay",
  "Revolut",
  "Santander",
  "Scotiabank",
  "Sicoob",
  "Sicredi",
  "Sofisa Direto",
  "Stone (conta digital)",
  "Wells Fargo",
  "Wise",
];

export function NewStartupStep2Banking({
  form,
}: Pick<StartupStepProps, "form">) {
  const {
    register,
    formState: { errors },
  } = form;
  return (
    <section aria-labelledby="step-2-title" className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Etapa 2 de 3
        </p>
        <h2
          id="step-2-title"
          className="mt-1 text-2xl font-bold text-foreground"
        >
          Dados bancários
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-2 md:gap-5 md:p-5 lg:p-6">
        <BankInput
          id="titular"
          label="Nome do titular da conta"
          placeholder="Nome completo (igual ao cadastro)"
          register={register("titular")}
          error={errors.titular}
          wide
        />
        <BankInput
          id="documentoTitular"
          label="CPF/CNPJ do titular"
          placeholder="000.000.000-00 ou 00.000.000/0000-00"
          register={register("documentoTitular")}
          error={errors.documentoTitular}
          wide
        />
        <div className="space-y-2">
          <label
            htmlFor="banco"
            className="text-sm font-semibold text-foreground"
          >
            Banco
          </label>
          <select
            id="banco"
            className={`${startupInputClass} ${errors.banco ? "border-destructive" : ""}`}
            {...register("banco")}
            aria-invalid={Boolean(errors.banco)}
            aria-describedby={errors.banco ? "banco-error" : undefined}
          >
            <option value="" disabled>
              Selecione o banco
            </option>
            {BANK_OPTIONS.map((bank) => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
          <FormFieldError id="banco-error" error={errors.banco} />
        </div>
        <BankInput
          id="agencia"
          label="Agência"
          placeholder="0001"
          register={register("agencia")}
          error={errors.agencia}
          numericInput
          numericMaxLength={10}
        />
        <div className="grid grid-cols-4 gap-3">
          <BankInput
            id="conta"
            label="Número da conta"
            placeholder="12345"
            register={register("conta")}
            error={errors.conta}
            className="col-span-3"
            numericInput
            numericMaxLength={20}
          />
          <BankInput
            id="digito"
            label="Dígito"
            placeholder="6"
            register={register("digito")}
            error={errors.digito}
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor="tipoConta"
            className="text-sm font-semibold text-foreground"
          >
            Tipo de conta
          </label>
          <select
            id="tipoConta"
            className={startupInputClass}
            defaultValue="corrente"
            {...register("tipoConta")}
          >
            <option value="corrente">Corrente</option>
            <option value="poupanca">Poupança</option>
          </select>
        </div>
        <BankInput
          id="chavePix"
          label="Chave PIX (opcional)"
          placeholder="E-mail, CPF, telefone ou chave aleatória"
          register={register("chavePix")}
          error={errors.chavePix}
          wide
        />
      </div>
    </section>
  );
}

function BankInput({
  id,
  label,
  placeholder,
  register,
  error,
  wide,
  className = "",
  numericInput,
  numericMaxLength,
}: {
  id: string;
  label: string;
  placeholder: string;
  register: ReturnType<StartupStepProps["form"]["register"]>;
  error?: FieldError;
  wide?: boolean;
  className?: string;
  numericInput?: boolean;
  numericMaxLength?: number;
}) {
  return (
    <div className={`space-y-2 ${wide ? "md:col-span-2" : ""} ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <input
        id={id}
        className={`${startupInputClass} ${error ? "border-destructive" : ""}`}
        placeholder={placeholder}
        type="text"
        inputMode={numericInput ? "numeric" : undefined}
        maxLength={numericInput ? numericMaxLength : undefined}
        onChange={(e) => {
          if (numericInput) {
            digitsOnlyHandlerWithMax(numericMaxLength)(e);
          }
          register.onChange(e);
        }}
        onBlur={register.onBlur}
        ref={register.ref}
        name={register.name}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <FormFieldError id={`${id}-error`} error={error} />
    </div>
  );
}
