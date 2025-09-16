// componentes/AffiliateHome.tsx

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { z } from 'zod';
import { DataTable, schema } from '@/components/data-table';
import { ChartAreaInteractive } from '@/components/chart-area-interactive';
import { affiliateService } from '@/services/AffiliateService'; // Importe o serviço e a interface
import { DashboardData } from '@/types/afiliateTypes';

interface AffiliateHomeProps {
  // Use os IDs para buscar os dados da API.
  userId?: number;
  token?: string;
  data: z.infer<typeof schema>[];
}

export default function AffiliateHome({ userId, token, data }: AffiliateHomeProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let canceled = false;

    const fetchDashboardData = async () => {
      if (!userId || !token) {
        setError("Dados de usuário não disponíveis.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await affiliateService.getAffiliateDashboard(token, userId);
        if (!canceled) {
          if (response.status === 'success' && response.data) {
            setDashboardData(response.data);
          } else {
            throw new Error(response.message || 'Falha ao carregar os dados do dashboard.');
          }
        }
      } catch (err: unknown) {
        console.error("Erro ao buscar dados do dashboard:", err);
        const message = err instanceof Error ? err.message : 'Não foi possível carregar os dados. Tente novamente mais tarde.';
        if (!canceled) {
          if (retryCount < 3) {
            setTimeout(() => setRetryCount((r) => r + 1), 2000); // Tenta novamente após 2 segundos
          } else {
            setError(message);
          }
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      canceled = true;
    };
  }, [userId, token, retryCount]);

  const handleCopy = () => {
    const link = dashboardData?.link_indicacao || "Link não disponível";
    navigator.clipboard.writeText(link).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p>Carregando dashboard... {retryCount > 0 && `(Tentativa ${retryCount})`}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="text-red-500">Erro: {error}</p>
        {retryCount >= 3 && (
          <Button onClick={() => setRetryCount(0)} className="mt-4">
            Tentar Novamente
          </Button>
        )}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p>Nenhum dado encontrado para o afiliado.</p>
      </div>
    );
  }

  const { nome, link_indicacao, kpis } = dashboardData;

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-6 py-4 md:py-6">
          {/* Mensagem de boas-vindas personalizada */}
          <section className="px-4 lg:px-6">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Bem-vindo(a), {nome}!
            </h1>
            <p className="text-muted-foreground">Aqui você gerencia suas atividades como afiliado.</p>
          </section>

          {/* Grid para Código de Indicação, Materiais de Apoio e Suporte */}
          <div className="grid grid-cols-1 gap-6 px-4 md:grid-cols-3 lg:px-6">
            {/* Link exclusivo de indicação */}
            <Card className="flex flex-col">
              <CardHeader className="p-3 pb-0">
                <CardTitle className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Link de Indicação</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <p className="mb-2 text-center text-sm text-muted-foreground">
                  Compartilhe este link para indicar novos usuários:
                </p>
                <div className="flex w-full max-w-sm flex-col items-center gap-2 sm:flex-row">
                  <input
                    type="text"
                    readOnly
                    value={link_indicacao}
                    className="w-full flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button onClick={handleCopy} disabled={isCopied} className="w-full sm:w-auto">
                    {isCopied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Materiais de apoio */}
            <Card>
              <CardHeader className="p-1 pb-0">
                <CardTitle className="text-center text-2xl font-semibold tracking-tight md:text-2xl">Materiais de Apoio</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <p>Acesse banners, PDFs e vídeos para suas campanhas.</p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <Button variant="outline">Baixar Banners</Button>
                  <Button variant="outline">Ver PDFs</Button>
                  <Button variant="outline">Assistir Vídeos</Button>
                </div>
              </CardContent>
            </Card>

            {/* Canal direto de suporte */}
            <Card>
              <CardHeader className="p-1 pb-0">
                <CardTitle className="text-center text-2xl font-semibold tracking-tight md:text-2xl">Suporte</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <p className="text-center">Precisa de ajuda? Entre em contato conosco.</p>
                <Button className="mt-4 w-full max-w-sm whitespace-normal h-auto">Abrir Canal de Suporte</Button>
              </CardContent>
            </Card>
          </div>

          {/* Seção de KPIs */}
          <section className="px-4 lg:px-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Card Total Recebido */}
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Total Recebido</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="text-2xl font-bold">
                    {kpis.totalComissoes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                  <p className="text-xs text-muted-foreground">Acumulado de todas as comissões</p>
                </CardContent>
              </Card>

              {/* Card Cliques no Link */}
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Cliques no Link</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="text-2xl font-bold">{kpis.totalClicks}</div>
                  <p className="text-xs text-muted-foreground">Total de cliques no seu link</p>
                </CardContent>
              </Card>

              {/* Card Cadastros Realizados */}
              <Card>
                <CardHeader className="p-3 pb-0">
                  <CardTitle className="text-center text-2xl font-semibold tracking-tight md:text-3xl">Cadastros Realizados</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="text-2xl font-bold">{kpis.totalConversions}</div>
                  <p className="text-xs text-muted-foreground">Conversão de cliques em cadastros</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Relatórios de performance (seção separada) */}
          <section className="px-4 lg:px-6">
            <ChartAreaInteractive />
          </section>

          {/* Gestão de comissões (seção separada) */}
          <section className="px-4 lg:px-6">
            <DataTable data={data} />
          </section>
        </div>
      </div>
    </div>
  );
}