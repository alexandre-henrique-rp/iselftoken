/**
 * Schema Zod para distribuição de recursos de uma rodada de captação.
 *
 * Extraído de `app/lib/new-startup-schema.ts` (complementaryStartupSchema, linhas 211-218 + superRefine 253-270).
 * MANTER SINCRONIZADO com `complementaryStartupSchema` se o backend mudar a lógica de validação.
 *
 * Os 7 campos representam a alocação percentual dos recursos captados:
 * - Fundador, Desenvolvimento, Comercial, Marketing, Nuvem, Jurídico, Reserva de Caixa
 * - A soma dos 7 deve ser exatamente 100%.
 *
 * @example
 * const result = roundDistributionSchema.safeParse({
 *   recursosFundador: 30,
 *   recursosDesenvolvimento: 25,
 *   recursosComercial: 15,
 *   recursosMarketing: 10,
 *   recursosNuvem: 8,
 *   recursosJuridico: 7,
 *   recursosCaixa: 5,
 * });
 * // result.success === true (soma = 100)
 */
import { z } from "zod";

/** Limite máximo para a categoria FUNDADOR — alinhado com CASE.md [Captação]
 *  e com o backend (`MAX_FUNDADOR_PERCENTUAL` em campaign-resource.service.ts). */
export const MAX_FUNDADOR_PERCENTUAL = 20;

export const roundDistributionSchema = z
  .object({
    recursosFundador: z
      .number()
      .min(0)
      .max(
        MAX_FUNDADOR_PERCENTUAL,
        `A alocação para o Fundador não pode ultrapassar ${MAX_FUNDADOR_PERCENTUAL}%`,
      ),
    recursosDesenvolvimento: z.number().min(0).max(100),
    recursosComercial: z.number().min(0).max(100),
    recursosMarketing: z.number().min(0).max(100),
    recursosNuvem: z.number().min(0).max(100),
    recursosJuridico: z.number().min(0).max(100),
    recursosCaixa: z.number().min(0).max(100),
  })
  .superRefine((data, ctx) => {
    const total =
      data.recursosFundador +
      data.recursosDesenvolvimento +
      data.recursosComercial +
      data.recursosMarketing +
      data.recursosNuvem +
      data.recursosJuridico +
      data.recursosCaixa;

    if (total !== 100) {
      ctx.addIssue({
        path: ["recursosFundador"],
        code: z.ZodIssueCode.custom,
        message: `A soma dos recursos deve ser exatamente 100%. Total atual: ${total}%`,
      });
    }
  });

export type RoundDistributionInput = z.infer<typeof roundDistributionSchema>;
