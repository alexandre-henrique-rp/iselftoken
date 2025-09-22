'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { Startup } from '@/types/startup'
import { formatCurrency, formatCNPJ } from '@/lib/utils'

interface DeleteStartupDialogProps {
  startup: Startup
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  isLoading: boolean
}

export function DeleteStartupDialog({
  startup,
  isOpen,
  onClose,
  onConfirm,
  isLoading
}: DeleteStartupDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card text-card-foreground border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Startup
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. A startup será permanentemente excluída do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-destructive/10 border-destructive/20">
            <h4 className="font-medium text-sm mb-2">Startup a ser excluída:</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">{startup.nome}</p>
                  <p className="text-sm text-muted-foreground">
                    #{startup.id} • {formatCNPJ(startup.cnpj)}
                  </p>
                </div>
                <Badge variant="outline">{startup.status}</Badge>
              </div>
              <div className="text-sm">
                <p><strong>Área:</strong> {startup.area_atuacao}</p>
                <p><strong>Meta:</strong> {formatCurrency(startup.meta_captacao)}</p>
                <p><strong>Investidores:</strong> {startup.total_investidores}</p>
                <p><strong>Total Captado:</strong> {formatCurrency(startup.total_captado)}</p>
              </div>
            </div>
          </div>

          {startup.total_captado > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Atenção: Startup com investimentos
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Esta startup possui {formatCurrency(startup.total_captado)} em investimentos ativos. 
                    A exclusão pode afetar {startup.total_investidores} investidores.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border border-border bg-background hover:bg-accent hover:text-accent-foreground"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isLoading}
          >
            {isLoading ? 'Excluindo...' : 'Sim, Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}