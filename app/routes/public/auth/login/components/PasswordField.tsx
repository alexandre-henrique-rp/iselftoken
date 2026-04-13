import type { ComponentType, JSX } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

export type PasswordFieldProps = {
  id: string;
  label: string;
  placeholder?: string;
  icon?: ComponentType<{ className?: string }>;
  registration?: UseFormRegisterReturn;
  errorMessage?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
};

/**
 * @name PasswordField
 * @description Campo de senha com alternância de visibilidade.
 *
 * @param {PasswordFieldProps} props - Props do campo de senha.
 * @returns {JSX.Element} Input de senha com toggle de visualização.
 *
 * Fluxo de execução:
 * 1. Controla a visibilidade do texto da senha.
 * 2. Renderiza label, input, botão de alternância e mensagem de erro.
 */
export function PasswordField({
  id,
  label,
  placeholder,
  icon: Icon,
  registration,
  errorMessage,
  isInvalid,
  isDisabled,
}: PasswordFieldProps): JSX.Element {
  // Estado que controla se a senha ficará visível
  const [isVisible, setIsVisible] = useState(false);

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
          type={isVisible ? "text" : "password"}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          disabled={isDisabled}
          className={`w-full rounded-lg border bg-card py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
            Icon ? "pl-10" : "pl-4"
          } pr-10 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${inputStyles}`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          disabled={isDisabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
        >
          {isVisible ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-500">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
