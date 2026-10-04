import { z } from "zod";

/**
 * Conta o número de caracteres alfanuméricos em uma string (ignora máscara, espaços, etc).
 * Para documentos brasileiros: 11 = CPF, 14 = CNPJ (numérico ou alfanumérico).
 */
function alphanumericCount(value: string): number {
  return value.replace(/[^A-Za-z0-9]/g, "").length;
}

/**
 * Validação dos dados bancários da startup (payout). CPF/CNPJ aceita
 * tanto raw quanto mascarado — o que importa é a contagem de caracteres
 * alfanuméricos (11 = CPF, 14 = CNPJ numérico OU alfanumérico).
 * Normaliza para maiúsculas antes da contagem para consistência.
 */
export const bankingSchema = z.object({
  titular: z
    .string()
    .trim()
    .min(3, "Mínimo 3 caracteres")
    .max(120, "Máximo 120 caracteres"),

  documentoTitular: z
    .string()
    .trim()
    .refine(
      (v) => {
        const normalized = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        const n = alphanumericCount(normalized);
        return n === 11 || n === 14;
      },
      { message: "Informe um CPF (11 dígitos) ou CNPJ (14 caracteres alfanuméricos)" },
    ),

  banco: z
    .string()
    .trim()
    .min(2, "Informe o nome do banco")
    .max(80, "Máximo 80 caracteres"),

  tipoConta: z.enum(["corrente", "poupanca"], {
    message: "Selecione corrente ou poupança",
  }),

  agencia: z
    .string()
    .trim()
    .min(1, "Informe a agência")
    .max(10, "Máximo 10 caracteres")
    .regex(/^[0-9]+$/, "Apenas dígitos"),

  conta: z
    .string()
    .trim()
    .min(1, "Informe a conta")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[0-9]+$/, "Apenas dígitos"),

  digito: z
    .string()
    .trim()
    .max(2, "Máximo 2 caracteres")
    .regex(/^[0-9A-Za-z]*$/, "Apenas dígitos ou letra")
    .optional()
    .or(z.literal("")),

  chavePix: z
    .string()
    .trim()
    .max(140, "Máximo 140 caracteres")
    .optional()
    .or(z.literal("")),
});

export type BankingFormValues = z.infer<typeof bankingSchema>;
