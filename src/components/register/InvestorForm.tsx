'use client';

import { FC, ChangeEvent, useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cpfMaskHandler, phoneMaskHandler } from '@/lib/mask-utils';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import '@/i18n';
import { toast } from 'sonner';


export type InvestorInputs = {
  nome: string;
  cpf: string;
  telefone: string;
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  pais: string;
  numero: string;
  email: string;
  senha: string;
  confirmacaoSenha: string;
  termo: boolean;
};

// Schema de validação será criado dinamicamente dentro do componente para usar traduções

// Props para pré-preencher cidade/UF (e país, se necessário futuramente)
export type InvestorFormProps = {
  /** Cidade inicial selecionada no modal de localização */
  cidadeInicial?: string;
  /** UF/estado inicial selecionado no modal de localização */
  ufInicial?: string;
  /** País inicial selecionado no modal de localização (não mapeado em campo visível) */
  paisInicial?: string;
  /** DDI inicial selecionado no modal de localização (não mapeado em campo visível) */
  ddi?: string;
};

export const InvestorForm: FC<InvestorFormProps> = ({
  cidadeInicial,
  ufInicial,
  paisInicial,
  ddi,
}) => {
  const router = useRouter();
  const { t } = useTranslation('auth');

  // Schema de validação criado dinamicamente com traduções
  const investorSchema = z
    .object({
      nome: z.string().min(1, t('register.form.name.required')),
      cpf: z
        .string()
        .transform((v) => String(v).replace(/\D/g, ''))
        .pipe(z.string().length(11, t('register.form.cpf.invalid'))),
      telefone: z.string().min(1, t('register.form.phone.required')),
      cep: z
        .string()
        .transform((v) => String(v).replace(/\D/g, ''))
        .pipe(z.string().length(8, t('register.form.cep.invalid'))),
      endereco: z.string().min(1, t('register.form.address.required')),
      bairro: z.string().min(1, t('register.form.neighborhood.required')),
      cidade: z.string().min(1, t('register.form.city.required')),
      uf: z.string().min(1, t('register.form.state.required')),
      pais: z.string().min(1, 'País é obrigatório'),
      numero: z.string().min(1, t('register.form.number.required')),
      email: z.string().min(1, t('register.form.email.required')),
      senha: z.string().min(12, t('register.form.password.min')),
      confirmacaoSenha: z
        .string()
        .min(12, t('register.form.confirm_password.min')),
      termo: z
        .boolean()
        .refine((v) => v === true, {
          message: t('register.form.terms.required'),
        }),
    })
    .refine((data) => data.senha === data.confirmacaoSenha, {
      message: t('register.form.confirm_password.mismatch'),
      path: ['confirmacaoSenha'],
    });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    setError,
    clearErrors,
  } = useForm<InvestorInputs>({
    resolver: zodResolver(investorSchema),
    defaultValues: {
      cidade: cidadeInicial || '',
      uf: ufInicial || '',
      pais: paisInicial || '',
      termo: false,
    },
  });

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [ultimoCepBuscado, setUltimoCepBuscado] = useState<string | null>(null);

  // Sincroniza quando as props mudarem (ex.: usuário volta ao modal e altera a localização)
  useEffect(() => {
    if (cidadeInicial)
      setValue('cidade', cidadeInicial, { shouldValidate: true });
    if (ufInicial) setValue('uf', ufInicial, { shouldValidate: true });
    if (paisInicial) setValue('pais', paisInicial, { shouldValidate: true });
  }, [cidadeInicial, ufInicial, paisInicial, setValue]);

  const onSubmit: SubmitHandler<InvestorInputs> = async (data) => {
    try {
      const response = await fetch(`/api/register/investidor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...data,
          telefone: `${ddi}${data.telefone}`,
          redirectPath: '/login'
        }),
      });
      
      let result;
      try {
        result = await response.json();
      } catch {
        toast('Erro ao registrar investidor', {
          duration: 5000,
          description: 'Erro na comunicação com o servidor'
        });
        return;
      }
      
      console.log(result);
      if (!response.ok) {
        toast('Erro ao registrar investidor',{
          description: result.message || 'Erro ao registrar investidor',
          duration: 5000,
        });
        return;
      }
      toast('Investidor registrado com sucesso', {
        duration: 5000,
      })
      router.push(result.url);
    } catch (error) {
      console.log(error);
      toast('Erro ao registrar investidor', {
        duration: 5000,
        description: 'Erro de conexão'
      })
    }
  };

  // Busca ViaCEP sob demanda (onBlur ou ao completar 8 dígitos numéricos)
  const buscarCep = async (raw: string) => {
    if (raw.length !== 8) return;
    // Permite nova busca se a anterior falhou (errors.cep existe)
    if ((ultimoCepBuscado === raw && !errors.cep) || buscandoCep) return;
    if ((ultimoCepBuscado === raw && !errors.cep) || buscandoCep) return;
    setUltimoCepBuscado(raw);
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data?.erro) {
        setError('cep', {
          type: 'manual',
          message: t('register.form.cep.not_found'),
        });
        return;
      }
      clearErrors('cep');
      setValue('endereco', data?.logradouro || '');
      setValue('bairro', data?.bairro || '');
      clearErrors(['endereco', 'bairro']);
    } catch {
      setError('cep', {
        type: 'manual',
        message: t('register.form.cep.search_error'),
      });
    } finally {
      setBuscandoCep(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Campo oculto para enviar o país no submit */}
      <input type="hidden" {...register('pais')} />
      <div className="grid gap-2">
        <Label htmlFor="nome">{t('register.form.name.label')}</Label>
        <Input id="nome" {...register('nome')} />
        {errors.nome && (
          <p className="text-sm text-red-500">{errors.nome.message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="cpf">{t('register.form.cpf.label')}</Label>
          <Input
            id="cpf"
            {...register('cpf')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => cpfMaskHandler(e)}
            maxLength={14}
            placeholder={t('register.form.cpf.placeholder')}
          />
          {errors.cpf && (
            <p className="text-sm text-red-500">{errors.cpf.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="telefone">{t('register.form.phone.label')}</Label>
          <Input
            id="telefone"
            {...register('telefone')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => phoneMaskHandler(e)}
            maxLength={15}
            placeholder={t('register.form.phone.placeholder')}
          />
          {errors.telefone && (
            <p className="text-sm text-red-500">{errors.telefone.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="cep">{t('register.form.cep.label')}</Label>
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
            placeholder={t('register.form.cep.placeholder')}
          />
          {errors.cep && (
            <p className="text-sm text-red-500">{errors.cep.message}</p>
          )}
          {buscandoCep && (
            <div
              className="text-muted-foreground flex items-center gap-2 text-xs"
              aria-live="polite"
            >
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span>{t('register.form.cep.searching')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="endereco">{t('register.form.address.label')}</Label>
        <Input id="endereco" {...register('endereco')} />
        {errors.endereco && (
          <p className="text-sm text-red-500">{errors.endereco.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="bairro">
            {t('register.form.neighborhood.label')}
          </Label>
          <Input id="bairro" {...register('bairro')} />
          {errors.bairro && (
            <p className="text-sm text-red-500">{errors.bairro.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cidade">{t('register.form.city.label')}</Label>
          <Input id="cidade" readOnly aria-readonly {...register('cidade')} />
          {errors.cidade && (
            <p className="text-sm text-red-500">{errors.cidade.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="uf">{t('register.form.state.label')}</Label>
          <Input
            id="uf"
            maxLength={2}
            readOnly
            aria-readonly
            {...register('uf')}
          />
          {errors.uf && (
            <p className="text-sm text-red-500">{errors.uf.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="numero">{t('register.form.number.label')}</Label>
          <Input id="numero" {...register('numero')} />
          {errors.numero && (
            <p className="text-sm text-red-500">{errors.numero.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1">
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
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="senha">{t('register.form.password.label')}</Label>
          <Input
            id="senha"
            type="password"
            placeholder={t('register.form.password.placeholder')}
            minLength={12}
            {...register('senha')}
          />
          {errors.senha && (
            <p className="text-sm text-red-500">{errors.senha.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="confirmacaoSenha">
            {t('register.form.confirm_password.label')}
          </Label>
          <Input
            id="confirmacaoSenha"
            type="password"
            placeholder={t('register.form.confirm_password.placeholder')}
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
      <div className="flex items-center gap-2">
        <input
          id="termo"
          type="checkbox"
          {...register('termo')}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <Label htmlFor="termo" className="text-sm">
          {t('register.form.terms.accept')}{' '}
          <button
            type="button"
            className="text-[#d500f9] underline hover:no-underline"
            onClick={() => router.push('/politicas')}
          >
            {t('register.form.terms.terms_of_use')}
          </button>{' '}
          {t('register.form.terms.and')}{' '}
          <button
            type="button"
            className="text-[#d500f9] underline hover:no-underline"
            // abrir em nova aba
            onClick={() => window.open('https://iselftoken.net/termo-de-uso-para-investidores-iselftoken/', '_blank')}
          >
            {t('register.form.terms.privacy_policy')}
          </button>
        </Label>
      </div>
      {errors.termo && (
        <p className="text-sm text-red-500">{String(errors.termo.message)}</p>
      )}
      <p className="text-muted-foreground text-xs">
        {t('register.form.password.min')}
      </p>

      <Button type="submit" className="w-full">
        {t('register.form.submit')}
      </Button>
    </form>
  );
};

export default InvestorForm;
