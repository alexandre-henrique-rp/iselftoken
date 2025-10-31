import { Control } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import FileUploader from '@/components/comp-545'
import { useState } from 'react'

interface ClassificacaoSectionProps {
  control: Control<any>
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

export function ClassificacaoSection({ control }: ClassificacaoSectionProps) {
  const [charCount, setCharCount] = useState(0)
  const MAX_CHARS = 500

  return (
    <Card className="bg-card text-card-foreground shadow-sm border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground text-xl">Classificação e Mercado</CardTitle>
        <CardDescription className="text-muted-foreground">
          Defina como sua startup será categorizada e apresentada no marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="area_atuacao"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Área de Atuação</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
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
          </div>

          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="estagio"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Estágio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
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
        </div>

        {/* Descrição para Marketplace */}
        <div className="flex flex-col justify-end">
          <FormField
            control={control}
            name="descritivo_basico"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormLabel className="text-sm font-medium">
                  Descrição para Marketplace
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva sua startup de forma atrativa para investidores. Esta descrição será exibida no marketplace."
                    className="resize-none min-h-[100px] h-full"
                    maxLength={MAX_CHARS}
                    {...field}
                    onChange={(e) => {
                      field.onChange(e)
                      setCharCount(e.target.value.length)
                    }}
                  />
                </FormControl>
                <div className="flex justify-between items-center">
                  <FormDescription className="text-xs">
                    Texto curto e impactante sobre sua solução e proposta de valor
                  </FormDescription>
                  <span className={`text-xs ${charCount > MAX_CHARS - 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {charCount}/{MAX_CHARS}
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Imagem do Marketplace */}
        <div className="flex flex-col">
          <FormField
            control={control}
            name="imagem_marketplace"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Imagem do Marketplace</FormLabel>
                <FormControl>
                  <FileUploader
                    accept="image/png,image/jpeg,image/jpg"
                    maxSizeMB={2}
                    onFileChange={(file) => field.onChange(file)}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Imagem principal que será exibida no card da startup no marketplace (recomendado: 1200x630px)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}