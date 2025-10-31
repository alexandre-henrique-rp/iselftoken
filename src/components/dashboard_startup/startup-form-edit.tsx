'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Form } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Save, Loader2, Building2, Tag, Presentation, DollarSign, Shield } from 'lucide-react'
import { startupEditSchema, startupEditDefaultValues, type StartupEditFormData } from '@/schemas/startup-edit-schema'
import { unmaskValue } from '@/lib/mask-utils'

// Importar todas as seções
import { InformacoesBasicasSection } from './form-sections/informacoes-basicas-section'
import { ClassificacaoSection } from './form-sections/classificacao-section'
import { ApresentacaoPitchSection } from './form-sections/apresentacao-pitch-section'
import { InvestimentoSection } from './form-sections/investimento-section'
import { DocumentacaoKYBSection } from './form-sections/documentacao-kyb-section'

interface StartupFormEditProps {
  mode: 'create' | 'edit'
  initialData?: Partial<StartupEditFormData> | null
}

export function StartupFormEdit({ mode, initialData }: StartupFormEditProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isConsultingCnpj, setIsConsultingCnpj] = useState(false)
  const [activeTab, setActiveTab] = useState('informacoes')

  const form = useForm({
    // @ts-expect-error - Type conflict between Zod schema and react-hook-form resolver
    resolver: zodResolver(startupEditSchema),
    defaultValues: initialData || startupEditDefaultValues,
  })

  const onSubmit = async (data: StartupEditFormData) => {
    setIsLoading(true)

    try {
      // Preparar dados para envio
      const submitData = {
        ...data,
        cnpj: unmaskValue(data.cnpj),
        data_fundacao: new Date(data.data_fundacao),
        // TODO: Implementar upload de arquivos para API
        // Os arquivos precisarão ser enviados para /api/upload primeiro
      }

      const url = mode === 'edit' ? `/api/startup/${(initialData as {id?: number})?.id}` : '/api/startup'
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

      const empresa = await response.json()

      if (empresa?.razao_social) {
        form.setValue('nome', empresa.razao_social, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      }

      if (empresa?.estabelecimento?.data_inicio_atividade) {
        const dataFundacao = new Date(empresa.estabelecimento.data_inicio_atividade)
          .toISOString()
          .split('T')[0]
        form.setValue('data_fundacao', dataFundacao, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
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
    <div className="space-y-6">
      {/* Header com botão voltar */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="hover:bg-accent hover:text-accent-foreground gap-2 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {/* Formulário com Tabs */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Lista de Tabs */}
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto gap-1.5 sm:gap-2 bg-muted p-1.5 sm:p-2">
              <TabsTrigger value="informacoes" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5">
                <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Informações</span>
                <span className="xs:hidden">Info</span>
              </TabsTrigger>
              <TabsTrigger value="classificacao" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5">
                <Tag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Classificação</span>
                <span className="xs:hidden">Class</span>
              </TabsTrigger>
              <TabsTrigger value="apresentacao" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5">
                <Presentation className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>Pitch</span>
              </TabsTrigger>
              <TabsTrigger value="investimento" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Investimento</span>
                <span className="xs:hidden">Invest</span>
              </TabsTrigger>
              <TabsTrigger value="documentacao" className="gap-1.5 text-xs sm:text-sm px-2 sm:px-3 py-2 sm:py-2.5 col-span-2 sm:col-span-1">
                <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Documentação</span>
                <span className="xs:hidden">Docs</span>
              </TabsTrigger>
            </TabsList>

            {/* Conteúdo das Tabs */}
            <TabsContent value="informacoes" className="mt-6">
              <InformacoesBasicasSection
                control={form.control}
                onConsultCnpj={handleConsultCnpj}
                isConsultingCnpj={isConsultingCnpj}
              />
            </TabsContent>

            <TabsContent value="classificacao" className="mt-6">
              <ClassificacaoSection control={form.control} />
            </TabsContent>

            <TabsContent value="apresentacao" className="mt-6">
              <ApresentacaoPitchSection control={form.control} />
            </TabsContent>

            <TabsContent value="investimento" className="mt-6">
              <InvestimentoSection
                control={form.control}
                getValues={form.getValues}
              />
            </TabsContent>

            <TabsContent value="documentacao" className="mt-6">
              <DocumentacaoKYBSection control={form.control} />
            </TabsContent>
          </Tabs>

          <Separator className="border-border" />

          {/* Botões de ação */}
          <div className="flex flex-col justify-end gap-4 pt-6 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
              className="border-border bg-background hover:bg-accent hover:text-accent-foreground h-10 w-full border px-8 sm:w-auto"
            >
              Cancelar
            </Button>
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
        </form>
      </Form>
    </div>
  )
}
