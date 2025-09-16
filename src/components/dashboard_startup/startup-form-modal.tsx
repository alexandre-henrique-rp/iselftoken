'use client'

// import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Startup } from '@/types/startup'

interface StartupFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: unknown) => Promise<void>
  isLoading: boolean
  initialData?: Startup
  mode?: 'create' | 'edit'
}

export function StartupFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  mode = 'create'
}: StartupFormModalProps) {
  // const [formData, setFormData] = useState({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mock form data for now
    const mockFormData = {
      nome: 'Nova Startup Mock',
      cnpj: '12.345.678/0001-99',
      pais: 'BRA',
      data_fundacao: new Date(),
      area_atuacao: 'Fintech',
      estagio: 'MVP',
      descritivo_basico: 'Descrição de exemplo para teste',
      meta_captacao: 500000,
      equity_oferecido: 15,
      descricao_objetivo: 'Objetivo detalhado da startup de exemplo para demonstração do sistema.',
      dados_bancarios: {
        banco: 'Banco Exemplo',
        agencia: '1234-5',
        conta: '12345-6',
        tipo: 'Conta Corrente' as const,
        titular: 'Nova Startup Mock LTDA'
      },
      redes_sociais: {}
    }

    await onSubmit(mockFormData)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Editar Startup' : 'Nova Startup'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mock form content */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Informações Básicas</h3>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Formulário completo será implementado aqui com:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                  <li>Validação com Zod + react-hook-form</li>
                  <li>5 seções: Básico, Links, Apresentação, Bancário, Investimento</li>
                  <li>Upload de logo e documentos</li>
                  <li>Máscaras para CNPJ, valores monetários</li>
                  <li>Seleção de países via API externa</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Preview</h3>
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Preview dos dados em tempo real será exibido aqui
                </p>
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>Valuation Calculado: R$ 3.333.333,33</p>
                  <p>Status: Em Análise</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Salvando...' : mode === 'edit' ? 'Atualizar' : 'Criar Startup'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}