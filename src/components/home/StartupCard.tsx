import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Startup } from '@/data/home-data';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface StartupCardProps {
  startup: Startup;
  featured?: boolean;
}

export function StartupCard({ startup, featured = false }: StartupCardProps) {
  const progress = (startup.tokensAvailable / startup.tokensTotal) * 100;
  const soldPercentage = 100 - progress;

  return (
    <Link
      href={`/dashboard/campanha/${startup.id}`}
      className="group block h-full"
    >
      <Card
        className={`border-muted/40 bg-card hover:border-primary/50 h-full overflow-hidden transition-all duration-300 hover:shadow-lg ${featured ? 'hover:-translate-y-1' : ''}`}
      >
        {/* Image Header */}
        <div
          className={`relative w-full overflow-hidden ${featured ? 'aspect-video' : 'aspect-4/3'}`}
        >
          <Image
            src={startup.image}
            alt={startup.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80" />

          {/* Floating Logo */}
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-3">
            <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
              <Image
                src={startup.logo}
                alt={`Logo ${startup.name}`}
                fill
                className="object-contain p-1"
              />
            </div>
            <div className="text-white">
              <h3 className="text-lg leading-tight font-bold shadow-black drop-shadow-md">
                {startup.name}
              </h3>
              {featured && (
                <Badge
                  variant="secondary"
                  className="bg-primary/90 text-primary-foreground hover:bg-primary mt-1"
                >
                  Destaque
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="space-y-4 p-5">
          {/* Selos (Badges) */}
          <div className="flex gap-2">
            {startup.selos.slice(0, 3).map((selo, index) => (
              <div
                key={index}
                className="bg-muted flex h-8 w-8 items-center justify-center rounded-full p-1.5 shadow-sm"
                title="Selo de Qualidade"
              >
                <Image
                  src={selo}
                  alt="Selo"
                  width={20}
                  height={20}
                  className="h-full w-full object-contain"
                />
              </div>
            ))}
          </div>

          {/* Description */}
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {startup.description}
          </p>

          {/* Metrics */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Tokens Disponíveis</span>
              <span className="text-primary">
                {startup.tokensAvailable.toLocaleString()}
              </span>
            </div>
            <Progress value={soldPercentage} className="h-2" />
            <div className="text-muted-foreground flex justify-between text-xs">
              <span>{soldPercentage.toFixed(0)}% Vendido</span>
              <span>Total: {startup.tokensTotal.toLocaleString()}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/5 border-t p-4">
          <div className="flex w-full justify-end">
            <Button
              size="sm"
              className="gap-2 transition-transform group-hover:translate-x-1"
            >
              Investir <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
