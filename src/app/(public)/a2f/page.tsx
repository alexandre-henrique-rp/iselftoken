"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

// Conjunto de imagens em escopo de módulo para estabilidade entre SSR/CSR
const tema = ["/image-01.jpg", "/image-02.jpg", "/image-03.jpg", "/image-04.jpg"]

export default function A2FPage() {
  const router = useRouter()
  const [heroImage, setHeroImage] = useState<string>(tema[0])
  useEffect(() => {
    setHeroImage(tema[Math.floor(Math.random() * tema.length)])
  }, [])

  // Schema de validação para o código A2F
  const a2fSchema = z.object({
    code: z.string().length(6, "O código deve ter 6 dígitos").regex(/^\d{6}$/, "O código deve conter apenas números"),
  })

  type A2FInputs = z.infer<typeof a2fSchema>

  const {
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<A2FInputs>({
    resolver: zodResolver(a2fSchema),
    defaultValues: {
      code: "",
    },
  })

  // Array de referências para os 6 inputs
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 1)
    if (inputsRef.current[index]) {
      inputsRef.current[index]!.value = value
      setValue("code", getCodeValue())
      
      if (value && index < 5) {
        inputsRef.current[index + 1]?.focus()
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !inputsRef.current[index]?.value && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function getCodeValue() {
    return Array.from({ length: 6 })
      .map((_, i) => inputsRef.current[i]?.value ?? "")
      .join("")
  }

  function onSubmit(data: A2FInputs) {
    console.log("Código A2F:", data.code)
    // TODO: Chamar API de validação do token A2F
    router.push("/")
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
                <CardTitle>Verificação em 2 fatores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6 text-sm text-muted-foreground">
                  Informe o código de 6 dígitos enviado para o seu e-mail.
                </div>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="flex justify-center gap-3 mb-6">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="relative">
                        <Input
                          ref={(el) => {
                            if (el) {
                              inputsRef.current[index] = el;
                            }
                          }}
                          id={`code-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          className="w-12 h-12 text-center text-2xl p-0"
                          onChange={(e) => handleChange(index, e)}
                          onKeyDown={(e) => handleKeyDown(index, e)}
                        />
                      </div>
                    ))}
                  </div>
                  {errors.code && (
                    <p className="text-sm text-red-500 text-center mb-4">{errors.code.message}</p>
                  )}
                  <Button type="submit" className="w-full">
                    Verificar
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
    </div>
  )
}
