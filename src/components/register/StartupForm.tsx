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
import { useTranslation } from 'react-i18next'
import '@/i18n'

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
  email: string
  senha: string
  confirmacaoSenha: string
}

// Schema de validação será criado dinamicamente dentro do componente para usar traduções

export const StartupForm: FC = () => {
  const router = useRouter()
  const { t } = useTranslation('auth')

  // Schema de validação criado dinamicamente com traduções
  const startupSchema = z.object({
    cnpj: z.string().transform((v) => String(v).replace(/\D/g, '')).pipe(z.string().length(14, t('register.startup.cnpj.invalid'))),
    razaoSocial: z.string().min(1, t('register.startup.company_name.required')),
    fantasia: z.string().min(1, t('register.startup.trade_name.required')),
    telefone: z.string().min(1, t('register.form.phone.required')),
    cep: z.string().transform((v) => String(v).replace(/\D/g, '')).pipe(z.string().length(8, t('register.form.cep.invalid'))),
    endereco: z.string().min(1, t('register.form.address.required')),
    bairro: z.string().min(1, t('register.form.neighborhood.required')),
    cidade: z.string().min(1, t('register.form.city.required')),
    uf: z.string().min(1, t('register.form.state.required')),
    numero: z.string().min(1, t('register.form.number.required')),
    email: z.string().min(1, t('register.form.email.required')),
    senha: z.string().min(12, t('register.form.password.min')),
    confirmacaoSenha: z.string().min(12, t('register.form.confirm_password.min')),
  }).refine((data) => data.senha === data.confirmacaoSenha, { message: t('register.form.confirm_password.mismatch'), path: ['confirmacaoSenha'] })

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
        setError('cep', { type: 'manual', message: t('register.form.cep.not_found') })
        return
      }
      clearErrors('cep')
      setValue('endereco', data?.logradouro || '')
      setValue('bairro', data?.bairro || '')
      setValue('cidade', data?.localidade || '')
      setValue('uf', (data?.uf || '').slice(0, 2))
      clearErrors(['endereco', 'bairro', 'cidade', 'uf'])
    } catch {
      setError('cep', { type: 'manual', message: t('register.form.cep.search_error') })
    } finally {
      setBuscandoCep(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="cnpj">{t('register.startup.cnpj.label')}</Label>
        <Input id="cnpj" {...register("cnpj")} onChange={(e: ChangeEvent<HTMLInputElement>) => cnpjMaskHandler(e)} maxLength={18} placeholder={t('register.startup.cnpj.placeholder')} />
        {errors.cnpj && <p className="text-sm text-red-500">{errors.cnpj.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="razaoSocial">{t('register.startup.company_name.label')}</Label>
        <Input id="razaoSocial" {...register("razaoSocial")} />
        {errors.razaoSocial && <p className="text-sm text-red-500">{errors.razaoSocial.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fantasia">{t('register.startup.trade_name.label')}</Label>
        <Input id="fantasia" {...register("fantasia")} />
        {errors.fantasia && <p className="text-sm text-red-500">{errors.fantasia.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="telefone">{t('register.form.phone.label')}</Label>
        <Input id="telefone" {...register("telefone")} onChange={(e: ChangeEvent<HTMLInputElement>) => phoneMaskHandler(e)} maxLength={15} placeholder={t('register.form.phone.placeholder')} />
        {errors.telefone && <p className="text-sm text-red-500">{errors.telefone.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cep">{t('register.form.cep.label')}</Label>
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
          placeholder={t('register.form.cep.placeholder')}
        />
        {errors.cep && <p className="text-sm text-red-500">{errors.cep.message}</p>}
        {buscandoCep && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>{t('register.form.cep.searching')}</span>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="endereco">{t('register.form.address.label')}</Label>
        <Input id="endereco" {...register("endereco")} />
        {errors.endereco && <p className="text-sm text-red-500">{errors.endereco.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="bairro">{t('register.form.neighborhood.label')}</Label>
          <Input id="bairro" {...register("bairro")} />
          {errors.bairro && <p className="text-sm text-red-500">{errors.bairro.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cidade">{t('register.form.city.label')}</Label>
          <Input id="cidade" {...register("cidade")} />
          {errors.cidade && <p className="text-sm text-red-500">{errors.cidade.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="uf">{t('register.form.state.label')}</Label>
          <Input id="uf" maxLength={2} {...register("uf")} />
          {errors.uf && <p className="text-sm text-red-500">{errors.uf.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="numero">{t('register.form.number.label')}</Label>
          <Input id="numero" inputMode="numeric" {...register("numero")} />
          {errors.numero && <p className="text-sm text-red-500">{errors.numero.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="email">{t('register.form.email.label')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('register.form.email.placeholder')}
            minLength={6}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="senha">{t('register.form.password.label')}</Label>
          <Input id="senha" type="password" placeholder={t('register.form.password.placeholder')} minLength={12} {...register("senha")} />
          {errors.senha && <p className="text-sm text-red-500">{errors.senha.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmacaoSenha">{t('register.form.confirm_password.label')}</Label>
          <Input id="confirmacaoSenha" type="password" placeholder={t('register.form.confirm_password.placeholder')} minLength={12} {...register("confirmacaoSenha")} />
          {errors.confirmacaoSenha && <p className="text-sm text-red-500">{errors.confirmacaoSenha.message}</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t('register.form.password.help')}</p>

      <Button type="submit" className="w-full">{t('register.startup.submit_button')}</Button>
    </form>
  )
}
