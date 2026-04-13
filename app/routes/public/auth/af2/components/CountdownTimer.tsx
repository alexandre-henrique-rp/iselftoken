import React, { useEffect, useState } from "react";

export type CountdownTimerProps = {
  /** Tempo inicial do contador em segundos */
  startInSeconds: number;
  /** Callback quando o contador finaliza */
  onComplete: () => void;
  /** Chave para reiniciar o contador */
  resetKey: number;
};

/**
 * @name CountdownTimer
 * @description Contador regressivo que dispara callback ao finalizar.
 *
 * @param {CountdownTimerProps} props - Parâmetros do contador.
 * @returns {React.ReactElement} Exibição do contador regressivo.
 */
export function CountdownTimer({
  startInSeconds,
  onComplete,
  resetKey,
}: CountdownTimerProps): React.ReactElement {
  const [timeLeft, setTimeLeft] = useState(startInSeconds);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    setTimeLeft(startInSeconds);
    setHasCompleted(false);
  }, [startInSeconds, resetKey]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (!hasCompleted) {
        setHasCompleted(true);
        onComplete();
      }
      return;
    }

    const timerId = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft, hasCompleted, onComplete]);

  /**
   * @name formatTime
   * @description Formata o tempo no formato MM:SS.
   *
   * @param {number} seconds - Segundos restantes.
   * @returns {string} Tempo formatado.
   */
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const isWarning = timeLeft < 60;

  return (
    <p
      className={`text-sm font-medium ${
        isWarning ? "text-red-400" : "text-stone-500"
      }`}
    >
      O código expira em {formatTime(timeLeft)}
    </p>
  );
}
