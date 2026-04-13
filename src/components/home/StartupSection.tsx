import { Button } from '@/components/ui/button';
import { EmblaCarousel, EmblaSlide } from '@/components/ui/carousel-embla';
import { Startup } from '@/data/home-data';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { StartupCard } from './StartupCard';

interface StartupSectionProps {
  title: string;
  startups: Startup[];
  layout?: 'grid' | 'carousel';
  viewAllLink?: string;
  renderCard?: (startup: Startup) => React.ReactNode;
  className?: string;
}

export function StartupSection({
  title,
  startups,
  layout = 'carousel',
  viewAllLink = '#',
  renderCard,
  className,
}: StartupSectionProps) {
  return (
    <section className="space-y-6 py-8">
      <div className="flex items-center justify-between px-4 md:px-0">
        <h2 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h2>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-primary hidden gap-2 sm:flex"
          asChild
        >
          <a href={viewAllLink}>
            Ver todos <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </div>

      {layout === 'grid' ? (
        <div
          className={cn(
            'grid grid-cols-1 gap-6 px-4 sm:grid-cols-2 md:px-0 lg:grid-cols-3 xl:grid-cols-3',
            className,
          )}
        >
          {startups.map((startup) => (
            <div key={startup.id} className="h-full">
              {renderCard ? (
                renderCard(startup)
              ) : (
                <StartupCard startup={startup} featured />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full px-4 md:px-0">
          <EmblaCarousel showArrows options={{ align: 'start', loop: true }}>
            {startups.map((startup) => (
              <EmblaSlide
                key={startup.id}
                className="sm:flex-[0_0_50%] lg:flex-[0_0_33.33%] xl:flex-[0_0_25%]"
              >
                <div className="h-full p-1">
                  {renderCard ? (
                    renderCard(startup)
                  ) : (
                    <StartupCard startup={startup} />
                  )}
                </div>
              </EmblaSlide>
            ))}
          </EmblaCarousel>
        </div>
      )}

      <div className="flex justify-center sm:hidden">
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-primary gap-2"
          asChild
        >
          <a href={viewAllLink}>
            Ver todos <ArrowRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </section>
  );
}
