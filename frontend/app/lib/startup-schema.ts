import { z } from "zod";

/**
 * Schema Zod para o form inline de cadastro rápido de startup no founder-dashboard.
 * Valida apenas os campos do form — o mutation hook adiciona defaults para
 * os campos obrigatórios do backend (CreateStartupOnboardingDto).
 */
export const newStartupFormSchema = z.object({
  nomeFantasia: z.string().min(2, "Nome fantasia obrigatório"),
  cnpj: z
    .string()
    .min(14, "CNPJ deve ter pelo menos 14 caracteres")
    .max(18, "CNPJ inválido"),
  areaAtuacao: z.enum([
    "tecnologia_saas",
    "fintech",
    "healthtech",
    "edtech",
    "biotech",
    "agrotech",
    "retail",
    "outro",
  ]),
  estagio: z.enum(["ideacao", "mvp", "operacao", "tracao", "escala"]),
  totalTokens: z.coerce.number().int().min(1000).max(10_000_000).default(100000),
  descricao: z
    .string()
    .min(3, "Descrição deve ter pelo menos 3 caracteres")
    .max(1000, "Descrição deve ter no máximo 1000 caracteres"),
});

export type NewStartupFormInput = z.infer<typeof newStartupFormSchema>;
