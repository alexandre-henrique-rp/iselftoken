"use client"

import { FC, ChangeEvent, useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { cnpjMaskHandler, phoneMaskHandler, cepMaskHandler } from "@/lib/mask-utils"
import { useRouter } from 'next/navigation'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type StartupInputs = {
  cnpj: string
  razaoSocial: string
  fantasia: string
  telefone: string
  cep: string
  endereco: string
  bairro: string
  cidade: string
  uf: string
  numero: string
  senha: string
  confirmacaoSenha: string
}

const startupSchema = z.object({
  cnpj: z.string().transform((v) => String(v).replace(/\D/g, '')).pipe(z.string().length(14, 'CNPJ deve ter 14 dígitos')),
  razaoSocial: z.string().min(1, 'Razão social é obrigatória'),
  fantasia: z.string().min(1, 'Nome fantasia é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  cep: z.string().transform((v) => String(v).replace(/\D/g, '')).pipe(z.string().length(8, 'CEP deve ter 8 dígitos')),
  endereco: z.string().min(1, 'Endereço é obrigatório'),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  uf: z.string().min(1, 'UF é obrigatória'),
  numero: z.string().min(1, 'Número é obrigatório'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmacaoSenha: z.string().min(6, 'Confirmação deve ter no mínimo 6 caracteres'),
}).refine((data) => data.senha === data.confirmacaoSenha, { message: 'As senhas não coincidem', path: ['confirmacaoSenha'] })

export const StartupForm: FC = () => {
  const router = useRouter()
  const { register, handleSubmit, formState: { errors }, setValue, setError, clearErrors } = useForm<StartupInputs>({ resolver: zodResolver(startupSchema) })

  const [buscandoCep, setBuscandoCep] = useState(false)
  const [ultimoCepBuscado, setUltimoCepBuscado] = useState<string | null>(null)

  const onSubmit: SubmitHandler<StartupInputs> = (data) => {
    console.log('Registro de startup:', data)
    // TODO: Chamar API de registro de startup
    router.push('/login')
  }

  // Busca ViaCEP sob demanda (onBlur ou ao completar 8 dígitos numéricos)
  const buscarCep = async (raw: string) => {
    if (raw.length !== 8) return
    if (ultimoCepBuscado === raw || buscandoCep) return
    setUltimoCepBuscado(raw)
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const data = await res.json()
      if (data?.erro) {
        setError('cep', { type: 'manual', message: 'CEP não encontrado' })
        return
      }
      clearErrors('cep')
      setValue('endereco', data?.logradouro || '')
      setValue('bairro', data?.bairro || '')
      setValue('cidade', data?.localidade || '')
      setValue('uf', (data?.uf || '').slice(0, 2))
      clearErrors(['endereco', 'bairro', 'cidade', 'uf'])
    } catch {
      setError('cep', { type: 'manual', message: 'Falha ao buscar CEP' })
    } finally {
      setBuscandoCep(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input id="cnpj" {...register("cnpj")} onChange={(e: ChangeEvent<HTMLInputElement>) => cnpjMaskHandler(e)} maxLength={18} placeholder="00.000.000/0000-00" />
        {errors.cnpj && <p className="text-sm text-red-500">{errors.cnpj.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="razaoSocial">Razão Social</Label>
        <Input id="razaoSocial" {...register("razaoSocial")} />
        {errors.razaoSocial && <p className="text-sm text-red-500">{errors.razaoSocial.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fantasia">Nome Fantasia</Label>
        <Input id="fantasia" {...register("fantasia")} />
        {errors.fantasia && <p className="text-sm text-red-500">{errors.fantasia.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="telefone">Telefone</Label>
        <Input id="telefone" {...register("telefone")} onChange={(e: ChangeEvent<HTMLInputElement>) => phoneMaskHandler(e)} maxLength={15} placeholder="(00) 00000-0000" />
        {errors.telefone && <p className="text-sm text-red-500">{errors.telefone.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cep">CEP</Label>
        <Input
          id="cep"
          {...register("cep")}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            cepMaskHandler(e)
            const raw = e.target.value.replace(/\D/g, '')
            if (raw.length === 8) buscarCep(raw)
          }}
          onBlur={(e) => {
            const raw = e.currentTarget.value.replace(/\D/g, '')
            buscarCep(raw)
          }}
          maxLength={9}
          placeholder="00000-000"
        />
        {errors.cep && <p className="text-sm text-red-500">{errors.cep.message}</p>}
        {buscandoCep && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Buscando CEP...</span>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" {...register("endereco")} />
        {errors.endereco && <p className="text-sm text-red-500">{errors.endereco.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input id="bairro" {...register("bairro")} />
          {errors.bairro && <p className="text-sm text-red-500">{errors.bairro.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" {...register("cidade")} />
          {errors.cidade && <p className="text-sm text-red-500">{errors.cidade.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="uf">UF</Label>
          <Input id="uf" maxLength={2} {...register("uf")} />
          {errors.uf && <p className="text-sm text-red-500">{errors.uf.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" inputMode="numeric" {...register("numero")} />
          {errors.numero && <p className="text-sm text-red-500">{errors.numero.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" minLength={6} {...register("senha")} />
          {errors.senha && <p className="text-sm text-red-500">{errors.senha.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmacaoSenha">Confirmar Senha</Label>
          <Input id="confirmacaoSenha" type="password" minLength={6} {...register("confirmacaoSenha")} />
          {errors.confirmacaoSenha && <p className="text-sm text-red-500">{errors.confirmacaoSenha.message}</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">A senha deve ter no mínimo 6 caracteres.</p>

      <Button type="submit" className="w-full">Cadastrar como Startup</Button>
    </form>
  )
}
