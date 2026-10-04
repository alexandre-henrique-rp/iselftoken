/** Formulário administrativo para criação de cupons. */

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { useCreateCoupon } from "~/hooks/use-create-coupon";
import { PERCENT_WHITELIST } from "~/lib/api/coupons";
import { couponFormSchema, type CouponFormValues } from "~/lib/coupon-schema";

const fieldClassName =
  "w-full rounded-xl bg-black px-4 py-3 text-sm text-foreground outline outline-1 outline-white/10 placeholder:text-muted-foreground/60 focus:outline-2 focus:outline-primary";

export function CouponGeneratorForm() {
  const createCoupon = useCreateCoupon();
  const [singleUse, setSingleUse] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      percent: 50,
      maxUses: "1",
      validFrom: "",
      validUntil: "",
      description: "",
    },
  });

  const onSubmit = async (values: CouponFormValues) => {
    await createCoupon.mutateAsync({
      code: values.code.toUpperCase(),
      percent: values.percent,
      maxUses: singleUse ? 1 : values.maxUses ? Number(values.maxUses) : null,
      validFrom: values.validFrom || null,
      validUntil: values.validUntil || null,
      description: values.description.trim(),
    });
    reset();
    setSingleUse(false);
  };

  return (
    <form
      id="coupon-generator"
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-5 rounded-2xl bg-accent/20 p-4 shadow-lg md:p-6"
      aria-label="Gerador de cupom"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="text-2xl" aria-hidden="true">
            +
          </span>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Gerar cupom</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie uma campanha rastreável para o checkout.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="coupon-percent"
          className="text-sm font-medium text-foreground"
        >
          Desconto
        </label>
        <select
          id="coupon-percent"
          {...register("percent", { valueAsNumber: true })}
          className={fieldClassName}
        >
          {PERCENT_WHITELIST.map((percent) => (
            <option key={percent} value={percent}>
              {percent}% OFF
            </option>
          ))}
        </select>
        <FieldError message={errors.percent?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="coupon-code"
          className="text-sm font-medium text-foreground"
        >
          Código
        </label>
        <input
          id="coupon-code"
          {...register("code", {
            onChange: (event) => {
              event.target.value = event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9_-]/g, "");
            },
          })}
          placeholder="PROMO50"
          maxLength={32}
          autoComplete="off"
          className={`${fieldClassName} font-mono uppercase tracking-wider`}
          aria-describedby="coupon-code-hint"
        />
        <p id="coupon-code-hint" className="text-xs text-muted-foreground">
          3–32 caracteres; letras, números, _ e -.
        </p>
        <FieldError message={errors.code?.message} />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-black/60 p-4">
        <div>
          <p
            id="single-use-label"
            className="text-sm font-medium text-foreground"
          >
            Uso único global
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Limite global de 1 uso total.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={singleUse}
          aria-labelledby="single-use-label"
          onClick={() => setSingleUse((current) => !current)}
          className={`relative h-8 w-14 rounded-full p-1 transition-colors focus:outline-2 focus:outline-primary ${singleUse ? "bg-primary" : "bg-white/10"}`}
        >
          <span
            className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${singleUse ? "translate-x-6" : "translate-x-0"}`}
          />
        </button>
      </div>

      {!singleUse && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="max-uses"
            className="text-sm font-medium text-foreground"
          >
            Limite de usos
          </label>
          <input
            id="max-uses"
            type="number"
            min={1}
            max={1_000_000}
            {...register("maxUses")}
            className={fieldClassName}
          />
          <FieldError message={errors.maxUses?.message} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DateField
          id="valid-from"
          label="Válido de"
          registration={register("validFrom")}
          error={errors.validFrom?.message}
        />
        <DateField
          id="valid-until"
          label="Válido até"
          registration={register("validUntil")}
          error={errors.validUntil?.message}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="audit-desc"
          className="text-sm font-medium text-foreground"
        >
          Descrição interna
        </label>
        <textarea
          id="audit-desc"
          rows={3}
          maxLength={500}
          {...register("description")}
          placeholder="Campanha Black Friday 2026..."
          className={`${fieldClassName} resize-none`}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <button
        type="submit"
        disabled={createCoupon.isPending}
        className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-black shadow-[0_0_18px_rgba(213,0,249,0.25)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        aria-busy={createCoupon.isPending}
      >
        {createCoupon.isPending && (
          <span
            className="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
            aria-hidden="true"
          />
        )}
        {createCoupon.isPending ? "Gerando..." : "Gerar cupom"}
      </button>
    </form>
  );
}

function DateField({
  id,
  label,
  registration,
  error,
}: {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input id={id} type="date" {...registration} className={fieldClassName} />
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}
