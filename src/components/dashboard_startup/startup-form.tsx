'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Startup } from '@/types/startup'
import { unmaskValue } from '@/lib/mask-utils'
import { InformacoesBasicasSection } from './form-sections/informacoes-basicas-section'
import { ClassificacaoSection } from './form-sections/classificacao-section'
import { InvestimentoSection } from './form-sections/investimento-section'

interface StartupWithFormData extends Startup {
  descricao_objetivo?: string
}

const startupSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().min(18, 'CNPJ inválido'),
  pais: z.string().min(1, 'País é obrigatório'),
  data_fundacao: z.string().min(1, 'Data de fundação é obrigatória'),
  area_atuacao: z.string().min(1, 'Área de atuação é obrigatória'),
  estagio: z.string().min(1, 'Estágio é obrigatório'),
  descritivo_basico:
    z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  meta_captacao: z.number().refine((val) => val === 0 || (val >= 100000.00 && val <= 15000000.00), {
    message: 'Meta de captação deve ser 0 ou entre R$ 100.000,00 e R$ 15.000.000,00'
  }),
  equity_oferecido:
    z.number().min(0.1).max(100, 'Equity deve estar entre 0.1% e 100%'),
  descricao_objetivo:
    z.string().min(20, 'Objetivo deve ter pelo menos 20 caracteres'),
})

type StartupFormData = z.infer<typeof startupSchema>

interface StartupFormProps {
  mode: 'create' | 'edit'
  initialData?: StartupWithFormData
}

export function StartupForm({ mode, initialData }: StartupFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<StartupFormData>({
    resolver: zodResolver(startupSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      cnpj: initialData?.cnpj || '',
      pais:
        typeof initialData?.pais === 'string'
          ? initialData.pais
          : initialData?.pais?.iso3 || 'BRA',
      data_fundacao: initialData?.data_fundacao
        ? new Date(initialData.data_fundacao).toISOString().split('T')[0]
        : '',
      area_atuacao: initialData?.area_atuacao || '',
      estagio: initialData?.estagio || '',
      descritivo_basico: initialData?.descritivo_basico || '',
      meta_captacao: initialData?.meta_captacao || 100000.0,
      equity_oferecido: initialData?.equity_oferecido || 0,
      descricao_objetivo: initialData?.descricao_objetivo || '',
    },
  })

  const onSubmit = async (data: StartupFormData) => {
    setIsLoading(true)

    try {
      const submitData = {
        ...data,
        cnpj: unmaskValue(data.cnpj),
        data_fundacao: new Date(data.data_fundacao),
      }

      const url =
        mode === 'edit' ? `/api/startup/${initialData?.id}` : '/api/startup'

      const method = mode === 'edit' ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      })

      if (!response.ok) {
        throw new Error('Erro ao salvar startup')
      }

      toast.success(
        mode === 'edit'
          ? 'Startup atualizada com sucesso!'
          : 'Startup criada com sucesso!'
      )

      router.push('/dashboard_startups')
      router.refresh()
    } catch (error) {
      console.error('Erro ao salvar startup:', error)
      toast.error('Erro ao salvar startup. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  return (
    <div className="space-y-8">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="hover:bg-accent hover:text-accent-foreground gap-2 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <InformacoesBasicasSection control={form.control} />

          <ClassificacaoSection control={form.control} />

          <InvestimentoSection
            control={form.control}
            getValues={form.getValues}
          />

          <Separator className="border-border" />

          <div className="flex flex-col justify-end gap-4 pt-6 sm:flex-row">
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="border-border bg-background hover:bg-accent hover:text-accent-foreground h-10 w-full border px-8 sm:w-auto"
              >
                Cancelar
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-full px-8 font-medium sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isLoading
                  ? 'Salvando...'
                  : mode === 'edit'
                  ? 'Atualizar Startup'
                  : 'Criar Startup'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}