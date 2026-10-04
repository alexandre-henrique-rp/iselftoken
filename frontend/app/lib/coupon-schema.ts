import { z } from "zod";
import { PERCENT_WHITELIST } from "~/lib/api/coupons";

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "O código deve ter pelo menos 3 caracteres.")
      .max(32, "O código deve ter no máximo 32 caracteres.")
      .regex(/^[A-Z0-9_-]+$/, "Use apenas letras, números, _ e -."),
    percent: z
      .number()
      .refine(
        (value) =>
          PERCENT_WHITELIST.includes(
            value as (typeof PERCENT_WHITELIST)[number],
          ),
        "Selecione um percentual válido.",
      ),
    maxUses: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          (/^\d+$/.test(value) &&
            Number(value) >= 1 &&
            Number(value) <= 1_000_000),
        "Informe um limite entre 1 e 1.000.000.",
      ),
    validFrom: z.string(),
    validUntil: z.string(),
    description: z
      .string()
      .trim()
      .min(1, "Informe uma descrição interna para auditoria.")
      .max(500, "A descrição deve ter no máximo 500 caracteres."),
  })
  .superRefine((value, context) => {
    if (
      value.validFrom &&
      value.validUntil &&
      value.validFrom > value.validUntil
    ) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "A data final deve ser posterior à data inicial.",
      });
    }
  });

export type CouponFormValues = z.infer<typeof couponFormSchema>;
