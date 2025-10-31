'use client'

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
import FileUploader from '@/components/comp-545'
import { Shield, FileCheck } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface DocumentacaoKYBSectionProps {
  control: Control<any>
}

const DOCUMENTOS_KYB = [
  {
    name: 'comprovante_situacao_cadastral',
    label: 'Comprovante de Situação Cadastral (CNPJ)',
    description: 'Certidão emitida pela Receita Federal comprovando a regularidade do CNPJ',
    accept: 'application/pdf,image/png,image/jpeg,image/jpg',
  },
  {
    name: 'contrato_social',
    label: 'Contrato Social',
    description: 'Documento que estabelece as regras e estrutura societária da empresa',
    accept: 'application/pdf',
  },
  {
    name: 'documento_mvp',
    label: 'Documentação do MVP',
    description: 'Documento técnico descrevendo o Produto Mínimo Viável (MVP)',
    accept: 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  {
    name: 'certificado_registro_software_patente',
    label: 'Certificado de Registro de Software ou Patente',
    description: 'Comprovante de registro de propriedade intelectual (opcional)',
    accept: 'application/pdf,image/png,image/jpeg',
  },
  {
    name: 'certificado_direitos_autorais',
    label: 'Certificado de Direitos Autorais',
    description: 'Registro de direitos autorais relacionados ao negócio (opcional)',
    accept: 'application/pdf,image/png,image/jpeg',
  },
  {
    name: 'contrato_confidencialidade',
    label: 'Contrato de Confidencialidade (NDA)',
    description: 'Modelo de acordo de confidencialidade utilizado pela empresa (opcional)',
    accept: 'application/pdf',
  },
  {
    name: 'planejamento_estrategico',
    label: 'Planejamento Estratégico',
    description: 'Documento com plano de negócios e estratégia de crescimento',
    accept: 'application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  {
    name: 'mapeamento_processos_internos',
    label: 'Mapeamento de Processos Internos',
    description: 'Documentação dos principais processos operacionais da startup',
    accept: 'application/pdf,image/png,image/jpeg',
  },
  {
    name: 'mapeamento_riscos_juridicos_operacionais',
    label: 'Mapeamento de Riscos Jurídicos e Operacionais',
    description: 'Análise de riscos legais e operacionais do negócio',
    accept: 'application/pdf',
  },
] as const

export function DocumentacaoKYBSection({ control }: DocumentacaoKYBSectionProps) {
  return (
    <Card className="bg-card text-card-foreground shadow-sm border border-border">
      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-foreground text-xl">Documentação KYB</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Know Your Business - Documentos obrigatórios para verificação e compliance
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-primary/50 bg-primary/5">
          <FileCheck className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm">
            Todos os documentos devem ser legíveis e atualizados. Arquivos PDF são preferíveis.
            Os documentos marcados como &quot;opcional&quot; podem ser enviados posteriormente.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 gap-6">
          {DOCUMENTOS_KYB.map((doc) => (
            <FormField
              key={doc.name}
              control={control}
              name={doc.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    {doc.label}
                    {doc.description.includes('opcional') && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (Opcional)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="border border-dashed border-border rounded-lg p-3 hover:border-primary transition-colors bg-muted/10">
                      <FileUploader
                        accept={doc.accept}
                        maxSizeMB={5}
                        onFileChange={(file) => field.onChange(file)}
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs">
                    {doc.description}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <Alert className="border-blue/50 bg-blue/5">
          <AlertDescription className="text-sm">
            <strong>Dica:</strong> Mantenha todos os documentos organizados em formato digital.
            Isso agilizará o processo de análise e aprovação da sua startup no marketplace.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
