/**
 * Schemas Zod para os formularios do modulo de Repasse (FIN-11).
 * Validacao no cliente antes de submeter via TanStack Mutation.
 */

import { z } from "zod";
import {
  ALLOCATION_CATEGORIES,
  type AllocationPercents,
} from "~/types/repasse";

const percentField = z
  .number({ message: "Informe um número" })
  .min(0, "Mínimo 0%")
  .max(100, "Máximo 100%");

const allocationObject = z
  .object({
    marketing: percentField,
    desenvolvimento: percentField,
    infraestrutura: percentField,
    pessoal: percentField,
    juridico: percentField,
    operacional: percentField,
    reservaCaixa: percentField,
  })
  .superRefine((val, ctx) => {
    const total = Object.values(val).reduce(
      (acc, v) => acc + (typeof v === "number" ? v : 0),
      0,
    );
    if (Math.abs(total - 100) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A soma das alocações deve ser exatamente 100%",
      });
    }
  });

export const installmentRequestSchema = z.object({
  allocationPercents: allocationObject,
  observacao: z
    .string()
    .max(1000, "Observação deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
  // FIN-11 §8.2 — Relatorio do Mes (todos opcionais; validados no backend
  // tbm, com cross-field). No Zod so validamos tipos e tamanhos maximos.
  mensagemInvestidores: z
    .string()
    .max(5000, "Mensagem deve ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
  usoRecurso: z
    .string()
    .max(2000, "Uso do recurso deve ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
  teveLucro: z.boolean().optional(),
  marcoAlcancado: z.boolean().optional(),
  marcoDescricao: z
    .string()
    .max(2000, "Descricao do marco deve ter no máximo 2000 caracteres")
    .optional()
    .or(z.literal("")),
}).superRefine((val, ctx) => {
  // Cross-field validation: marcoDescricao exige marcoAlcancado=true.
  const marcoDesc = val.marcoDescricao?.trim();
  if (marcoDesc && val.marcoAlcancado !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["marcoDescricao"],
      message: "Descricao do marco exige 'Atingiu algum marco? = Sim'",
    });
  }
  if (val.marcoAlcancado === true && !marcoDesc) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["marcoDescricao"],
      message: "Se voce atingiu um marco, descreva-o",
    });
  }
});

export type InstallmentRequestFormValues = z.infer<typeof installmentRequestSchema>;

export const complianceDeliberateSchema = z.object({
  numeroParcelas: z
    .number({ message: "Informe o número de parcelas" })
    .int("Deve ser um inteiro")
    .min(12, "Mínimo 12 parcelas")
    .max(60, "Máximo 60 parcelas"),
  observacao: z
    .string()
    .max(1000, "Observação deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type ComplianceDeliberateFormValues = z.infer<typeof complianceDeliberateSchema>;

export const rejectInstallmentSchema = z.object({
  motivo: z
    .string({ message: "Informe o motivo" })
    .min(10, "Mínimo 10 caracteres")
    .max(1000, "Máximo 1000 caracteres"),
});

export type RejectInstallmentFormValues = z.infer<typeof rejectInstallmentSchema>;

export const markInstallmentPaidSchema = z.object({
  txidC6: z
    .string({ message: "Informe o txid C6" })
    .min(6, "txid C6 inválido")
    .max(64, "txid C6 inválido"),
  endToEndId: z
    .string({ message: "Informe o endToEndId" })
    .min(10, "endToEndId inválido")
    .max(64, "endToEndId inválido"),
});

export type MarkInstallmentPaidFormValues = z.infer<typeof markInstallmentPaidSchema>;

export const financeiroConfigureRepasseSchema = z.object({
  valorParcela: z
    .string({ message: "Informe o valor da parcela" })
    .regex(/^\d+(\.\d{1,2})?$/, "Use formato decimal válido (ex: 33333.33)"),
  valorUltimaParcela: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Use formato decimal válido")
    .optional()
    .or(z.literal("")),
  intervaloDias: z
    .number({ message: "Informe o intervalo entre parcelas" })
    .int()
    .min(15, "Mínimo 15 dias")
    .max(60, "Máximo 60 dias"),
  /**
   * Intervalo da PRIMEIRA parcela em dias (Sprint S36).
   * Quando nao informado, o backend usa o mesmo `intervaloDias` (regra antiga).
   * 1..120 dias — 1 dia e o minimo absoluto para evitar fraude (saque
   * no mesmo dia da captacao).
   */
  primeiraParcelaDias: z
    .number()
    .int("Informe um numero inteiro de dias")
    .min(1, "Minimo 1 dia")
    .max(120, "Maximo 120 dias")
    .optional(),
});

export type FinanceiroConfigureRepasseFormValues = z.infer<
  typeof financeiroConfigureRepasseSchema
>;

export const approveInstallmentSchema = z.object({
  valorOverride: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Use formato decimal válido")
    .optional()
    .or(z.literal("")),
  observacaoFinanceiro: z
    .string()
    .max(1000, "Observação deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type ApproveInstallmentFormValues = z.infer<typeof approveInstallmentSchema>;

/* Helpers compartilhados */

export function sumAllocationPercents(percents: AllocationPercents): number {
  return ALLOCATION_CATEGORIES.reduce(
    (acc, key) => acc + (percents[key] ?? 0),
    0,
  );
}

export function isAllocationValid(percents: AllocationPercents): boolean {
  return Math.abs(sumAllocationPercents(percents) - 100) < 0.01;
}

export function computeAllocationPreview(
  percent: number,
  valorParcela: string | number,
): number {
  const base = typeof valorParcela === "string"
    ? Number(valorParcela)
    : valorParcela;
  if (!Number.isFinite(base)) return 0;
  return Number(((base * percent) / 100).toFixed(2));
}
