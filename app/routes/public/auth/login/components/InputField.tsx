import type { ComponentType, JSX } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

export type InputFieldProps = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  icon?: ComponentType<{ className?: string }>;
  registration?: UseFormRegisterReturn;
  errorMessage?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
};

/**
 * @name InputField
 * @description Campo de entrada estilizado para o formulário de login.
 *
 * @param {InputFieldProps} props - Propriedades do campo de entrada.
 * @returns {JSX.Element} Input com label e ícone opcional.
 *
 * Fluxo de execução:
 * 1. Calcula o estilo de borda com base no estado de validação.
 * 2. Renderiza label, input e mensagem de erro quando necessário.
 */
export function InputField({
  id,
  label,
  type = "text",
  placeholder,
  icon: Icon,
  registration,
  errorMessage,
  isInvalid,
  isDisabled,
}: InputFieldProps): JSX.Element {
  // Estilo condicional para indicar erro de validação
  const inputStyles = isInvalid
    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
    : "border-border focus:border-primary focus:ring-primary/40";

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative group">
        {Icon ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          disabled={isDisabled}
          className={`w-full rounded-lg border bg-card py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
            Icon ? "pl-10" : "pl-4"
          } pr-4 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${inputStyles}`}
          {...registration}
        />
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-500">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
