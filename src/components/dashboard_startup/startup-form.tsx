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

const AREA_ATUACAO_SUGESTOES: Array<{ area: string; keywords: string[] }> = [
  { area: 'Fintech', keywords: ['fintech', 'finance', 'pagamento', 'bank', 'credito', 'crédito'] },
  { area: 'E-commerce', keywords: ['comércio', 'commerce', 'loja', 'marketplace', 'varejo online'] },
  { area: 'SaaS', keywords: ['software', 'plataforma', 'sas', 'gestão', 'service'] },
  { area: 'EdTech', keywords: ['educ', 'ensino', 'aprend', 'treinamento', 'curso'] },
  { area: 'HealthTech', keywords: ['saúde', 'health', 'clínic', 'medic', 'hospital'] },
  { area: 'AgTech', keywords: ['agro', 'agrícola', 'campo', 'fazenda'] },
  { area: 'Marketplace', keywords: ['marketplace', 'hub de ofertas', 'plataforma de oferta'] },
  { area: 'Logística', keywords: ['logístic', 'transporte', 'entrega', 'last mile', 'supply'] },
  { area: 'Energia', keywords: ['energia', 'solar', 'power', 'renovável', 'elétrica'] },
  { area: 'Varejo', keywords: ['varejo', 'retail', 'loja física'] },
  { area: 'Outros', keywords: [] },
]

interface EmpresaCnpjResponse {
  razao_social?: string
  capital_social?: string | number
  estabelecimento?: {
    data_inicio_atividade?: string
    atividade_principal?: {
      descricao?: string
    }
    pais?: {
      iso3?: string
    }
  }
}

const encontrarAreaPorDescricao = (descricao?: string): string | undefined => {
  if (!descricao) {
    return undefined
  }

  const descricaoNormalizada = descricao.toLowerCase()

  const sugestao = AREA_ATUACAO_SUGESTOES.find(({ keywords }) =>
    keywords.some((keyword) => descricaoNormalizada.includes(keyword))
  )

  return sugestao?.area
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
  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false)

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

  const handleConsultCnpj = async () => {
    const cnpjValue = form.getValues('cnpj')
    const sanitizedCnpj = unmaskValue(cnpjValue)
    console.log("🚀 ~ handleConsultCnpj ~ sanitizedCnpj:", sanitizedCnpj)

    if (sanitizedCnpj.length !== 14) {
      toast.warning('Informe um CNPJ válido para consulta.')
      return
    }

    setIsConsultingCnpj(true)

    try {
      const response = await fetch(`/api/cnpj/${sanitizedCnpj}`)
     

      if (response.status === 404) {
        toast.info('CNPJ não encontrado na base consultada.')
        return
      }

      if (!response.ok) {
        throw new Error('Falha na consulta do CNPJ')
      }

      const empresa: EmpresaCnpjResponse = await response.json()

      if (empresa?.razao_social) {
        form.setValue('nome', empresa.razao_social, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }

      const dataFundacao = empresa?.estabelecimento?.data_inicio_atividade

      if (dataFundacao) {
        form.setValue('data_fundacao', new Date(dataFundacao).toISOString().split('T')[0], {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }

      const paisIso3 = empresa?.estabelecimento?.pais?.iso3
      const paisesPermitidos = ['BRA', 'USA', 'ARG', 'CHL']

      if (paisIso3 && paisesPermitidos.includes(paisIso3)) {
        form.setValue('pais', paisIso3, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }

      const areaSugerida = encontrarAreaPorDescricao(
        empresa?.estabelecimento?.atividade_principal?.descricao
      )

      form.setValue('area_atuacao', areaSugerida || 'Outros', {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })

      if (!initialData) {
        const receitaPresumida = Number(empresa?.capital_social)
        if (!Number.isNaN(receitaPresumida) && receitaPresumida > 0) {
          const metaSugerida = Math.min(Math.max(receitaPresumida * 0.1, 100000), 15000000)
          form.setValue('meta_captacao', Number(metaSugerida.toFixed(2)), {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          })
        }
      }

      toast.success('Dados do CNPJ preenchidos automaticamente.')
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error)
      toast.error('Não foi possível consultar o CNPJ. Tente novamente mais tarde.')
    } finally {
      setIsConsultingCnpj(false)
    }
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
          <InformacoesBasicasSection
            control={form.control}
            onConsultCnpj={handleConsultCnpj}
            isConsultingCnpj={isConsultingCnpj}
          />

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
                className="bg-[#d500f9] text-white hover:bg-[#d500f9]/90 h-10 w-full px-8 font-medium sm:w-auto"
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