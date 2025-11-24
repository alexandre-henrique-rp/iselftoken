'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCNPJ } from '@/lib/utils';
import { Startup } from '@/types/startup';
import { AlertTriangle } from 'lucide-react';

interface DeleteStartupDialogProps {
  startup: Startup;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function DeleteStartupDialog({
  startup,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: DeleteStartupDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card text-card-foreground border-border max-w-md border">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Excluir Startup
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. A startup será permanentemente
            excluída do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border-destructive/20 rounded-lg border p-4">
            <h4 className="mb-2 text-sm font-medium">
              Startup a ser excluída:
            </h4>
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{startup.nome}</p>
                  <p className="text-muted-foreground text-sm">
                    #{startup.id} • {formatCNPJ(startup.cnpj)}
                  </p>
                </div>
                <Badge variant="outline">{startup.status}</Badge>
              </div>
              <div className="text-sm">
                <p>
                  <strong>Área:</strong> {startup.area_atuacao}
                </p>
                <p>
                  <strong>Campanhas:</strong> {startup.campanha.length}
                </p>
                <p>
                  <strong>Status:</strong> {startup.status}
                </p>
                <p>
                  <strong>Data Fundação:</strong>{' '}
                  {new Date(startup.data_fundacao).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>

          {startup.campanha.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800/30 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Atenção: Startup com investimentos
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Esta startup possui {startup.campanha.length} campanha(s)
                    ativa(s). A exclusão pode afetar os dados da plataforma.
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
            className="border-border bg-background hover:bg-accent hover:text-accent-foreground border"
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
  );
}
