"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function RecoverPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email) return
    // TODO: Chamar API para solicitar recuperação de senha
    router.push("/login")
  }

  return (
    <main className="container mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Recuperar Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full">Solicitar recuperação</Button>

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
