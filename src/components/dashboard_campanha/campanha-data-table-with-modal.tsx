'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StartupFilters } from '@/types/startup';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Pause,
  Play,
  Plus,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import { NovaCampanhaModal } from './nova-campanha-modal';

interface Campanha {
  id: number;
  status: string;
  dt_inicio: string;
  dt_fim: string;
  meta_captacao: number;
  equity_oferecido: number;
  startup: {
    id: number;
    nome: string;
    area_atuacao: string;
    status: string;
  };
}

interface CampanhaDataTableWithModalProps {
  initialData: Campanha[];
  totalCount: number;
  initialFilters: StartupFilters;
  startupId: number;
  startupNome: string;
}

export function CampanhaDataTableWithModal({
  initialData,
  totalCount,
  initialFilters,
  startupId,
  startupNome,
}: CampanhaDataTableWithModalProps) {
  const [data, setData] = useState<Campanha[]>(initialData);
  const [filters, setFilters] = useState<StartupFilters>(initialFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativa':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pausado':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Concluído':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Inativo':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleToggleStatus = async (
    campanhaId: number,
    currentStatus: string,
  ) => {
    setIsLoading(true);

    // Simulação de chamada à API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Atualizar status localmente
    setData((prevData) =>
      prevData.map((campanha) =>
        campanha.id === campanhaId
          ? {
              ...campanha,
              status: currentStatus === 'Ativa' ? 'Pausado' : 'Ativa',
            }
          : campanha,
      ),
    );

    setIsLoading(false);
  };

  const filteredData = data.filter((campanha) => {
    const matchesSearch =
      campanha.startup.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campanha.startup.area_atuacao
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      !statusFilter ||
      statusFilter === 'all' ||
      campanha.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(totalCount / filters.limit!);
  const currentPage = filters.page!;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Campanhas de Captação</CardTitle>
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative max-w-sm flex-1">
                <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                <Input
                  placeholder="Buscar por startup ou área..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="Ativa">Ativa</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Startup</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Equity</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-muted-foreground py-8 text-center"
                    >
                      Nenhuma campanha encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((campanha) => (
                    <TableRow key={campanha.id}>
                      <TableCell className="font-medium">
                        {campanha.startup.nome}
                      </TableCell>
                      <TableCell>{campanha.startup.area_atuacao}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(campanha.status)}>
                          {campanha.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(campanha.dt_inicio)}</div>
                          <div className="text-muted-foreground">
                            até {formatDate(campanha.dt_fim)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(campanha.meta_captacao)}
                      </TableCell>
                      <TableCell>{campanha.equity_oferecido}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {campanha.status === 'Ativa' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleToggleStatus(campanha.id, campanha.status)
                              }
                              disabled={isLoading}
                              className="border-orange-200 text-orange-600 hover:bg-orange-50"
                            >
                              <Pause className="mr-1 h-3 w-3" />
                              Pausar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleToggleStatus(campanha.id, campanha.status)
                              }
                              disabled={isLoading}
                              className="border-green-200 text-green-600 hover:bg-green-50"
                            >
                              <Play className="mr-1 h-3 w-3" />
                              Ativar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-muted-foreground text-sm">
                Mostrando {filteredData.length} de {totalCount} campanhas
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters({ ...filters, page: currentPage - 1 })
                  }
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center space-x-1 text-sm">
                  <span>
                    Página {currentPage} de {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters({ ...filters, page: currentPage + 1 })
                  }
                  disabled={currentPage >= totalPages}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nova Campanha */}
      <NovaCampanhaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        startupId={startupId}
        startupNome={startupNome}
      />
    </>
  );
}
