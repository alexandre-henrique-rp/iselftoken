import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

export type ProfileCardData = {
  id: string;
  name: string;
  categoryLabel: string; // ex: Sustentabilidade
  stageLabel: string; // ex: Série A
  trending?: boolean;
  endingSoon?: boolean;
  description: string;
  image: string;
  raisedLabel: string; // ex: R$ 1.8M
  goalLabel: string; // ex: R$ 2.5M
  percent: number; // 0..100
  collectedLabel: string; // ex: 72% arrecadado
  timeLeftLabel: string; // ex: 3 dias restantes
  valuationLabel: string; // ex: R$ 15M
  investorsCount: number; // ex: 142
};

// ProfileCard alinhado ao layout do exemplo fornecido
export function ProfileCard({ data }: { data: ProfileCardData }) {
  return (
    <Card className="overflow-hidden border border-gray-400 bg-gray-300 text-card-foreground shadow-sm dark:bg-background dark:border-border">
      <CardHeader className="p-0">
        <div className="relative aspect-[16/6] bg-muted">
          <Image
            src={data.image}
            alt={data.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 60vw"
            className="object-cover"
          />
          {/* Badges topo-esquerda */}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className="border-border bg-background/70 text-foreground">
              {data.stageLabel}
            </Badge>
            {data.trending && (
              <Badge className="bg-green-600 text-white">Trending</Badge>
            )}
            {data.endingSoon && (
              <Badge className="bg-red-700 text-white">Encerrando</Badge>
            )}
          </div>
          {/* Badge topo-direita */}
          <div className="absolute top-3 right-3">
            <Badge
              variant="outline"
              className="border-border bg-background/60 text-xs text-muted-foreground"
            >
              {data.categoryLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {/* Título e descrição */}
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold text-foreground">{data.name}</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{data.description}</p>

        {/* Progresso */}
        <div className="mt-5 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span className="font-medium text-foreground">
              {data.raisedLabel} de {data.goalLabel}
            </span>
          </div>
          <Progress value={data.percent} className="[&>div]:bg-blue-600" />
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{data.collectedLabel}</span>
            <span className="text-red-400">{data.timeLeftLabel}</span>
          </div>
        </div>

        {/* Métricas */}
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Valuation</p>
            <p className="text-sm font-medium text-foreground">
              {data.valuationLabel}
            </p>
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Investidores
            </p>
            <p className="text-sm font-medium text-foreground">
              {data.investorsCount}
            </p>
          </div>
        </div>

        {/* Footer de ação */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            asChild
            variant="outline"
            className="border-border bg-background text-foreground hover:bg-muted"
          >
            <Link href="#">Ver detalhes</Link>
          </Button>
          <Button asChild className="bg-[#34a853] hover:bg-[#34a853]/95 text-white">
            <Link href="/login">Investir agora</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
