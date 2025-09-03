import Image from 'next/image';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  tokensRemainingLabel?: string; // ex: 1.200
  selos: {
    id: string; // ex: 1
    label: string; // ex: Sustentabilidade
    image: string; // ex: string base64
  }[];
};

// ProfileCard alinhado ao layout do exemplo fornecido
export function ProfileCard2({ data }: { data: ProfileCardData }) {
  return (
    <Card className="overflow-hidden rounded-xl border border-blue-700 bg-zinc-100 dark:bg-card text-card-foreground shadow-sm !py-2">
      <CardContent className="px-5 py-4">
        {/* Header compacto: Logo + Nome */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-24 h-24 rounded-lg border border-border bg-background p-1">
            <Image 
              src={data.logo} 
              alt={`Logo da ${data.name}`}
              width={64} 
              height={64} 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground truncate">{data.name}</h3>
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

        {/* Divisor */}
        <div className="mt-4 pt-4 border-t border-[#d500f9]" />

        {/* Métricas simples */}
        <div className="mt-4 flex justify-between gap-3 px-4">
          <div className="">
            <span className="text-xs font-medium text-muted-foreground">Equity ofertado</span>
            <p className="mt-1 text-sm font-semibold text-foreground">{data.equityOfferedLabel}</p>
          </div>
          <div className="">
            <span className="text-xs font-medium text-muted-foreground">Tokens restantes</span>
            <p className="mt-1 text-sm font-semibold text-foreground">{data.tokensRemainingLabel ?? '—'}</p>
          </div>
        </div>

        {/* Ação */}
        <div className="mt-6">
          <Button asChild className="w-full bg-[#d500f9] hover:bg-[#d500f9]/90 text-white">
            <Link href="#">Ver oferta</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
