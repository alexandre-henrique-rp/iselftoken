import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StartupTypes } from '@/types/ProfileTypes';

export type ProfileCardData = {
  data: StartupTypes.getAllStartups;
};

// ProfileCard alinhado ao layout do exemplo fornecido
export function ProfileCard({ data }: ProfileCardData) {
  return (
    <Card className="dark:bg-card text-card-foreground !gap-3 overflow-hidden rounded-xl border border-blue-700 bg-zinc-100 !py-3 shadow-sm">
      <CardHeader className="p-0">
        <div className="bg-muted relative aspect-[16/9]">
          <Image
            src={data.image}
            alt={data.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 60vw"
            className="object-cover"
          />
        </div>
      </CardHeader>

      <CardContent className="px-5 pt-3 pb-5">
        {/* Título e descrição */}
        <div className="flex items-center gap-3">
          <div className="border-border bg-background h-24 w-24 flex-shrink-0 rounded-lg border p-1">
            <Image
              src={data.logo}
              alt={`Logo da ${data.name}`}
              width={48}
              height={48}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground truncate text-lg font-semibold">
              {data.name}
            </h3>
          </div>
        </div>
        <p className="text-muted-foreground mt-1 line-clamp-2 h-10 overflow-hidden text-sm leading-5">
          {data.description}
        </p>

        {/* selos */}
        <div className="scrollbar-hide mt-2 flex h-10 items-center gap-1.5 overflow-x-auto">
          {data.selos.map((selo) => (
            <div key={selo.id} className="flex-shrink-0">
              <Image
                src={selo.image}
                alt={selo.label}
                width={32}
                height={32}
                className="bg-muted/20 hover:bg-muted/40 rounded-md object-contain p-1 transition-colors"
                title={selo.label}
              />
            </div>
          ))}
        </div>

        {/* Divisor estético */}
        <div className="mt-4 border-t border-[#d500f9] pt-4" />

        {/* Métricas simples */}
        <div className="mt-4 flex justify-between gap-3 px-4">
          <div>
            <span className="text-muted-foreground text-xs font-medium">
              Equity ofertado
            </span>
            <p className="text-foreground mt-1 text-sm font-semibold">
              {data.equityPercentage}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs font-medium">
              Tokens restantes
            </span>
            <p className="text-foreground mt-1 text-sm font-semibold">
              {data.tokensRemaining ? data.tokensRemaining : '—'}
            </p>
          </div>
        </div>

        {/* Ação */}
        <div className="mt-6">
          <Button
            asChild
            className="w-full bg-[#d500f9] text-white hover:bg-[#d500f9]/90"
          >
            <Link href={`/startup/${data.id}`}>Ver oferta</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
