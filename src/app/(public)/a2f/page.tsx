"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function A2FPage() {
  const router = useRouter()
  // Array de referências para os 6 inputs, usando um único hook conforme regras do React
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.replace(/\D/g, "").slice(0, 1)
    e.target.value = value
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !((e.target as HTMLInputElement).value) && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const code = Array.from({ length: 6 })
      .map((_, i) => inputsRef.current[i]?.value ?? "")
      .join("")
    if (code.length !== 6) return
    // TODO: Chamar API de validação do token A2F
    router.push("/")
  }

  return (
    <main className="container mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Confirmação em Duas Etapas (A2F)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                Insira o código de 6 dígitos enviado ao seu e-mail ou app autenticador.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Código A2F</Label>
              <div className="flex items-center justify-between gap-2">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <Input
                    key={idx}
                    ref={(el) => {
                      inputsRef.current[idx] = el
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    className="h-12 w-12 text-center text-lg"
                    onChange={(e) => handleChange(idx, e)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    aria-label={`Dígito ${idx + 1} do código`}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full">Validar código</Button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                ← Voltar para o login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
