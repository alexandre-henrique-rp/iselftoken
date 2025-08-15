"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Imagens estáveis para evitar mismatch de hidratação
const tema = ["/image-01.jpg", "/image-02.jpg", "/image-03.jpg", "/image-04.jpg"]

type TipoCadastro = "investidor" | "startup"

export default function RegisterPage() {
  const router = useRouter()
  const [openModal, setOpenModal] = useState(true)
  const [tipo, setTipo] = useState<TipoCadastro | null>(null)
  const [heroImage, setHeroImage] = useState<string>(tema[0])

  useEffect(() => {
    // randomiza somente no cliente para não quebrar hidratação
    setHeroImage(tema[Math.floor(Math.random() * tema.length)])
  }, [])

  function escolher(tipoEscolhido: TipoCadastro) {
    setTipo(tipoEscolhido)
    setOpenModal(false)
  }

  function handleSubmitInvestidor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form) as Record<string, string>
    if (!payload.senha || payload.senha !== payload.confirmacaoSenha) return
    // TODO: Chamar API de registro de investidor
    router.push("/login")
  }

  function handleSubmitStartup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = Object.fromEntries(form) as Record<string, string>
    if (!payload.senha || payload.senha !== payload.confirmacaoSenha) return
    // TODO: Chamar API de registro de startup
    router.push("/login")
  }

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* Imagem à direita para variar do login */}
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
                <CardTitle>Crie sua conta</CardTitle>
              </CardHeader>
              <CardContent>
                {!tipo && (
                  <div className="text-sm text-muted-foreground">
                    Escolha o tipo de cadastro no modal para começar.
                  </div>
                )}

                {tipo === "investidor" && (
                  <form onSubmit={handleSubmitInvestidor} className="space-y-6">
                    <div className="grid gap-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input id="nome" name="nome" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input id="cpf" name="cpf" inputMode="numeric" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input id="telefone" name="telefone" inputMode="tel" required />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input id="cep" name="cep" inputMode="numeric" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input id="endereco" name="endereco" required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input id="bairro" name="bairro" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input id="cidade" name="cidade" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="uf">UF</Label>
                        <Input id="uf" name="uf" maxLength={2} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="numero">Número</Label>
                        <Input id="numero" name="numero" inputMode="numeric" required />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="senha">Senha</Label>
                      <Input id="senha" name="senha" type="password" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmacaoSenha">Confirmar Senha</Label>
                      <Input id="confirmacaoSenha" name="confirmacaoSenha" type="password" required />
                    </div>

                    <Button type="submit" className="w-full">Cadastrar como Investidor</Button>
                  </form>
                )}

                {tipo === "startup" && (
                  <form onSubmit={handleSubmitStartup} className="space-y-6">
                    <div className="grid gap-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input id="cnpj" name="cnpj" inputMode="numeric" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="razaoSocial">Razão Social</Label>
                      <Input id="razaoSocial" name="razaoSocial" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fantasia">Nome Fantasia</Label>
                      <Input id="fantasia" name="fantasia" required />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input id="cep" name="cep" inputMode="numeric" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input id="endereco" name="endereco" required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input id="bairro" name="bairro" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input id="cidade" name="cidade" required />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="uf">UF</Label>
                        <Input id="uf" name="uf" maxLength={2} required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="numero">Número</Label>
                        <Input id="numero" name="numero" inputMode="numeric" required />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="senha">Senha</Label>
                      <Input id="senha" name="senha" type="password" required />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmacaoSenha">Confirmar Senha</Label>
                      <Input id="confirmacaoSenha" name="confirmacaoSenha" type="password" required />
                    </div>

                    <Button type="submit" className="w-full">Cadastrar como Startup</Button>
                  </form>
                )}

                {tipo && (
                  <div className="pt-4 text-center text-sm">
                    <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                      ← Voltar para o login
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="bg-muted relative hidden lg:block">
        <Image
          src={heroImage}
          alt="Image"
          fill
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4]"
        />
      </div>

      {/* Modal de escolha */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Como você quer se registrar?</DialogTitle>
            <DialogDescription>
              Escolha uma opção para mostrar o formulário adequado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={() => escolher("investidor")}>Sou Investidor</Button>
            <Button onClick={() => escolher("startup")}>Sou Startup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
