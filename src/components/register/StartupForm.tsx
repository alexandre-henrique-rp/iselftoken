"use client"

import { FC } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import InputMask from "react-input-mask"
import { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form"

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

type Props = {
  register: UseFormRegister<StartupInputs>
  errors: FieldErrors<StartupInputs>
  setValue: UseFormSetValue<StartupInputs>
  onSubmit: (data: StartupInputs) => void
  handleSubmit: (onValid: (data: StartupInputs) => void) => (e?: React.BaseSyntheticEvent) => Promise<void>
}

const StartupForm: FC<Props> = ({ register, errors, setValue, onSubmit, handleSubmit }) => {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <InputMask id="cnpj" mask="99.999.999/9999-99" {...register("cnpj")} onChange={(e) => setValue("cnpj", e.target.value)}>
          {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => <Input {...inputProps} />}
        </InputMask>
        {errors.cnpj && <p className="text-sm text-red-500">{errors.cnpj.message as string}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="razaoSocial">Razão Social</Label>
        <Input id="razaoSocial" {...register("razaoSocial")} />
        {errors.razaoSocial && <p className="text-sm text-red-500">{errors.razaoSocial.message as string}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="fantasia">Nome Fantasia</Label>
        <Input id="fantasia" {...register("fantasia")} />
        {errors.fantasia && <p className="text-sm text-red-500">{errors.fantasia.message as string}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="telefone">Telefone</Label>
        <InputMask id="telefone" mask="(99) 99999-9999" {...register("telefone")} onChange={(e) => setValue("telefone", e.target.value)}>
          {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => <Input {...inputProps} />}
        </InputMask>
        {errors.telefone && <p className="text-sm text-red-500">{errors.telefone.message as string}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cep">CEP</Label>
        <InputMask id="cep" mask="99999-999" {...register("cep")} onChange={(e) => setValue("cep", e.target.value)}>
          {(inputProps: React.InputHTMLAttributes<HTMLInputElement>) => <Input {...inputProps} />}
        </InputMask>
        {errors.cep && <p className="text-sm text-red-500">{errors.cep.message as string}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" {...register("endereco")} />
        {errors.endereco && <p className="text-sm text-red-500">{errors.endereco.message as string}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input id="bairro" {...register("bairro")} />
          {errors.bairro && <p className="text-sm text-red-500">{errors.bairro.message as string}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" {...register("cidade")} />
          {errors.cidade && <p className="text-sm text-red-500">{errors.cidade.message as string}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="grid gap-2">
          <Label htmlFor="uf">UF</Label>
          <Input id="uf" maxLength={2} {...register("uf")} />
          {errors.uf && <p className="text-sm text-red-500">{errors.uf.message as string}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" inputMode="numeric" {...register("numero")} />
          {errors.numero && <p className="text-sm text-red-500">{errors.numero.message as string}</p>}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" type="password" {...register("senha")} />
        {errors.senha && <p className="text-sm text-red-500">{errors.senha.message as string}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="confirmacaoSenha">Confirmar Senha</Label>
        <Input id="confirmacaoSenha" type="password" {...register("confirmacaoSenha")} />
        {errors.confirmacaoSenha && <p className="text-sm text-red-500">{errors.confirmacaoSenha.message as string}</p>}
      </div>

      <Button type="submit" className="w-full">Cadastrar como Startup</Button>
    </form>
  )
}

export default StartupForm
