'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Download, TrendingUp, Calendar } from 'lucide-react';
import { Startup, StartupHistory } from '@/types/startup';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/utils';

interface StartupHistoryModalProps {
  startup: Startup;
  isOpen: boolean;
  onClose: () => void;
}

export function StartupHistoryModal({
  startup,
  isOpen,
  onClose,
}: StartupHistoryModalProps) {
  const [history, setHistory] = useState<StartupHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const request = await fetch(
          `/api/startup/dashboard/${startup.id}/historico`,
        );
        const data = await request.json();
        if (active) {
          setHistory(data);
        }
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      active = false;
    };
  }, [isOpen, startup.id]);

  // const getStatusBadgeVariant = (status: string) => {
  //   switch (status) {
  //     case 'Concluída': return 'default'
  //     case 'Ativa': return 'default'
  //     case 'Pausada': return 'secondary'
  //     case 'Cancelada': return 'destructive'
  //     default: return 'secondary'
  //   }
  // }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Concluída':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Ativa':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Pausada':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Cancelada':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return '';
    }
  };

  const totalCaptado = history.reduce(
    (sum, item) => sum + item.valor_captado,
    0,
  );
  const totalInvestidores = history.reduce(
    (sum, item) => sum + item.numero_investidores,
    0,
  );
  const campanhasConcluidas = history.filter(
    (item) => item.status === 'Concluída',
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Histórico de Captações - {startup.nome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="bg-muted mb-2 h-4 w-24 rounded" />
                    <div className="bg-muted h-8 w-32 rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="bg-muted h-64 animate-pulse rounded" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total Captado Histórico</CardDescription>
                  <CardTitle className="text-2xl text-green-600">
                    {formatCurrency(totalCaptado)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Total de Investidores</CardDescription>
                  <CardTitle className="text-2xl text-blue-600">
                    {totalInvestidores}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Campanhas Concluídas</CardDescription>
                  <CardTitle className="text-2xl text-violet-600">
                    {campanhasConcluidas} de {history.length}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* History Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Campanhas de Captação</CardTitle>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <div className="py-8 text-center">
                    <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                    <h3 className="mb-2 text-lg font-medium">
                      Nenhuma campanha encontrada
                    </h3>
                    <p className="text-muted-foreground">
                      Esta startup ainda não possui histórico de campanhas de
                      captação.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Nome da Campanha</TableHead>
                          <TableHead>Valor Objetivo</TableHead>
                          <TableHead>Valor Captado</TableHead>
                          <TableHead>% Atingido</TableHead>
                          <TableHead>Investidores</TableHead>
                          <TableHead>Período</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">
                              {item.id}
                            </TableCell>
                            <TableCell className="font-medium">
                              {item.nome}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.valor_objetivo)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.valor_captado)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {formatPercentage(item.percentual_atingido)}
                                </span>
                                {item.percentual_atingido >= 100 && (
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.numero_investidores}</TableCell>
                            <TableCell className="text-sm">
                              <div>
                                <div>{formatDate(item.data_inicio)}</div>
                                {item.data_fim && (
                                  <div className="text-muted-foreground">
                                    {formatDate(item.data_fim)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={getStatusBadgeColor(item.status)}
                              >
                                {item.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
