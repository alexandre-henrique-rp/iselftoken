"use client"

import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  // Definir schema de validação com zod
  const loginSchema = z.object({
    email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
    password: z.string().min(1, "Senha é obrigatória"),
  })
  
  type LoginFormInputs = z.infer<typeof loginSchema>
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  function handleLogin(data: LoginFormInputs) {
    console.log("Login com:", data)
    // TODO: Chamar API de login
  }

  return (
    <form
      onSubmit={handleSubmit(handleLogin)}
      className={cn("flex flex-col gap-6", className)}
      {...props}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Acesse sua conta</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Informe seu e-mail abaixo para acessar sua conta
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            required
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="grid gap-3">
          <div className="flex items-center">
            <Label htmlFor="password">Senha</Label>
            <a
              href="/recuperar-senha"
              className="ml-auto text-sm underline-offset-4 hover:underline"
            >
              Esqueceu sua senha?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            required
            {...register("password")}
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full">
          Entrar
        </Button>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Não tem uma conta?
          </span>
        </div>
        <Link href="/register" className="w-full">
          <Button variant="outline" className="w-full">
            Cadastre-se
          </Button>
        </Link>
      </div>
      <div className="text-center text-sm">
        Leia os{" "}
        <Link href="/termos-de-uso" className="underline underline-offset-4">
          Termos de Uso
        </Link>
      </div>
    </form>
  );
}
