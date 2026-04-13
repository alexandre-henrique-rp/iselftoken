import { zodResolver } from "@hookform/resolvers/zod";
import { Globe, Lock, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { af2CodeGenerator } from "~/constants";
import { encryptPayload } from "~/lib/special-functions/encrypt-payload";
import { InputField } from "./InputField";
import { PasswordField } from "./PasswordField";

const loginSchema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * @name LoginForm
 * @description formulário principal da pagina de login.
 */
export function LoginForm() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: LoginFormData) => {
    const { email, senha } = data;
    const codigo = af2CodeGenerator();

    const dados = {
      email,
      senha,
      codigo,
      urlRedirect: `${window.location.origin}`,
    };

    const api = await fetch(`/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dados),
    });
    const result = await api.json();

    if (!api.ok || result.error) {
      const message = result?.message ?? "Erro ao fazer login";
      const description =
        result?.detalhe?.message ?? "Tente novamente mais tarde";
      toast.error(message, {
        duration: 5000,
        description: description,
      });
      return;
    }

    // Se o backend indicou redirect (ex: sem plano ativo), redirecionar direto
    if (result.redirect) {
      toast.success("Login realizado com sucesso!", {
        description: "Redirecionando...",
        duration: 1500,
      });
      setTimeout(() => {
        navigate(result.redirect);
      }, 1000);
      return;
    }

    toast.success("Login realizado com sucesso!", {
      description: "Redirecionando para verificação em dois fatores...",
      duration: 2000,
    });

    const payload = {
      codigo,
      path: "/home",
      email: result.data?.email ?? email,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };

    const encryptedToken = await encryptPayload(payload, { expiresIn: '5m' });

    setTimeout(() => {
      navigate(`/auth/${encryptedToken}`);
    }, 1000);
  };

  return (
    <section className="relative z-10 flex flex-col justify-between gap-10 p-8 md:p-12">
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

      <div className="mx-auto w-full max-w-md py-12 lg:py-0">
        <div className="mb-10 text-center lg:text-left">
          <h1 className="mb-3 text-3xl font-bold text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground">
            Acesse sua carteira e acompanhe seus investimentos em startups.
          </p>
        </div>

        <Form onSubmit={handleFormSubmit(onSubmit)} className="space-y-6">
          <InputField
            id="email"
            type="email"
            label="E-mail"
            placeholder="seu@email.com"
            icon={Mail}
            registration={register("email")}
            errorMessage={errors.email?.message}
            isInvalid={Boolean(errors.email)}
          />

          <div className="space-y-2">
            <PasswordField
              id="password"
              label="Senha"
              placeholder="••••••••"
              icon={Lock}
              registration={register("senha")}
              errorMessage={errors.senha?.message}
              isInvalid={Boolean(errors.senha)}
            />
            <div className="flex justify-end">
              <a
                href="/recuperar-senha"
                className="text-xs font-medium text-primary transition-colors hover:text-primary/80"
              >
                Esqueceu a senha?
              </a>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full gap-2 bg-primary py-6 text-base font-semibold text-white hover:bg-primary/90"
          >
            Entrar
          </Button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Nao tem conta?
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/cadastro")}
            className="w-full border-border bg-transparent py-6 text-base font-semibold text-foreground hover:bg-muted"
          >
            Crie sua conta
          </Button>
        </Form>

        <p className="mt-8 px-8 text-center text-xs text-muted-foreground lg:px-0">
          Ao clicar em entrar, voce concorda com nossos{" "}
          <a
            href="https://iselftoken.net/termo-de-uso-para-investidores-iselftoken/"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Termos de Uso
          </a>{" "}
          e{" "}
          <a
            href="https://iselftoken.net/privacy-policy/"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Politica de Privacidade
          </a>
          .
        </p>
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
