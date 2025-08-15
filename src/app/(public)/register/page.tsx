"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
// import removido: máscaras agora estão nos componentes de formulário
import InvestorForm, { InvestorInputs as InvestorFormInputs } from "@/components/register/InvestorForm"
import StartupForm, { StartupInputs as StartupFormInputs } from "@/components/register/StartupForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

  // Schema de validação para investidor (normaliza dígitos antes de validar)
  const investorSchema = z.object({
    nome: z.string().min(1, "Nome é obrigatório"),
    cpf: z.string()
      .transform((v) => String(v ?? "").replace(/\D/g, ""))
      .pipe(z.string().length(11, "CPF deve ter 11 dígitos")),
    telefone: z.string()
      .transform((v) => String(v ?? "").replace(/\D/g, ""))
      .pipe(z.string().min(10, "Telefone inválido").max(11, "Telefone inválido")),
    cep: z.string()
      .transform((v) => String(v ?? "").replace(/\D/g, ""))
      .pipe(z.string().length(8, "CEP deve ter 8 dígitos")),
    endereco: z.string().min(1, "Endereço é obrigatório"),
    bairro: z.string().min(1, "Bairro é obrigatório"),
    cidade: z.string().min(1, "Cidade é obrigatória"),
    uf: z.string().length(2, "UF deve ter 2 caracteres"),
    numero: z.string().min(1, "Número é obrigatório"),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmacaoSenha: z.string(),
  }).refine((data) => data.senha === data.confirmacaoSenha, {
    message: "As senhas não coincidem",
    path: ["confirmacaoSenha"],
  })

  const {
    register: registerInvestor,
    handleSubmit: handleSubmitInvestor,
    formState: { errors: errorsInvestor },
    setValue: setValueInvestor
  } = useForm<InvestorFormInputs>({
    resolver: zodResolver(investorSchema),
    defaultValues: {
      nome: "",
      cpf: "",
      telefone: "",
      cep: "",
      endereco: "",
      bairro: "",
      cidade: "",
      uf: "",
      numero: "",
      senha: "",
      confirmacaoSenha: "",
    },
  })

  // Schema de validação para startup (normaliza dígitos antes de validar)
  const startupSchema = z.object({
    cnpj: z.string()
      .transform((v) => String(v ?? "").replace(/\D/g, ""))
      .pipe(z.string().length(14, "CNPJ deve ter 14 dígitos")),
    razaoSocial: z.string().min(1, "Razão Social é obrigatória"),
    fantasia: z.string().min(1, "Nome Fantasia é obrigatório"),
    telefone: z.string()
      .transform((v) => String(v ?? "").replace(/\D/g, ""))
      .pipe(z.string().min(10, "Telefone inválido").max(11, "Telefone inválido")),
    cep: z.string()
      .transform((v) => String(v ?? "").replace(/\D/g, ""))
      .pipe(z.string().length(8, "CEP deve ter 8 dígitos")),
    endereco: z.string().min(1, "Endereço é obrigatório"),
    bairro: z.string().min(1, "Bairro é obrigatório"),
    cidade: z.string().min(1, "Cidade é obrigatória"),
    uf: z.string().length(2, "UF deve ter 2 caracteres"),
    numero: z.string().min(1, "Número é obrigatório"),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmacaoSenha: z.string(),
  }).refine((data) => data.senha === data.confirmacaoSenha, {
    message: "As senhas não coincidem",
    path: ["confirmacaoSenha"],
  })

  const {
    register: registerStartup,
    handleSubmit: handleSubmitStartup,
    formState: { errors: errorsStartup },
    setValue: setValueStartup
  } = useForm<StartupFormInputs>({
    resolver: zodResolver(startupSchema),
    defaultValues: {
      cnpj: "",
      razaoSocial: "",
      fantasia: "",
      telefone: "",
      cep: "",
      endereco: "",
      bairro: "",
      cidade: "",
      uf: "",
      numero: "",
      senha: "",
      confirmacaoSenha: "",
    },
  })

  function onSubmitInvestor(data: InvestorFormInputs) {
    // Limpar caracteres especiais antes do envio
    const cleanedData = {
      ...data,
      cpf: data.cpf.replace(/\D/g, ''),
      telefone: data.telefone.replace(/\D/g, ''),
      cep: data.cep.replace(/\D/g, ''),
    }
    console.log("Registro de investidor:", cleanedData)
    // TODO: Chamar API de registro de investidor
    router.push("/login")
  }

  function onSubmitStartup(data: StartupFormInputs) {
    // Limpar caracteres especiais antes do envio
    const cleanedData = {
      ...data,
      cnpj: data.cnpj.replace(/\D/g, ''),
      telefone: data.telefone.replace(/\D/g, ''),
      cep: data.cep.replace(/\D/g, ''),
    }
    console.log("Registro de startup:", cleanedData)
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
                    <InvestorForm
                      register={registerInvestor}
                      errors={errorsInvestor}
                      setValue={setValueInvestor}
                      onSubmit={onSubmitInvestor}
                      handleSubmit={handleSubmitInvestor}
                    />
                  )}

                  {tipo === "startup" && (
                    <StartupForm
                      register={registerStartup}
                      errors={errorsStartup}
                      setValue={setValueStartup}
                      onSubmit={onSubmitStartup}
                      handleSubmit={handleSubmitStartup}
                    />
                  )}

                  {tipo && (
                <>
                <div className="pt-4 text-center text-sm">
                  <Link href="/login" className="text-primary underline-offset-4 hover:underline">
                    ← Voltar para o login
                  </Link>
                </div>
                </>
              )}
            </CardContent>
          </Card>
            </div>
            
        </div>
        <div className="bg-muted relative hidden lg:block">
        <Image
          src={heroImage}
          alt="Image"
          fill
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.4]" />
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
    </div>
  )
}
