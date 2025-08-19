'use client';

import { FC, ChangeEvent, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  cpfMaskHandler,
  phoneMaskHandler,
} from '@/lib/mask-utils';
import { useRouter } from 'next/navigation';

export type AffiliateInputs = {
  nome: string;
  cpf: string;
  telefone: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  numero: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
};

const affiliateSchema = z
  .object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    cpf: z
      .string()
      .transform((v) => String(v).replace(/\D/g, ''))
      .pipe(z.string().length(11, 'CPF deve ter 11 dígitos')),
    telefone: z.string().min(1, 'Telefone é obrigatório'),
    cep: z
      .string()
      .transform((v) => String(v).replace(/\D/g, ''))
      .pipe(z.string().length(8, 'CEP deve ter 8 dígitos')),
    endereco: z.string().min(1, 'Endereço é obrigatório'),
    bairro: z.string().min(1, 'Bairro é obrigatório'),
    cidade: z.string().min(1, 'Cidade é obrigatória'),
    uf: z.string().min(1, 'UF é obrigatória'),
    numero: z.string().min(1, 'Número é obrigatório'),
    email: z.string().min(1, 'Email e obrigatório'),
    senha: z.string().min(12, 'Senha deve ter no mínimo 12 caracteres'),
    confirmacaoSenha: z
      .string()
      .min(12, 'Confirmação deve ter no mínimo 12 caracteres'),
  })
  .refine((data) => data.senha === data.confirmacaoSenha, {
    message: 'As senhas não coincidem',
    path: ['confirmacaoSenha'],
  });

export const AffiliateForm: FC = () => {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    clearErrors,
  } = useForm<AffiliateInputs>({ resolver: zodResolver(affiliateSchema) });

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [ultimoCepBuscado, setUltimoCepBuscado] = useState<string | null>(null);

  const onSubmit: SubmitHandler<AffiliateInputs> = (data) => {
    console.log('Registro de afiliado:', data);
    // TODO: Chamar API de registro de afiliado
    router.push('/login');
  };

// Busca ViaCEP sob demanda (onBlur ou ao completar 8 dígitos numéricos)
  const buscarCep = async (raw: string) => {
    if (raw.length !== 8) return;
    if (ultimoCepBuscado === raw || buscandoCep) return;
    setUltimoCepBuscado(raw);
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data?.erro) {
        setError('cep', { type: 'manual', message: 'CEP não encontrado' });
        return;
      }
      clearErrors('cep');
      setValue('endereco', data?.logradouro || '');
      setValue('bairro', data?.bairro || '');
      setValue('cidade', data?.localidade || '');
      setValue('uf', (data?.uf || '').slice(0, 2));
      clearErrors(['endereco', 'bairro', 'cidade', 'uf']);
    } catch {
      setError('cep', { type: 'manual', message: 'Falha ao buscar CEP' });
    } finally {
      setBuscandoCep(false);
    }
  };

return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" {...register('nome')} />
        {errors.nome && (
          <p className="text-sm text-red-500">{errors.nome.message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            {...register('cpf')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => cpfMaskHandler(e)}
            maxLength={14}
            placeholder="000.000.000-00"
          />
          {errors.cpf && (
            <p className="text-sm text-red-500">{errors.cpf.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            {...register('telefone')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => phoneMaskHandler(e)}
            maxLength={15}
            placeholder="(00) 00000-0000"
          />
          {errors.telefone && (
            <p className="text-sm text-red-500">{errors.telefone.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            {...register('cep')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              const maskedValue = e.target.value;
              setValue('cep', maskedValue, { shouldValidate: true });
              const rawValue = maskedValue.replace(/\D/g, '');
              if (rawValue.length === 8) {
                buscarCep(rawValue);
              }
            }}
            onBlur={(e) => {
              const raw = e.currentTarget.value.replace(/\D/g, '');
              buscarCep(raw);
            }}
            maxLength={9}
            placeholder="00000-000"
          />
          {errors.cep && (
            <p className="text-sm text-red-500">{errors.cep.message}</p>
          )}
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
      </div>

      <div className="grid gap-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" {...register('endereco')} />
        {errors.endereco && (
          <p className="text-sm text-red-500">{errors.endereco.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="bairro">Bairro</Label>
          <Input id="bairro" {...register('bairro')} />
          {errors.bairro && (
            <p className="text-sm text-red-500">{errors.bairro.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input id="cidade" {...register('cidade')} />
          {errors.cidade && (
            <p className="text-sm text-red-500">{errors.cidade.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="uf">UF</Label>
          <Input id="uf" maxLength={2} {...register('uf')} />
          {errors.uf && (
            <p className="text-sm text-red-500">{errors.uf.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" {...register('numero')} />
          {errors.numero && (
            <p className="text-sm text-red-500">{errors.numero.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="senha">Email</Label>
          <Input
            id="email"
            type="email"
            minLength={6}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            minLength={12}
            {...register('senha')}
          />
          {errors.senha && (
            <p className="text-sm text-red-500">{errors.senha.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmacaoSenha">Confirmação de Senha</Label>
          <Input
            id="confirmacaoSenha"
            type="password"
            minLength={12}
            {...register('confirmacaoSenha')}
          />
          {errors.confirmacaoSenha && (
            <p className="text-sm text-red-500">
              {errors.confirmacaoSenha.message}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">A senha deve ter no mínimo 12 caracteres.</p>

      <Button type="submit" className="w-full">
        Cadastrar como Afiliado
      </Button>
    </form>
  );
};

export default AffiliateForm;
