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
export function ProfileCard2({ data }: { data: ProfileCardData }) {
  return (
    <Card className="overflow-hidden border border-gray-400 bg-gray-300 text-card-foreground shadow-sm dark:bg-background dark:border-border">
      <CardContent className="p-2.5">
        {/* Header: Logo + Nome + Tags */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg border border-border bg-background p-1">
              <Image 
                src={data.logo} 
                alt={`Logo da ${data.name}`}
                width={40} 
                height={40} 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground truncate">{data.name}</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  {data.categoryLabel}
                </span>
      
              </div>
            </div>
            {/* Selos ao lado direito */}
            <div className="flex items-center gap-0.5">
              {data.selos.slice(0, 2).map((selo) => (
                <div key={selo.id} className="flex-shrink-0 object-contain rounded-2xl border border-muted/70 bg-muted/20 p-2">
                  <Image 
                    src={selo.image} 
                    alt={selo.label} 
                    width={20} 
                    height={20}
                    title={selo.label}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid de Métricas Principais */}
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {/* Valuation */}
          <div className="rounded-lg border border-border bg-green-50 dark:bg-green-900/20 p-1 text-center">
            <DollarSign className="h-3 w-3 text-green-600 mx-auto mb-0.5" />
            <p className="text-xs font-bold text-foreground leading-tight">
              {data.valuationLabel}
            </p>
            <span className="text-xs text-muted-foreground">Valuation</span>
          </div>
          
          {/* Investidores */}
          <div className="rounded-lg border border-border bg-blue-50 dark:bg-blue-900/20 p-1 text-center">
            <Users className="h-3 w-3 text-blue-600 mx-auto mb-0.5" />
            <p className="text-xs font-bold text-foreground">
              {data.investorsCount}
            </p>
            <span className="text-xs text-muted-foreground">Investidores</span>
          </div>
          
          {/* Equity */}
          <div className="rounded-lg border border-border bg-orange-50 dark:bg-orange-900/20 p-1 text-center">
            <PieChart className="h-3 w-3 text-orange-600 mx-auto mb-0.5" />
            <p className="text-xs font-bold text-foreground">
              {data.equityOfferedLabel}
            </p>
            <span className="text-xs text-muted-foreground">Equity</span>
          </div>
        </div>

        {/* Progresso */}
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium text-foreground text-xs">
              {data.raisedLabel} de {data.goalLabel}
            </span>
          </div>
          <Progress value={data.percent} className="h-1.5 [&>div]:bg-blue-600" />
          <div className="flex items-center justify-between text-xs mt-0.5">
            <span className="text-muted-foreground">{data.collectedLabel}</span>
            <span className="text-red-400">{data.timeLeftLabel}</span>
          </div>
        </div>

        {/* Footer de ação */}
        <div className="mt-3 grid grid-cols-2 gap-1.5">
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
