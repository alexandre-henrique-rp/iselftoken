"use client";

import { FC, ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cpfMaskHandler, phoneMaskHandler } from "@/lib/mask-utils";

export type AffiliateInputs = {
  nome: string;
  cpf: string;
  telefone: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
  numero: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
  termo: boolean;
};

export type AffiliateFormProps = {
  cidadeInicial?: string;
  ufInicial?: string;
  paisInicial?: string;
  ddi?: string;
};

/**
 * Formulário de registro de afiliado, replicando a experiência dos demais cadastros
 * com suporte a i18n, máscaras e validação via Zod. Responsivo e pronto para dark/light.
 */
export const AffiliateForm: FC<AffiliateFormProps> = ({
  cidadeInicial,
  ufInicial,
  paisInicial,
  ddi,
}) => {
  const router = useRouter();
  const { t } = useTranslation("register");

  const affiliateSchema = z
    .object({
      nome: z.string().min(1, t("form.name.required")),
      cpf: z
        .string()
        .transform((v) => String(v).replace(/\D/g, ""))
        .pipe(z.string().length(11, t("form.cpf.invalid"))),
      telefone: z.string().min(1, t("form.phone.required")),
      cep: z
        .string()
        .transform((v) => String(v).replace(/\D/g, ""))
        .pipe(z.string().length(8, t("form.cep.invalid"))),
      endereco: z.string().min(1, t("form.address.required")),
      bairro: z.string().min(1, t("form.neighborhood.required")),
      cidade: z.string().min(1, t("form.city.required")),
      uf: z.string().min(1, t("form.state.required")),
      pais: z.string().min(1, "País é obrigatório"),
      numero: z.string().min(1, t("form.number.required")),
      email: z.string().min(1, t("form.email.required")),
      senha: z.string().min(12, t("form.password.min")),
      confirmacaoSenha: z.string().min(12, t("form.confirm_password.min")),
      termo: z.boolean().refine((v) => v === true, {
        message: t("form.terms.required"),
      }),
    })
    .refine((data) => data.senha === data.confirmacaoSenha, {
      message: t("form.confirm_password.mismatch"),
      path: ["confirmacaoSenha"],
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    clearErrors,
  } = useForm<AffiliateInputs>({
    resolver: zodResolver(affiliateSchema),
    defaultValues: {
      cidade: cidadeInicial || "",
      uf: ufInicial || "",
      pais: paisInicial || "",
      termo: false,
    },
  });

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [ultimoCepBuscado, setUltimoCepBuscado] = useState<string | null>(null);

  useEffect(() => {
    if (cidadeInicial) setValue("cidade", cidadeInicial, { shouldValidate: true });
    if (ufInicial) setValue("uf", ufInicial, { shouldValidate: true });
    if (paisInicial) setValue("pais", paisInicial, { shouldValidate: true });
  }, [cidadeInicial, ufInicial, paisInicial, setValue]);

  const onSubmit: SubmitHandler<AffiliateInputs> = async (data) => {
    try {
      const response = await fetch(`/api/register/afiliado`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...data,
          telefone: `${ddi ?? ""}${data.telefone}`,
          redirectPath: "/login",
        }),
      });

      let result;
      try {
        result = await response.json();
      } catch {
        toast("Erro ao registrar afiliado", {
          duration: 5000,
          description: "Erro na comunicação com o servidor",
        });
        return;
      }

      if (!response.ok) {
        toast("Erro ao registrar afiliado", {
          description: result.message || "Erro ao registrar afiliado",
          duration: 5000,
        });
        return;
      }

      toast("Afiliado registrado com sucesso", {
        duration: 5000,
      });
      router.push(result.url ?? "/login");
    } catch (error) {
      console.error(error);
      toast("Erro ao registrar afiliado", {
        duration: 5000,
        description: "Erro de conexão",
      });
    }
  };

  const buscarCep = async (raw: string) => {
    if (raw.length !== 8) return;
    if ((ultimoCepBuscado === raw && !errors.cep) || buscandoCep) return;
    setUltimoCepBuscado(raw);
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data?.erro) {
        setError("cep", {
          type: "manual",
          message: t("form.cep.not_found"),
        });
        return;
      }
      clearErrors("cep");
      setValue("endereco", data?.logradouro || "");
      setValue("bairro", data?.bairro || "");
      clearErrors(["endereco", "bairro"]);
    } catch {
      setError("cep", {
        type: "manual",
        message: t("form.cep.search_error"),
      });
    } finally {
      setBuscandoCep(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <input type="hidden" {...register("pais")}></input>

      <div className="grid gap-2">
        <Label htmlFor="nome">{t("form.name.label")}</Label>
        <Input id="nome" {...register("nome")} />
        {errors.nome && <p className="text-sm text-red-500">{errors.nome.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="cpf">{t("form.cpf.label")}</Label>
          <Input
            id="cpf"
            {...register("cpf")}
            onChange={(e: ChangeEvent<HTMLInputElement>) => cpfMaskHandler(e)}
            maxLength={14}
            placeholder={t("form.cpf.placeholder")}
          />
          {errors.cpf && <p className="text-sm text-red-500">{errors.cpf.message}</p>}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="telefone">{t("form.phone.label")}</Label>
          <Input
            id="telefone"
            {...register("telefone")}
            onChange={(e: ChangeEvent<HTMLInputElement>) => phoneMaskHandler(e)}
            maxLength={15}
            placeholder={t("form.phone.placeholder")}
          />
          {errors.telefone && (
            <p className="text-sm text-red-500">{errors.telefone.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cep">{t("form.cep.label")}</Label>
          <Input
            id="cep"
            {...register("cep")}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const maskedValue = e.target.value;
              setValue("cep", maskedValue, { shouldValidate: true });
              const rawValue = maskedValue.replace(/\D/g, "");
              if (rawValue.length === 8) {
                buscarCep(rawValue);
              }
            }}
            onBlur={(e) => {
              const raw = e.currentTarget.value.replace(/\D/g, "");
              buscarCep(raw);
            }}
            maxLength={9}
            placeholder={t("form.cep.placeholder")}
          />
          {errors.cep && <p className="text-sm text-red-500">{errors.cep.message}</p>}
          {buscandoCep && (
            <span className="text-muted-foreground text-xs" aria-live="polite">
              {t("form.cep.searching")}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="endereco">{t("form.address.label")}</Label>
        <Input id="endereco" {...register("endereco")} />
        {errors.endereco && <p className="text-sm text-red-500">{errors.endereco.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="bairro">{t("form.neighborhood.label")}</Label>
          <Input id="bairro" {...register("bairro")} />
          {errors.bairro && <p className="text-sm text-red-500">{errors.bairro.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cidade">{t("form.city.label")}</Label>
          <Input id="cidade" readOnly aria-readonly {...register("cidade")} />
          {errors.cidade && <p className="text-sm text-red-500">{errors.cidade.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="uf">{t("form.state.label")}</Label>
          <Input id="uf" maxLength={2} readOnly aria-readonly {...register("uf")} />
          {errors.uf && <p className="text-sm text-red-500">{errors.uf.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="numero">{t("form.number.label")}</Label>
          <Input id="numero" {...register("numero")} />
          {errors.numero && <p className="text-sm text-red-500">{errors.numero.message}</p>}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="email">{t("form.email.label")}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t("form.email.placeholder")}
          minLength={6}
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="senha">{t("form.password.label")}</Label>
          <Input
            id="senha"
            type="password"
            placeholder={t("form.password.placeholder")}
            minLength={12}
            {...register("senha")}
          />
          {errors.senha && <p className="text-sm text-red-500">{errors.senha.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmacaoSenha">{t("form.confirm_password.label")}</Label>
          <Input
            id="confirmacaoSenha"
            type="password"
            placeholder={t("form.confirm_password.placeholder")}
            minLength={12}
            {...register("confirmacaoSenha")}
          />
          {errors.confirmacaoSenha && (
            <p className="text-sm text-red-500">{errors.confirmacaoSenha.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <input
          id="termo"
          type="checkbox"
          {...register("termo")}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <Label htmlFor="termo" className="text-sm leading-relaxed">
          <span className="block">{t("form.terms.accept")}</span>
          <span className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              className="text-primary underline hover:no-underline"
              onClick={() => router.push("/politicas")}
            >
              {t("form.terms.terms_of_use")}
            </button>
            <span>{t("form.terms.and")}</span>
            <button
              type="button"
              className="text-primary underline hover:no-underline"
              onClick={() =>
                window.open(
                  "https://iselftoken.net/termo-de-uso-para-consultor-afiliado-iselftoken/",
                  "_blank"
                )
              }
            >
              {t("form.terms.privacy_policy")}
            </button>
          </span>
        </Label>
      </div>
      {errors.termo && <p className="text-sm text-red-500">{String(errors.termo.message)}</p>}

      <p className="text-muted-foreground text-xs">{t("form.password.min")}</p>

      <Button type="submit" className="w-full">
        {t("form.submit")}
      </Button>
    </form>
  );
};

export default AffiliateForm;
