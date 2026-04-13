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
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import {
  formatCNPJ,
  // formatCurrency,
} from '@/lib/utils';
import { Startup, StartupFilters } from '@/types/startup';
import { Building2, ChartNoAxesCombined, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AddStartupButton } from './add-startup-button';
import { StartupDataTableSkeleton } from './startup-data-table-skeleton';
import { Edit, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

interface StartupDataTableProps {
  initialData: Startup[];
  totalCount: number;
  initialFilters: StartupFilters;
}

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'Em Análise', label: 'Em Análise' },
  { value: 'Aprovada', label: 'Aprovada' },
  { value: 'Ativa', label: 'Ativa' },
  { value: 'Pausada', label: 'Pausada' },
  { value: 'Rejeitada', label: 'Rejeitada' },
];

const AREA_OPTIONS = [
  { value: 'all', label: 'Todas as Áreas' },
  { value: 'Fintech', label: 'Fintech' },
  { value: 'Healthtech', label: 'Healthtech' },
  { value: 'Edtech', label: 'Edtech' },
  { value: 'Agrotech', label: 'Agrotech' },
  { value: 'Retailtech', label: 'Retailtech' },
  { value: 'Lawtech', label: 'Lawtech/Legaltech' },
  { value: 'Construtech', label: 'Construtech' },
  { value: 'Foodtech', label: 'Foodtech' },
  { value: 'SaaS', label: 'SaaS' },
  { value: 'Marketplace', label: 'Marketplace' },
];

const ESTAGIO_OPTIONS = [
  { value: 'all', label: 'Todos os Estágios' },
  { value: 'Ideação', label: 'Ideação' },
  { value: 'MVP', label: 'MVP' },
  { value: 'Operação', label: 'Operação' },
  { value: 'Tração', label: 'Tração' },
  { value: 'ScaleUp', label: 'ScaleUp' },
  { value: 'Incubadora', label: 'Incubadora' },
  { value: 'Aceleradora', label: 'Aceleradora' },
];

