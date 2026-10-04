import type { FieldError } from "react-hook-form";

export function FormFieldError({
  error,
  id,
}: {
  error?: FieldError;
  id: string;
}) {
  if (!error?.message) return null;
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {String(error.message)}
    </p>
  );
}

export { startupInputClass } from "~/lib/form-styles";
