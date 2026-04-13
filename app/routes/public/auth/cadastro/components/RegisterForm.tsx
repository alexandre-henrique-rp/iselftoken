import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CheckCircle,
  Eye,
  EyeOff,
  Globe,
  Lock,
  Mail,
  Phone,
  User,
  X,
} from "lucide-react";
import {
  type ComponentType,
  type JSX,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type UseFormRegisterReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { af2CodeGenerator } from "~/constants";

const passwordSchema = z
  .string()
  .min(12, "Senha deve ter no minimo 12 caracteres")
  .regex(/[A-Z]/, "Senha precisa ter ao menos 1 letra maiúscula")
  .regex(/[a-z]/, "Senha precisa ter ao menos 1 letra minuscula")
  .regex(/[0-9]/, "Senha precisa ter ao menos 1 numero")
  .regex(/[^A-Za-z0-9]/, "Senha precisa ter ao menos 1 caractere especial");

const registerSchema = z
  .object({
    name: z.string().min(1, "Nome completo e obrigatório"),
    email: z
      .string()
      .min(1, "E-mail e obrigatório")
      .email("E-mail invalido")
      .transform((value) => value.toLowerCase()),
    phone: z
      .string()
      .min(1, "Telefone e obrigatório")
      .regex(/\(\d{2}\)\s\d{4,5}-\d{4}/, "Telefone invalido"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirme a senha"),
    terms: z.boolean().refine((value) => value, {
      message: "Aceite os termos para continuar",
    }),
    privacy: z.boolean().refine((value) => value, {
      message: "Aceite a politica de privacidade",
    }),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As senhas nao coincidem",
      });
    }
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

type InputFieldProps = {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  icon?: ComponentType<{ className?: string }>;
  registration?: UseFormRegisterReturn;
  errorMessage?: string;
  isInvalid?: boolean;
  isDisabled?: boolean;
};

type CheckboxFieldProps = {
  id: string;
  label: ReactNode;
  registration?: UseFormRegisterReturn;
  errorMessage?: string;
};

/**
 * @name formatPhone
 * @description Aplica mascara simples de telefone brasileiro.
 *
 * @param {string} value - Telefone digitado.
 * @returns {string} Telefone formatado.
 */
function formatPhone(value: string) {
  let formatted = value.replace(/\D/g, "");
  formatted = formatted.replace(/^(\d{2})(\d)/g, "($1) $2");
  if (formatted.replace(/\D/g, "").length <= 10) {
    formatted = formatted.replace(/(\d{4})(\d{4})$/, "$1-$2");
  } else {
    formatted = formatted.replace(/(\d{5})(\d{4})$/, "$1-$2");
  }
  return formatted.slice(0, 15);
}

/**
 * @name InputField
 * @description Campo de entrada estilizado para cadastro.
 *
 * @param {InputFieldProps} props - Propriedades do campo.
 * @returns {JSX.Element} Input com label e ícone.
 */
function InputField({
  id,
  label,
  type = "text",
  placeholder,
  icon: Icon,
  registration,
  errorMessage,
  isInvalid,
  isDisabled,
}: InputFieldProps): JSX.Element {
  const inputStyles = isInvalid
    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
    : "border-border focus:border-primary focus:ring-primary/40";

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative group">
        {Icon ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          disabled={isDisabled}
          className={`w-full rounded-lg border bg-card py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
            Icon ? "pl-10" : "pl-4"
          } pr-4 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${inputStyles}`}
          {...registration}
        />
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-500">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/**
 * @name PasswordField
 * @description Campo de senha com toggle de visibilidade.
 *
 * @param {Omit<InputFieldProps, "type">} props - Props do campo.
 * @returns {JSX.Element} Campo de senha.
 */
function PasswordField({
  id,
  label,
  placeholder,
  icon: Icon,
  registration,
  errorMessage,
  isInvalid,
  isDisabled,
}: Omit<InputFieldProps, "type">): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);
  const inputStyles = isInvalid
    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
    : "border-border focus:border-primary focus:ring-primary/40";

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <div className="relative group">
        {Icon ? (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          placeholder={placeholder}
          aria-invalid={isInvalid}
          disabled={isDisabled}
          className={`w-full rounded-lg border bg-card py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 ${
            Icon ? "pl-10" : "pl-4"
          } pr-10 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${inputStyles}`}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          disabled={isDisabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
        >
          {isVisible ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-500">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/**
 * @name CheckboxField
 * @description Checkbox customizado com estilo do tema.
 *
 * @param {CheckboxFieldProps} props - Props do checkbox.
 * @returns {JSX.Element} Checkbox com label.
 */
function CheckboxField({
  id,
  label,
  registration,
  errorMessage,
}: CheckboxFieldProps): JSX.Element {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <div className="relative flex items-center">
          <input
            id={id}
            type="checkbox"
            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-border bg-card checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            {...registration}
          />
          <CheckCircle className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-primary-foreground opacity-0 peer-checked:opacity-100" />
        </div>
        <span className="text-sm text-muted-foreground leading-relaxed">
          {label}
        </span>
      </label>
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-500">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/**
 * @name PasswordRequirement
 * @description Indicador visual de requisito de senha.
 *
 * @param {{ met: boolean; text: string }} props - Status do requisito.
 * @returns {JSX.Element} Linha do requisito.
 */
function PasswordRequirement({
  met,
  text,
}: {
  met: boolean;
  text: string;
}): JSX.Element {
  return (
    <div
      className={`flex items-center gap-2 text-xs transition-colors duration-300 ${
        met ? "text-green-400" : "text-muted-foreground"
      }`}
    >
      {met ? (
        <CheckCircle className="h-3.5 w-3.5" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <span>{text}</span>
    </div>
  );
}

/**
 * @name RegisterForm
 * @description formulário principal de cadastro.
 *
 * @returns {JSX.Element} formulário de cadastro.
 */
export function RegisterForm(): JSX.Element {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      terms: false,
      privacy: false,
    },
  });

  const passwordValue = watch("password");
  const [codigo, setCodigo] = useState("");

  const passwordChecks = useMemo(
    () => ({
      length: passwordValue?.length >= 12,
      uppercase: /[A-Z]/.test(passwordValue ?? ""),
      lowercase: /[a-z]/.test(passwordValue ?? ""),
      number: /[0-9]/.test(passwordValue ?? ""),
      special: /[^A-Za-z0-9]/.test(passwordValue ?? ""),
    }),
    [passwordValue],
  );

  useEffect(() => {
    setCodigo(af2CodeGenerator());
  }, []);

  return (
    <section className="relative z-10 flex flex-col justify-between gap-10 overflow-y-auto p-8 md:p-12">
      <div className="flex items-center justify-between lg:justify-start">
        <a href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card p-0.5">
            <img
              src="/icon600x600.png"
              alt="Logo iSelfToken"
              className="h-full w-full rounded-lg object-cover"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#d500f9]">
            iSelfToken
          </span>
        </a>
        <button
          type="button"
          className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          aria-label="Alterar idioma"
        >
          <Globe className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto w-full max-w-xl">
        <div className="mb-8 text-center lg:text-left">
          <h1 className="mb-3 text-3xl font-bold text-foreground">
            Criar conta
          </h1>
          <p className="text-muted-foreground">
            Junte-se a milhares de investidores e fundadores.
          </p>
        </div>

        <form
          method="post"
          className="space-y-5"
          onSubmit={handleSubmit(async (data) => {
            const payload = {
              email: data.email,
              nome: data.name,
              senha: data.password,
              senhaConfirmacao: data.confirmPassword,
              telefone: data.phone.replace(/\D/g, ""),
              termosAceitos: data.terms,
              politicaAceita: data.privacy,
              codigo,
              urlRedirect: `${window.location.origin}`,
            };

            const response = await fetch("/api/auth/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || result.error) {
              const message = result?.message ?? "Erro ao realizar cadastro";
              const description = result?.detalhe?.message ?? "";
              toast.error(
                message,
                description && {
                  description: description,
                },
              );
              return;
            }

            toast.success("Cadastro realizado com sucesso!");

            setTimeout(() => {
              window.location.href = result.redirectTo;
            }, 2000);
          })}
        >
          <InputField
            id="name"
            label="Nome completo"
            placeholder="Seu nome"
            icon={User}
            registration={register("name")}
            errorMessage={errors.name?.message}
            isInvalid={Boolean(errors.name)}
            isDisabled={isSubmitting}
          />

          <InputField
            id="email"
            type="email"
            label="E-mail"
            placeholder="exemplo@iselftoken.com"
            icon={Mail}
            registration={register("email", {
              onBlur: (event) => {
                setValue("email", event.target.value.toLowerCase());
              },
            })}
            errorMessage={errors.email?.message}
            isInvalid={Boolean(errors.email)}
            isDisabled={isSubmitting}
          />

          <InputField
            id="phone"
            type="tel"
            label="Telefone"
            placeholder="(11) 99999-9999"
            icon={Phone}
            registration={register("phone", {
              onChange: (event) => {
                setValue("phone", formatPhone(event.target.value));
              },
            })}
            errorMessage={errors.phone?.message}
            isInvalid={Boolean(errors.phone)}
            isDisabled={isSubmitting}
          />

          <div className="space-y-3">
            <PasswordField
              id="password"
              label="Senha"
              placeholder="Crie uma senha forte"
              icon={Lock}
              registration={register("password")}
              errorMessage={errors.password?.message}
              isInvalid={Boolean(errors.password)}
              isDisabled={isSubmitting}
            />

            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="mb-3 text-xs font-semibold text-muted-foreground">
                Requisitos da senha:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PasswordRequirement
                  met={passwordChecks.length}
                  text="12+ caracteres"
                />
                <PasswordRequirement
                  met={passwordChecks.uppercase}
                  text="Maiúscula (A-Z)"
                />
                <PasswordRequirement
                  met={passwordChecks.lowercase}
                  text="Minuscula (a-z)"
                />
                <PasswordRequirement
                  met={passwordChecks.number}
                  text="Número (0-9)"
                />
                <PasswordRequirement
                  met={passwordChecks.special}
                  text="Especial (!@#)"
                />
              </div>
            </div>
          </div>

          <PasswordField
            id="confirmPassword"
            label="Confirmar senha"
            placeholder="Repita sua senha"
            icon={Lock}
            registration={register("confirmPassword")}
            errorMessage={errors.confirmPassword?.message}
            isInvalid={Boolean(errors.confirmPassword)}
            isDisabled={isSubmitting}
          />

          <div className="space-y-4 pt-1">
            <CheckboxField
              id="terms"
              registration={register("terms")}
              errorMessage={errors.terms?.message}
              label={
                <>
                  Li e aceito os{" "}
                  <a
                    href="https://iselftoken.net/termo-de-uso-para-investidores-iselftoken/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary transition-colors hover:text-primary/80"
                  >
                    Termos de Uso
                  </a>
                  .
                </>
              }
            />
            <CheckboxField
              id="privacy"
              registration={register("privacy")}
              errorMessage={errors.privacy?.message}
              label={
                <>
                  Concordo com a{" "}
                  <a
                    href="https://iselftoken.net/privacy-policy/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary transition-colors hover:text-primary/80"
                  >
                    Politica de Privacidade
                  </a>
                  .
                </>
              }
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full gap-2 bg-primary py-6 text-base font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Criar conta
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="pt-4 text-center text-sm text-muted-foreground">
            Ja tem uma conta?{" "}
            <a
              href="/login"
              className="font-semibold text-primary transition-colors hover:text-primary/80"
            >
              Entrar
            </a>
          </p>
        </form>
      </div>

      <div className="hidden items-center gap-6 text-sm text-muted-foreground lg:flex">
        <span>© 2026 iSelfToken</span>
        <a
          href="https://iselftoken.net/faq/"
          className="transition-colors hover:text-foreground"
        >
          Ajuda
        </a>
        <a
          href="https://iselftoken.net/privacy-policy/"
          className="transition-colors hover:text-foreground"
        >
          Privacidade
        </a>
      </div>
    </section>
  );
}
