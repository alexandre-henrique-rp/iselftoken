'use client'

import { Control, useFieldArray } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Trash2, Video, FileText } from 'lucide-react'
import FileUploader from '@/components/comp-545'

interface ApresentacaoPitchSectionProps {
  control: Control<any>
}

const REDES_SOCIAIS = [
  { value: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/sua-startup' },
  { value: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/suastartup' },
  { value: 'twitter', label: 'Twitter/X', placeholder: 'https://twitter.com/suastartup' },
  { value: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/suastartup' },
  { value: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@suastartup' },
  { value: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@suastartup' },
  { value: 'outro', label: 'Outro', placeholder: 'https://...' },
] as const

export function ApresentacaoPitchSection({ control }: ApresentacaoPitchSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'redes_sociais',
  })

  return (
    <Card className="bg-card text-card-foreground shadow-sm border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-foreground text-xl">Apresentação e Pitch</CardTitle>
        <CardDescription className="text-muted-foreground">
          Conte a história da sua startup e compartilhe materiais de apresentação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Descrição do Objetivo */}
        <div className="flex flex-col">
          <FormField
            control={control}
            name="descricao_objetivo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Descrição Completa do Objetivo</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva detalhadamente o propósito da sua startup, o problema que resolve, a solução oferecida e os diferenciais competitivos..."
                    className="resize-none min-h-[150px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  Descrição completa que será exibida na página de detalhes da startup (mínimo 20 caracteres)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Vídeo Pitch e PDF */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <FormField
            control={control}
            name="video_pitch"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  Vídeo Pitch (YouTube)
                </FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-9 sm:h-10 text-xs sm:text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  URL do vídeo de pitch no YouTube (opcional)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Pitch PDF */}
          <FormField
            control={control}
            name="pitch_pdf"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Pitch Deck (PDF)
                </FormLabel>
                <FormControl>
                  <div className="border border-dashed border-border rounded-lg p-3 sm:p-4 hover:border-primary transition-colors">
                    <FileUploader
                      accept="application/pdf"
                      maxSizeMB={10}
                      onFileChange={(file) => field.onChange(file)}
                    />
                  </div>
                </FormControl>
                <FormDescription className="text-xs">
                  Apresentação em PDF (máximo 10MB)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Redes Sociais Dinâmicas */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <FormLabel className="text-sm font-medium">Redes Sociais</FormLabel>
              <FormDescription className="text-xs">
                Adicione os perfis da sua startup nas redes sociais
              </FormDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ plataforma: 'linkedin', url: '' })}
              className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9 shrink-0"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Adicionar Rede</span>
            </Button>
          </div>

          {fields.length === 0 && (
            <div className="border border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma rede social adicionada. Clique em &quot;Adicionar Rede&quot; para começar.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-3 sm:p-4 border border-border rounded-lg bg-muted/20 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,180px)_1fr] gap-3 items-start">
                  <FormField
                    control={control}
                    name={`redes_sociais.${index}.plataforma`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs sm:text-sm">Plataforma</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-9 sm:h-10 text-xs sm:text-sm">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {REDES_SOCIAIS.map((rede) => (
                              <SelectItem key={rede.value} value={rede.value}>
                                {rede.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={control}
                    name={`redes_sociais.${index}.url`}
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs sm:text-sm">URL do Perfil</FormLabel>
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://..."
                            className="h-9 sm:h-10 text-xs sm:text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-xs">Remover</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
