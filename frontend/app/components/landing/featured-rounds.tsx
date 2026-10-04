import { motion } from "framer-motion";
import { Link } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import { cn } from "~/lib/utils";
import type { StartupFeatured } from "~/types/startup-featured";
import { Carousel3D } from "./carousel-3d";

type Startup = StartupFeatured;

export function StartupCard({
  startup,
  isCenter,
}: {
  startup: Startup;
  isCenter: boolean;
}) {
  return (
    <div
      className={cn(
        "h-full rounded-[2.5rem] border overflow-hidden flex flex-col transition-colors duration-700",
        isCenter
          ? "bg-[#1f031d] border-primary/40 shadow-[0_0_100px_rgba(213,0,249,0.3)]"
          : "bg-card border-border/10",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden shrink-0",
          isCenter ? "h-52" : "h-44",
        )}
      >
        {startup.cover ? (
          <img
            src={startup.cover}
            alt={`Banner ${startup.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-[#1f031d] via-transparent to-transparent" />
      </div>

      <div
        className={cn(
          "p-5 md:p-6 flex-1 flex flex-col",
          isCenter && "pb-10 md:pb-12",
        )}
      >
        {/* Logo + Nome */}
        <div className="flex items-center gap-3 mb-3">
          <InitialsImage
            name={startup.name}
            src={startup.image}
            alt={startup.name}
            className="h-9 w-9 shrink-0 rounded-xl border border-white/10"
            fallbackClassName="bg-primary/20"
            fallbackTextClassName="text-xs font-black"
          />
          <h4
            className={cn(
              "font-black tracking-tighter transition-all truncate",
              isCenter ? "text-xl" : "text-lg",
            )}
          >
            {startup.name}
          </h4>
        </div>
        <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-10">
          {startup.description}
        </p>

        <div className="min-h-[28px] mb-4 flex items-center gap-1.5">
          {(startup.seals ?? []).map((seal) => (
            <img
              key={seal.slug}
              src={seal.imagePath}
              alt={seal.name}
              title={seal.name}
              className={cn(
                "object-contain transition-transform hover:scale-110",
                isCenter ? "w-8 h-8" : "w-7 h-7",
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-bold mb-1.5">
              Equity Disponível
            </p>
            <p
              className={cn(
                "font-black text-foreground transition-all",
                isCenter ? "text-2xl" : "text-xl",
              )}
            >
              {startup.equity}
            </p>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-bold mb-1.5">
              Valuation Post
            </p>
            <p
              className={cn(
                "font-black text-foreground transition-all",
                isCenter ? "text-2xl" : "text-xl",
              )}
            >
              {startup.valuation}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between items-end mb-3">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted-foreground uppercase font-bold mb-1">
                Total Arrecadado
              </span>
              <span
                className={cn(
                  "font-black text-foreground transition-all",
                  isCenter ? "text-lg" : "text-base",
                )}
              >
                {startup.raised}{" "}
                <span className="text-muted-foreground/40 text-xs font-normal">
                  / {startup.goal}
                </span>
              </span>
            </div>
            <span
              className={cn(
                "font-black text-primary transition-all",
                isCenter ? "text-2xl" : "text-xl",
              )}
            >
              {startup.progress}%
            </span>
          </div>
          <div className="h-3 bg-white/5 rounded-full p-[2px] overflow-hidden border border-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${startup.progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
              className="h-full kinetic-gradient rounded-full kinetic-glow"
            />
          </div>
        </div>

        <Link
          to={`/startup/${encodeURIComponent(startup.slug)}`}
          state={{ startup }}
          className={cn(
            "m-auto w-full py-4 font-black uppercase tracking-widest text-sm rounded-2xl transition-all duration-300 text-center block",
            isCenter
              ? "bg-[#b026ff] text-white shadow-[0_10px_40px_rgba(176,38,255,0.4)] hover:scale-[1.02] active:scale-[0.98] neon-glow"
              : "border border-primary/40 text-primary hover:bg-primary/10",
          )}
        >
          Ver Startup
        </Link>
      </div>
    </div>
  );
}

export function FeaturedRounds({ startups }: { startups: Startup[] }) {
  return (
    <Carousel3D<Startup>
      items={startups}
      title="Rodadas em Destaque"
      subtitle="Oportunidades exclusivas selecionadas por especialistas"
      sectionClassName="bg-card/30"
      height="650px"
      maxWidth="420px"
      renderItem={(startup, isCenter) => (
        <StartupCard startup={startup} isCenter={isCenter} />
      )}
    />
  );
}
