import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, DollarSign, PieChart } from "lucide-react";

export type ProfileCardData = {
  id: string;
  name: string;
  logo: string; // Logo da empresa
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
  equityOfferedLabel: string; // ex: 15%
  selos: {
    id: string; // ex: 1
    label: string; // ex: Sustentabilidade
    image: string; // ex: string base64
  }[];
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
        </div>
      </CardHeader>

      <CardContent className="p-5">
        {/* Título e descrição */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg border border-border bg-background p-1">
            <Image 
              src={data.logo} 
              alt={`Logo da ${data.name}`}
              width={48} 
              height={48} 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">{data.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {data.categoryLabel}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                {data.stageLabel}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground h-10 leading-5 line-clamp-2 overflow-hidden">
          {data.description}
        </p>

        {/* selos */}
        <div className="flex items-center gap-1.5 mt-2 h-10 overflow-x-auto scrollbar-hide">
          {data.selos.map((selo) => (
            <div key={selo.id} className="flex-shrink-0">
              <Image 
                src={selo.image} 
                alt={selo.label} 
                width={32} 
                height={32} 
                className="object-contain rounded-md bg-muted/20 p-1 hover:bg-muted/40 transition-colors"
                title={selo.label}
              />
            </div>
          ))}
        </div>

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
        <div className="mt-5 space-y-4">
          {/* Valuation - Destaque principal */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">Valuation</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {data.valuationLabel}
            </p>
          </div>

          {/* Grid 2x1 para Tokens e Equity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-muted-foreground">Investidores</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {data.investorsCount}
              </p>
            </div>
            
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="h-4 w-4 text-orange-600" />
                <span className="text-xs font-medium text-muted-foreground">Equity</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {data.equityOfferedLabel}
              </p>
            </div>
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
