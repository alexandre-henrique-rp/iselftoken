import { Card } from '@/components/ui/card';
import { Startup } from '@/data/home-data';
import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface MinimalStartupCardProps {
  startup: Startup;
}

export function MinimalStartupCard({ startup }: MinimalStartupCardProps) {
  return (
    <Link
      href={`/dashboard/campanha/${startup.id}`}
      className="group block h-full"
    >
      <Card className="border-border/40 bg-card/50 hover:border-primary/20 hover:bg-card relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        {/* Ícone de ação no hover (canto superior direito) */}
        <div className="absolute top-2 right-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
          <ArrowUpRight className="text-muted-foreground h-4 w-4" />
        </div>

        {/* Logo Container */}
        <div className="border-border/50 relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white p-2 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:shadow-md">
          <Image
            src={startup.logo}
            alt={`Logo ${startup.name}`}
            fill
            className="object-contain p-1"
          />
        </div>

        {/* Informações */}
        <div className="flex w-full flex-col items-center gap-1">
          <h3 className="text-foreground group-hover:text-primary w-full truncate text-sm font-semibold transition-colors">
            {startup.name}
          </h3>
          <p className="text-muted-foreground/80 line-clamp-2 px-2 text-xs">
            {startup.description}
          </p>
        </div>

        {/* Barra decorativa inferior (opcional) */}
        <div className="bg-primary absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full" />
      </Card>
    </Link>
  );
}
