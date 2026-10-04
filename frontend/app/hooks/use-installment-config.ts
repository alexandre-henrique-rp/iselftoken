import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys } from "~/lib/queries";

/** Registro de configuração de parcelamento (espelha InstallmentConfig). */
export interface InstallmentConfigRecord {
  id: number;
  interestRate: number;
  maxInstallments: number;
  minInstallmentAmount: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
  isActive: boolean;
  notes: string | null;
}

/** Payload de criação (taxa já em DECIMAL — ex.: 0.0299). */
export interface CreateInstallmentConfigInput {
  interestRate: number;
  maxInstallments: number;
  minInstallmentAmount: number;
  notes?: string;
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalize(raw: unknown): InstallmentConfigRecord {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: toNumber(r.id),
    interestRate: toNumber(r.interestRate),
    maxInstallments: toNumber(r.maxInstallments),
    minInstallmentAmount: toNumber(r.minInstallmentAmount),
    effectiveFrom: String(r.effectiveFrom ?? ""),
    effectiveUntil: r.effectiveUntil ? String(r.effectiveUntil) : null,
    isActive: Boolean(r.isActive),
    notes: r.notes ? String(r.notes) : null,
  };
}

/** Config vigente (`GET /api/admin/installments/vigente`). */
export function useInstallmentConfigVigente() {
  return useQuery({
    queryKey: queryKeys.installmentConfig.vigente,
    queryFn: async (): Promise<InstallmentConfigRecord | null> => {
      const res = await fetch("/api/admin/installments/vigente", {
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? "Falha ao carregar a config vigente.");
      }
      const data = body?.data ?? body;
      return data ? normalize(data) : null;
    },
  });
}

/** Histórico de configs (`GET /api/admin/installments`). */
export function useInstallmentConfigHistory() {
  return useQuery({
    queryKey: queryKeys.installmentConfig.history,
    queryFn: async (): Promise<InstallmentConfigRecord[]> => {
      const res = await fetch("/api/admin/installments", {
        credentials: "include",
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.error) {
        throw new Error(body?.message ?? "Falha ao carregar o histórico.");
      }
      const data = body?.data ?? [];
      return Array.isArray(data) ? data.map(normalize) : [];
    },
  });
}

/** Cria uma nova config vigente (`POST /api/admin/installments`). */
export function useCreateInstallmentConfig() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, CreateInstallmentConfigInput>({
    mutationFn: async (input) => {
      const res = await fetch("/api/admin/installments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        throw new Error(
          body?.message ?? "Não foi possível salvar a configuração.",
        );
      }
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.installmentConfig.all });
      toast.success("Configuração de parcelamento atualizada!");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar.");
    },
  });
}
