"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

// Conjunto de imagens em escopo de módulo para estabilidade entre SSR/CSR
const tema = ["/image-01.jpg", "/image-02.jpg", "/image-03.jpg", "/image-04.jpg"]

export default function RecoverPasswordPage() {
  const router = useRouter()
  const [heroImage, setHeroImage] = useState<string>(tema[0])
  useEffect(() => {
    setHeroImage(tema[Math.floor(Math.random() * tema.length)])
  }, [])

  // Schema de validação para o email
  const recoverPasswordSchema = z.object({
    email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  })

  type RecoverPasswordInputs = z.infer<typeof recoverPasswordSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecoverPasswordInputs>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  function onSubmit(data: RecoverPasswordInputs) {
    console.log("Solicitação de recuperação de senha para:", data.email)
    // TODO: Chamar API de solicitação de recuperação de senha
    // Após solicitar no backend, redirecionar para a home
    router.push("/")
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Formulário à esquerda */}
      <div className="flex flex-col gap-4 p-4 sm:p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <Image src="/logo.png" alt="Logo" width={1000} height={500} className="w-full max-w-lg h-9 object-contain" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-y-auto py-6">
          <div className="w-full max-w-sm">
            <Card>
              <CardHeader>
                <CardTitle>Recuperar senha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 text-sm text-muted-foreground">
                  Informe seu e-mail para receber um link de redefinição de senha.
                </div>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full mt-6">
                    Enviar link de recuperação
                  </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                  <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                    ← Voltar para o login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Imagem à direita */}
      <div className="bg-muted relative hidden lg:block">
        <Image
          src={heroImage}
          alt="Image"
          fill
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4]"
        />
      </div>
    </div>
  )
}
