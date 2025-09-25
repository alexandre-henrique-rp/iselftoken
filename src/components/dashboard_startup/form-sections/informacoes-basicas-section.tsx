import { Control } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { applyCnpjMask } from '@/lib/mask-utils'

interface InformacoesBasicasSectionProps {
  control: Control<any>
}

export function InformacoesBasicasSection({ control }: InformacoesBasicasSectionProps) {
  const handleCnpjChange = (value: string, field: { onChange: (value: string) => void }) => {
    const maskedValue = applyCnpjMask(value)
    field.onChange(maskedValue)
  }

  return (
    <Card className="bg-card text-card-foreground shadow-sm border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground text-xl">Informações Básicas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="nome"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Nome da Startup</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o nome da startup"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="cnpj"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0000-00"
                      className="h-10"
                      {...field}
                      onChange={(e) => handleCnpjChange(e.target.value, field)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="data_fundacao"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Data de Fundação</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="pais"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">País</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10">
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
        </div>

        <div className="flex flex-col justify-end">
          <FormField
            control={control}
            name="descritivo_basico"
            render={({ field }) => (
              <FormItem className="h-full">
                <FormLabel className="text-sm font-medium">Descrição Básica</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva brevemente sua startup"
                    className="resize-none min-h-[80px] h-full"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}