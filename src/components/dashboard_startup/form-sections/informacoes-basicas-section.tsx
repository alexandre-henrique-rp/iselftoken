import { Control } from 'react-hook-form'
import { Loader2, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Button } from '@/components/ui/button'
import { applyCnpjMask, unmaskValue } from '@/lib/mask-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import AvatarUploader from '@/components/comp-543'

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
        <CardDescription className="text-muted-foreground">
          Informações essenciais sobre a startup, incluindo identificação e dados cadastrais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="flex justify-center">
          <FormField
            control={control}
            name="logo"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center">
                <FormLabel className="text-sm font-medium mb-2">Logo da Startup</FormLabel>
                <FormControl>
                  <AvatarUploader
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onFileChange={(file) => field.onChange(file)}
                  />
                </FormControl>
                <FormDescription className="text-xs text-center mt-2">
                  PNG, JPG ou SVG (recomendado: 256x256px)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="nome"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Razão Social</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite a razão social"
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
              name="nome_fantasia"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Nome Fantasia</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Digite o nome fantasia (opcional)"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    Nome comercial da startup, se diferente da razão social
                  </FormDescription>
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

          <div className="flex flex-col justify-end h-full">
            <FormField
              control={control}
              name="site"
              render={({ field }) => (
                <FormItem className="h-full">
                  <FormLabel className="text-sm font-medium">Site</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://www.suastartup.com.br"
                      className="h-10"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">
                    URL do site oficial da startup (opcional)
                  </FormDescription>
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