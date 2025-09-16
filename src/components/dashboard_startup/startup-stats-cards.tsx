import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { StartupStats } from '@/types/startup';

interface StartupStatsCardsProps {
  stats: StartupStats;
}

export function StartupStatsCards({ stats }: StartupStatsCardsProps) {
  const cards = [
    {
      title: 'Investimento Total',
      value: stats.investimento_total.formatado,
      description: 'Total captado em todas as startups',
      icon: TrendingUp,
      trend: stats.investimento_total.variacao_mes_anterior,
      trendType: stats.investimento_total.tipo_variacao,
      className:
        'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Total de Investidores',
      value: stats.total_investidores.quantidade.toString(),
      description: 'Investidores únicos em todas as startups',
      icon: Users,
      trend: stats.total_investidores.variacao_mes_anterior,
      trendType: stats.total_investidores.tipo_variacao,
      className:
        'bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Startups Ativas',
      value: stats.startups_ativas.quantidade.toString(),
      description: 'Startups aprovadas e operando',
      icon: CheckCircle,
      trend: stats.startups_ativas.variacao_mes_anterior,
      trendType: stats.startups_ativas.tipo_variacao,
      className:
        'bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      title: 'Startups Pendentes',
      value: stats.startups_pendentes.quantidade.toString(),
      description: 'Aguardando análise e aprovação',
      icon: Clock,
      trend: stats.startups_pendentes.variacao_mes_anterior,
      trendType: stats.startups_pendentes.tipo_variacao,
      className:
        'bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositiveTrend = card.trendType === 'aumento';
        const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown;
        const trendColor = isPositiveTrend ? 'text-green-600' : 'text-red-600';

        return (
          <Card
            key={card.title}
            className={`${card.className} transition-all hover:shadow-lg`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-5 w-5 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-muted-foreground text-xs">
                  {card.description}
                </p>
                {card.trend !== 0 && (
                  <div className="flex items-center gap-1">
                    <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                    <span className={`text-xs font-medium ${trendColor}`}>
                      {Math.abs(card.trend)}% em relação ao mês anterior
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
