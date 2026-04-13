import React, { useRef } from "react";

export type OtpInputProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
};

/**
 * @name OtpInput
 * @description Input OTP com navegação automática e suporte a colar.
 *
 * @param {OtpInputProps} props - Configuração do OTP.
 * @returns {JSX.Element} Campo OTP.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
}: OtpInputProps): React.ReactElement {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  /**
   * @name focusInput
   * @description Move o foco para o input indicado.
   *
   * @param {number} index - Índice do input.
   */
  const focusInput = (index: number) => {
    inputsRef.current[index]?.focus();
  };

  /**
   * @name handleChange
   * @description Controla digitação e avanço automático.
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - Evento do input.
   * @param {number} index - Índice do input.
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const val = e.target.value;
    if (!/^[0-9]*$/.test(val)) return;

    const newValue = value.split("");
    newValue[index] = val.substring(val.length - 1);
    const newString = newValue.join("");

    onChange(newString);

    // Auto-focus next
    // Motivo: melhorar a experiência de digitação do usuário
    if (val && index < length - 1) {
      focusInput(index + 1);
    }

    if (newString.length === length && onComplete) {
      onComplete(newString);
    }
  };

  /**
   * @name handleKeyDown
   * @description Navega para o input anterior no backspace.
   *
   * @param {React.KeyboardEvent<HTMLInputElement>} e - Evento do teclado.
   * @param {number} index - Índice do input.
   */
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  /**
   * @name handlePaste
   * @description Permite colar o OTP completo e distribui nos inputs.
   *
   * @param {React.ClipboardEvent} e - Evento de colagem.
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text")
      .slice(0, length)
      .replace(/[^0-9]/g, "");

    if (pastedData) {
      onChange(pastedData.padEnd(length, "").slice(0, length));
      focusInput(Math.min(pastedData.length, length - 1));
    }
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={
            "w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg " +
            "bg-stone-900 text-stone-100 border transition-all duration-200 " +
            "focus:outline-none focus:ring-2 focus:ring-blue-600/50 " +
            (value[i] ? "border-blue-600" : "border-stone-800")
          }
        />
      ))}
    </div>
  );
}
