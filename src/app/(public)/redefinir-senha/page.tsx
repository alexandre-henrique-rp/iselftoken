"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!password || password !== confirmPassword) return
    // TODO: Chamar API para redefinir senha
    router.push("/login")
  }

  return (
    <main className="container mx-auto max-w-md px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Redefinir Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="senha">Nova Senha</Label>
              <Input
                id="senha"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmacao">Confirmar Nova Senha</Label>
              <Input
                id="confirmacao"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full">Salvar nova senha</Button>

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