export function StartupDataTable({
  initialData,
  totalCount,
  initialFilters,
}: StartupDataTableProps) {
  const router = useRouter();
  // const searchParams = useSearchParams();

  const [startups, setStartups] = useState<Startup[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState(initialFilters.search || '');
  const [status, setStatus] = useState(initialFilters.status || 'all');
  const [areaAtuacao, setAreaAtuacao] = useState(
    initialFilters.area_atuacao || 'all',
  );
  const [estagio, setEstagio] = useState(initialFilters.estagio || 'all');
  const [currentPage, setCurrentPage] = useState(initialFilters.page || 1);
  const [total, setTotal] = useState(totalCount);

  // Debounce search input
  const debouncedSearch = useDebounce(search, 300);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const showingFrom = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * ITEMS_PER_PAGE, total);

  const fetchStartups = useCallback(async () => {
    setLoading(true);

    // Simulate API call
    console.log('API Call: GET /api/startups', {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: debouncedSearch,
      status: status !== 'all' ? status : undefined,
      area_atuacao: areaAtuacao !== 'all' ? areaAtuacao : undefined,
      estagio: estagio !== 'all' ? estagio : undefined,
      sort_by: 'nome',
      sort_order: 'asc',
    });

    // Mock delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // For now, use initial data (will be replaced with actual API call)
    setStartups(initialData);
    setTotal(totalCount);
    setLoading(false);
  }, [
    currentPage,
    debouncedSearch,
    status,
    areaAtuacao,
    estagio,
    initialData,
    totalCount,
  ]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set('search', debouncedSearch);
    if (status !== 'all') params.set('status', status);
    if (areaAtuacao !== 'all') params.set('area_atuacao', areaAtuacao);
    if (estagio !== 'all') params.set('estagio', estagio);
    if (currentPage > 1) params.set('page', currentPage.toString());

    const paramsStr = params.toString();
    const targetUrl = paramsStr
      ? `${window.location.pathname}?${paramsStr}`
      : window.location.pathname;
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (targetUrl !== currentUrl) {
      router.replace(targetUrl, { scroll: false });
    }

    // Simulate API call
    fetchStartups();
  }, [
    debouncedSearch,
    status,
    areaAtuacao,
    estagio,
    currentPage,
    fetchStartups,
    router,
  ]);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setCurrentPage(1);
  };

  const handleAreaChange = (value: string) => {
    setAreaAtuacao(value);
    setCurrentPage(1);
  };

  const handleEstagioChange = (value: string) => {
    setEstagio(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setAreaAtuacao('all');
    setEstagio('all');
    setCurrentPage(1);
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Aprovada':
        return 'bg-[#d500f9]/10 text-[#d500f9] border border-[#d500f9]/20';
      case 'Ativa':
        return 'bg-[#00ad4e]/10 text-[#00ad4e] border border-[#00ad4e]/20';
      case 'Em Análise':
        return 'bg-muted text-muted-foreground border border-border';
      case 'Pausada':
        return 'bg-[#f0ec00]/30 text-[#f0ec00] border border-[#f0ec00]/20';
      case 'Rejeitada':
        return 'bg-destructive/10 text-destructive border border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border border-border';
    }
  };

  if (loading && startups.length === 0) {
    return <StartupDataTableSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <CardTitle className="text-xl font-semibold">Suas Startups</CardTitle>
          <AddStartupButton />
        </div>

        <Separator />

        {/* Filters */}
        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Buscar por nome ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Selects */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={areaAtuacao} onValueChange={handleAreaChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Área de Atuação" />
              </SelectTrigger>
              <SelectContent>
                {AREA_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={estagio} onValueChange={handleEstagioChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent>
                {ESTAGIO_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              Limpar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>campanha</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="bg-muted h-4 w-8 animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="bg-muted h-4 w-16 animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="bg-muted h-6 w-20 animate-pulse rounded" />
                      </TableCell>
                      <TableCell>
                        <div className="bg-muted h-8 w-8 animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : startups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Building2 className="text-muted-foreground h-12 w-12" />
                        <div>
                          <p className="text-lg font-medium">
                            Nenhuma startup encontrada
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {debouncedSearch ||
                            status !== 'all' ||
                            areaAtuacao !== 'all' ||
                            estagio !== 'all'
                              ? 'Tente ajustar os filtros para encontrar suas startups.'
                              : 'Comece criando sua primeira startup.'}
                          </p>
                        </div>
                        {!debouncedSearch &&
                          status === 'all' &&
                          areaAtuacao === 'all' &&
                          estagio === 'all' && <AddStartupButton />}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  startups.map((startup) => (
                    <TableRow key={startup.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">
                        {startup.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {startup.nome}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {formatCNPJ(startup.cnpj)}
                      </TableCell>
                      <TableCell>{startup.area_atuacao}</TableCell>
                      <TableCell>{startup.estagio}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeColor(startup.status)}>
                          {startup.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {startup.campanha
                          .filter((campanha) => campanha.status === 'Ativa')
                          .map((campanha) => campanha.status)
                          .join(', ')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/startups/${startup.id}`,
                                  )
                                }
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/campanha/${startup.id}`,
                                  )
                                }
                              >
                                <ChartNoAxesCombined className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Campanha</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Excluir</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-4 md:hidden">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="bg-muted h-5 w-32 rounded" />
                      <div className="bg-muted h-6 w-20 rounded" />
                    </div>
                    <div className="space-y-2">
                      <div className="bg-muted h-4 w-28 rounded" />
                      <div className="bg-muted h-4 w-24 rounded" />
                      <div className="bg-muted h-4 w-32 rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : startups.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Building2 className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-medium">
                  Nenhuma startup encontrada
                </h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {debouncedSearch ||
                  status !== 'all' ||
                  areaAtuacao !== 'all' ||
                  estagio !== 'all'
                    ? 'Tente ajustar os filtros para encontrar suas startups.'
                    : 'Comece criando sua primeira startup.'}
                </p>
                {!debouncedSearch &&
                  status === 'all' &&
                  areaAtuacao === 'all' &&
                  estagio === 'all' && <AddStartupButton />}
              </CardContent>
            </Card>
          ) : (
            startups.map((startup) => (
              <Card
                key={startup.id}
                className="transition-shadow hover:shadow-md"
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-medium">{startup.nome}</h4>
                        <p className="text-muted-foreground font-mono text-sm">
                          #{startup.id} • {formatCNPJ(startup.cnpj)}
                        </p>
                      </div>
                      <Badge className={getStatusBadgeColor(startup.status)}>
                        {startup.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Área:</span>
                        <p className="font-medium">{startup.area_atuacao}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estágio:</span>
                        <p className="font-medium">{startup.estagio}</p>
                      </div>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Meta de Captação:
                      </span>
                      <p className="text-lg font-bold">
                        {/* {formatCurrency(startup.meta_captacao)} */}
                      </p>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Total de Tokens:
                      </span>
                      <p className="text-lg font-bold">
                        {/* {formatCurrency(startup.tokens)} */}
                      </p>
                    </div>

                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Tokens Disponível:
                      </span>
                      <p className="text-lg font-bold">
                        {/* {formatCurrency(startup.current_tokens)} */}
                      </p>
                    </div>

                    <div className="flex justify-end pt-2">
                      {/* <StartupActionButtons startup={startup} /> */}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-muted-foreground text-sm">
              Mostrando {showingFrom} a {showingTo} de {total} resultados
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loading}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <Button
                      key={pageNumber}
                      variant={
                        currentPage === pageNumber ? 'default' : 'outline'
                      }
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      disabled={loading}
                      className="h-8 w-8 p-0"
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || loading}
              >
                Próximo
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
