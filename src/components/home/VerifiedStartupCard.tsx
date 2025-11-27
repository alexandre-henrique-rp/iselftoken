import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Startup } from '@/data/home-data';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface VerifiedStartupCardProps {
  startup: Startup;
}

export function VerifiedStartupCard({ startup }: VerifiedStartupCardProps) {
  return (
    <Link
      href={`/dashboard/campanha/${startup.id}`}
      className="group block h-full"
    >
      <Card className="relative h-full overflow-hidden border-blue-200/50 bg-slate-50/50 transition-all duration-300 group-hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-100/50 dark:border-blue-900/50 dark:bg-slate-950/50 dark:hover:border-blue-400/50 dark:hover:shadow-blue-900/20">
        {/* Imagem Header com Gradiente Azulado */}
        <div className="relative aspect-video w-full overflow-hidden">
          <Image
            src={startup.image}
            alt={startup.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

          {/* Informações Sobrepostas na Imagem */}
          <div className="absolute right-4 bottom-4 left-4 z-10">
            <div className="mb-2 flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-white/20 bg-white/10 shadow-lg backdrop-blur-md">
                <Image
                  src={startup.logo}
                  alt={`Logo ${startup.name}`}
                  fill
                  className="object-contain p-1"
                />
              </div>
              <div>
                <h3 className="text-lg leading-tight font-bold text-white transition-colors group-hover:text-blue-200">
                  {startup.name}
                </h3>
                <p className="text-xs font-medium text-blue-200/80">
                  Auditoria Completa
                </p>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="space-y-4 p-4">
          {/* Selo de Verificação (Entre Nome e Descrição) */}
          {startup.selos && startup.selos.length > 0 && (
            <div className="flex w-full justify-start pb-2">
              <div className="relative h-8 w-24">
                <Image
                  src={startup.selos[0]}
                  alt="Selo de Verificação"
                  fill
                  className="object-contain object-left"
                />
              </div>
            </div>
          )}

          {/* Descrição Curta */}
          <p className="text-muted-foreground line-clamp-2 min-h-10 text-sm">
            {startup.description}
          </p>

          {/* Dados em Grid */}
          <div className="border-border/50 grid grid-cols-2 gap-3 border-y border-dashed py-2">
            <div className="space-y-0.5">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Tokens
              </p>
              <p className="text-foreground text-sm font-bold">
                {startup.tokensAvailable.toLocaleString()}
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                Valuation
              </p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                R$ {(startup.tokensTotal * 1.5).toLocaleString()}{' '}
                {/* Simulação */}
              </p>
            </div>
          </div>

          {/* Botão de Ação */}
          <Button
            className="w-full bg-slate-900 text-white transition-all duration-300 group-hover:shadow-md hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-400"
            size="sm"
          >
            <span className="mr-2">Acessar Oportunidade</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}
