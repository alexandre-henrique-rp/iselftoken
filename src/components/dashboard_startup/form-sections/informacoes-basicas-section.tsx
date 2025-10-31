import { Control } from 'react-hook-form'
import { Loader2, Search } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { applyCnpjMask, unmaskValue } from '@/lib/mask-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface InformacoesBasicasSectionProps {
  control: Control<any>
  onConsultCnpj: () => Promise<void>
  isConsultingCnpj: boolean
}

export function InformacoesBasicasSection({
  control,
  onConsultCnpj,
  isConsultingCnpj,
}: InformacoesBasicasSectionProps) {
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
                    <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                      <Input
                        placeholder="00.000.000/0000-00"
                        className="h-10 sm:w-full"
                        {...field}
                        onChange={(e) => handleCnpjChange(e.target.value, field)}
                      />
                      <div className="flex items-center gap-2 sm:justify-end">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 w-full sm:w-10 sm:px-0"
                              onClick={onConsultCnpj}
                              disabled={
                                isConsultingCnpj || unmaskValue(field.value).length !== 14
                              }
                            >
                              {isConsultingCnpj ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                              <span className="sr-only">Consultar CNPJ</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-center">
                            Utilize a consulta para preencher automaticamente a razão social e demais dados.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
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