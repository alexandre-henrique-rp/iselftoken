import { Control } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
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
  return (
    <Card className="bg-card text-card-foreground shadow-sm border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground text-xl">Classificação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  )
}