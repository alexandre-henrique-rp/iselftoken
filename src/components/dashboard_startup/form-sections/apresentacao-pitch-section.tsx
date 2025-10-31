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

        {/* Vídeo Pitch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="video_pitch"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  Vídeo Pitch (YouTube)
                </FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-10"
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
              <FormItem>
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Pitch Deck (PDF)
                </FormLabel>
                <FormControl>
                  <div className="border border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors">
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <FormLabel className="text-sm font-medium">Redes Sociais</FormLabel>
              <FormDescription className="text-xs mt-1">
                Adicione os perfis da sua startup nas redes sociais
              </FormDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ plataforma: 'linkedin', url: '' })}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Rede
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
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-4 items-start p-4 border border-border rounded-lg bg-muted/20">
                <FormField
                  control={control}
                  name={`redes_sociais.${index}.plataforma`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Plataforma</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
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
                    <FormItem>
                      <FormLabel className="text-xs">URL do Perfil</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://..."
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="mt-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Remover rede social</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
