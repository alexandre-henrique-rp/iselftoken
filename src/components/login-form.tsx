import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const schema = z.object({
    email: z.string().email("Informe um e-mail válido"),
    password: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
  })

  type FormData = z.infer<typeof schema>

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  })

  function enviarFormulario(data: FormData) {
    // TODO: integrar com sua API de login
    console.log("[LOGIN] payload", data)
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleSubmit(enviarFormulario)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Acesse sua conta</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Informe seu e-mail abaixo para acessar sua conta
        </p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-3">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} />
          {errors.email && (
            <span className="text-xs text-red-500">{errors.email.message}</span>
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
          <Input id="password" type="password" {...register("password")} />
          {errors.password && (
            <span className="text-xs text-red-500">{errors.password.message}</span>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          Entrar
        </Button>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-background text-muted-foreground relative z-10 px-2">
            Não tem uma conta?
          </span>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/register">Cadastre-se</Link>
        </Button>
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
