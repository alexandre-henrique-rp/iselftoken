import { useCallback, useEffect, useRef } from "react";

const DEBOUNCE_MS = 3000; // Salva a cada 3 segundos de inatividade

/**
 * Hook de auto-save para rascunhos de startup durante o wizard.
 *
 * Salva automaticamente os dados do formulário no backend via
 * POST /api/startup/draft (BFF proxy) com debounce de 3s.
 *
 * Restaura o rascunho na inicialização via GET /api/startup/draft.
 *
 * Referência: PRD CAPTACAO.md §10 (Risco 10) — "Auto-save via rascunho
 * a cada mudança de step"
 *
 * @param currentStep Step atual do wizard (1, 2, 3)
 * @param getValues Função react-hook-form para obter valores atuais
 * @param enabled Se o auto-save está ativo (desativa durante submit)
 */
export function useAutoSaveDraft(
  currentStep: number,
  getValues: () => Record<string, unknown>,
  enabled: boolean = true,
  changeKey: string = "",
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const save = useCallback(async () => {
    if (!enabled) return;

    const values = getValues();
    const payload = JSON.stringify({ step: currentStep, ...values });

    // Evita salvar se nada mudou
    if (payload === lastSavedRef.current) return;

    try {
      await fetch("/api/startup/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: payload,
      });
      lastSavedRef.current = payload;
    } catch {
      // Silencioso — auto-save não deve bloquear o UX
    }
  }, [currentStep, getValues, enabled]);

  // Debounced auto-save a cada alteração do formulário ou mudança de etapa.
  useEffect(() => {
    if (!enabled) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(save, DEBOUNCE_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentStep, save, enabled, changeKey]);

  // Salvar imediatamente ao mudar de step
  const saveOnStepChange = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    save();
  }, [save]);

  return { saveOnStepChange };
}

/**
 * Recupera o rascunho salvo do backend.
 * Retorna null se não houver rascunho.
 */
export async function loadDraft(): Promise<{
  data: Record<string, unknown> | null;
  step?: number;
  savedAt?: string;
} | null> {
  try {
    const res = await fetch("/api/startup/draft", {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const d = json?.data?.data ?? null;
    if (!d) return null;
    return {
      data: d,
      step: d?.step ?? 1,
      savedAt: json?.data?.savedAt,
    };
  } catch {
    return null;
  }
}

/**
 * Remove o rascunho do backend (chamado após submissão bem-sucedida).
 */
export async function deleteDraft(): Promise<void> {
  try {
    await fetch("/api/startup/draft", {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    // Silencioso
  }
}
