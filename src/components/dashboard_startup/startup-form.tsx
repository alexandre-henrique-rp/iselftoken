'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { Startup } from '@/types/startup'
import { applyCnpjMask, unmaskValue } from '@/lib/mask-utils'

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
  descritivo_basico: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  meta_captacao: z.number().min(1, 'Meta de captação deve ser maior que 0'),
  equity_oferecido: z.number().min(0.1).max(100, 'Equity deve estar entre 0.1% e 100%'),
  descricao_objetivo: z.string().min(20, 'Objetivo deve ter pelo menos 20 caracteres'),
})

type StartupFormData = z.infer<typeof startupSchema>

interface StartupFormProps {
  mode: 'create' | 'edit'
  initialData?: StartupWithFormData
}

const AREA_ATUACAO_OPTIONS = [
  'Fintech',
  'E-commerce',
  'SaaS',
  'EdTech',
  'HealthTech',
  'AgTech',
  'Marketplace',
  'Logística',
  'Energia',
  'Varejo',
  'Outros'
]

const ESTAGIO_OPTIONS = [
  'Ideia',
  'MVP',
  'Produto',
  'Tração',
  'Crescimento',
  'Expansão'
]

export function StartupForm({ mode, initialData }: StartupFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<StartupFormData>({
    resolver: zodResolver(startupSchema),
    defaultValues: {
      nome: initialData?.nome || '',
      cnpj: initialData?.cnpj || '',
      pais: typeof initialData?.pais === 'string' ? initialData.pais : initialData?.pais?.iso3 || 'BRA',
      data_fundacao: initialData?.data_fundacao
        ? new Date(initialData.data_fundacao).toISOString().split('T')[0]
        : '',
      area_atuacao: initialData?.area_atuacao || '',
      estagio: initialData?.estagio || '',
      descritivo_basico: initialData?.descritivo_basico || '',
      meta_captacao: initialData?.meta_captacao || 0,
      equity_oferecido: initialData?.equity_oferecido || 0,
      descricao_objetivo: initialData?.descricao_objetivo || '',
    },
  })

  const handleCnpjChange = (value: string) => {
    const maskedValue = applyCnpjMask(value)
    form.setValue('cnpj', maskedValue)
  }

  const onSubmit = async (data: StartupFormData) => {
    setIsLoading(true)

    try {
      const submitData = {
        ...data,
        cnpj: unmaskValue(data.cnpj),
        data_fundacao: new Date(data.data_fundacao),
      }

      const url = mode === 'edit'
        ? `/api/startup/${initialData?.id}`
        : '/api/startup'

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
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={handleBack}
        className="gap-2 hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Informações Básicas */}
          <Card className="bg-card text-card-foreground shadow-sm border border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-xl">Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Startup</FormLabel>
                      <FormControl>
                        <Input placeholder="Digite o nome da startup" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00.000.000/0000-00"
                          {...field}
                          onChange={(e) => handleCnpjChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_fundacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Fundação</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pais"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o país" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BRA">Brasil</SelectItem>
                          <SelectItem value="USA">Estados Unidos</SelectItem>
                          <SelectItem value="ARG">Argentina</SelectItem>
                          <SelectItem value="CHL">Chile</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descritivo_basico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição Básica</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva brevemente sua startup"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Classificação */}
          <Card className="bg-card text-card-foreground shadow-sm border border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-xl">Classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area_atuacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Área de Atuação</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a área" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AREA_ATUACAO_OPTIONS.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estagio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estágio</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o estágio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ESTAGIO_OPTIONS.map((estagio) => (
                            <SelectItem key={estagio} value={estagio}>
                              {estagio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Investimento */}
          <Card className="bg-card text-card-foreground shadow-sm border border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-foreground text-xl">Informações de Investimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="meta_captacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta de Captação (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="equity_oferecido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equity Oferecido (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="100"
                          placeholder="0.0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricao_objetivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivo do Investimento</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva como pretende usar o investimento"
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Separator className="border-border" />

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
              className="border border-border bg-background hover:bg-accent hover:text-accent-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isLoading
                ? 'Salvando...'
                : mode === 'edit'
                  ? 'Atualizar Startup'
                  : 'Criar Startup'
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}