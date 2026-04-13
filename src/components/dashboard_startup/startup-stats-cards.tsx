import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Startup } from '@/types/startup';
import { AlertCircle, Building, CheckCircle, Target } from 'lucide-react';

interface StartupStatsCardsProps {
  startups?: Startup[];
}

export function StartupStatsCards({ startups = [] }: StartupStatsCardsProps) {
  // Calcular métricas baseadas nos dados reais das startups
  const totalStartups = startups.length;
  const startupsAtivas = startups.filter(
    (s) => s.status === 'Ativa' || s.status === 'Aprovada',
  ).length;
  const startupsComPendencia = startups.filter(
    (s) => s.status !== 'Ativa' && s.status !== 'Aprovada',
  ).length;
  const campanhasAtivas = startups.reduce((total, startup) => {
    return total + startup.campanha.filter((c) => c.status === 'Ativa').length;
  }, 0);

  const cards = [
    {
      title: 'Total de Startups',
      value: totalStartups.toString(),
      description: 'Startups registradas na plataforma',
      icon: Building,
      gradient: 'bg-linear-to-br from-purple-600/20 to-pink-600/20',
      borderColor: 'border-purple-500/30',
      iconBg: 'bg-linear-to-br from-purple-600 to-pink-600',
      iconColor: 'text-white',
      valueColor: 'text-purple-600',
    },
    {
      title: 'Startups Ativas',
      value: startupsAtivas.toString(),
      description: 'Startups aprovadas e operando',
      icon: CheckCircle,
      gradient: 'bg-linear-to-br from-green-600/20 to-emerald-600/20',
      borderColor: 'border-green-500/30',
      iconBg: 'bg-linear-to-br from-green-600 to-emerald-600',
      iconColor: 'text-white',
      valueColor: 'text-green-600',
    },
    {
      title: 'Startups com Pendência',
      value: startupsComPendencia.toString(),
      description: 'Aguardando análise ou com restrições',
      icon: AlertCircle,
      gradient: 'bg-linear-to-br from-orange-600/20 to-amber-600/20',
      borderColor: 'border-orange-500/30',
      iconBg: 'bg-linear-to-br from-orange-600 to-amber-600',
      iconColor: 'text-white',
      valueColor: 'text-orange-600',
    },
    {
      title: 'Campanhas Ativas',
      value: campanhasAtivas.toString(),
      description: 'Campanhas de captação em andamento',
      icon: Target,
      gradient: 'bg-linear-to-br from-blue-600/20 to-cyan-600/20',
      borderColor: 'border-blue-500/30',
      iconBg: 'bg-linear-to-br from-blue-600 to-cyan-600',
      iconColor: 'text-white',
      valueColor: 'text-blue-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card
            key={card.title}
            className={`relative overflow-hidden border ${card.borderColor} ${card.gradient} shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl`}
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-white/5" />
            <div className="absolute bottom-0 left-0 h-16 w-16 -translate-x-4 translate-y-4 rounded-full bg-white/5" />

            <CardHeader className="relative z-10 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`rounded-xl p-2.5 ${card.iconBg} shadow-lg`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative z-10 pt-0">
              <div className="space-y-3">
                <div className="flex items-baseline">
                  <span className={`text-3xl font-bold ${card.valueColor}`}>
                    {card.value}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
