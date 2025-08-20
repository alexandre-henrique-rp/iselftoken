"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"

// Conjunto de imagens em escopo de módulo para estabilidade entre SSR/CSR
const tema = ["/image-01.jpg", "/image-02.jpg", "/image-03.jpg", "/image-04.jpg"]

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [heroImage, setHeroImage] = useState<string>(tema[0])
  const token = searchParams.get("token") ?? ""
  const { t } = useTranslation('auth')
  useEffect(() => {
    setHeroImage(tema[Math.floor(Math.random() * tema.length)])
  }, [])

  // Schema de validação para a redefinição de senha
  const resetPasswordSchema = z.object({
    password: z.string().min(6, t('reset_password.form.password.min')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('reset_password.form.confirm_password.mismatch'),
    path: ["confirmPassword"],
  })

  type ResetPasswordInputs = z.infer<typeof resetPasswordSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInputs>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  function onSubmit(data: ResetPasswordInputs) {
    // Envia nova senha juntamente com o token recebido pela URL (?token=...)
    console.log("Redefinindo senha:", { password: data.password, token })
    // TODO: Chamar API real de redefinição de senha
    // fetch('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password: data.password }) })
    router.push("/login")
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Imagem à esquerda */}
      <div className="bg-muted relative hidden lg:block">
        <Image
          src={heroImage}
          alt="Image"
          fill
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4]"
        />
      </div>
      {/* Formulário à direita */}
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
                <CardTitle>{t('reset_password.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 text-sm text-muted-foreground">
                  {t('reset_password.subtitle')}
                </div>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="grid gap-2">
                    <Label htmlFor="password">{t('reset_password.form.password.label')}</Label>
                    <Input
                      id="password"
                      type="password"
                      {...register("password")}
                    />
                    {errors.password && (
                      <p className="text-sm text-red-500">{errors.password.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2 mt-4">
                    <Label htmlFor="confirmPassword">{t('reset_password.form.confirm_password.label')}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...register("confirmPassword")}
                    />
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full mt-6" disabled={!token}>
                    {t('reset_password.form.submit')}
                  </Button>
                  {!token && (
                    <p className="mt-2 text-sm text-red-500" aria-live="polite">
                      {t('reset_password.missing_token')}
                    </p>
                  )}
                </form>
                <div className="mt-4 text-center text-sm">
                  <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                    {t('register.login.button')}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
