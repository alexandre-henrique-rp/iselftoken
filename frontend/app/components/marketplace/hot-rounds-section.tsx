import { ArrowRight } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router";
import { InitialsImage } from "~/components/ui/initials-image";
import { cn } from "~/lib/utils";
import type { StartupFeatured } from "~/types/startup-featured";
import { SealsRow } from "./category-visual";

const ROTATION_INTERVAL_MS = 5000;
const PAGE_TURN_MS = 1400;

export function HotRoundsSection({
  startups,
}: {
  startups: StartupFeatured[];
}) {
  const [order, setOrder] = useState<StartupFeatured[]>(startups);
  const [paused, setPaused] = useState(false);
  const [isTurning, setIsTurning] = useState(false);

  useEffect(() => {
    const incomingById = new Map(
      startups.map((startup) => [startup.id, startup]),
    );
    const currentIds = new Set(order.map((startup) => startup.id));
    const hasSameStartupSet =
      order.length === startups.length &&
      startups.every((startup) => currentIds.has(startup.id));

    if (hasSameStartupSet) {
      setOrder((current) =>
        current.map((startup) => incomingById.get(startup.id) ?? startup),
      );
      return;
    }

    setOrder(startups);
    setIsTurning(false);
  }, [startups]);

  useEffect(() => {
    if (paused || isTurning || order.length < 2) return;

    const id = window.setTimeout(() => {
      setIsTurning(true);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearTimeout(id);
  }, [isTurning, order.length, paused]);

  useEffect(() => {
    if (!isTurning) return;

    const id = window.setTimeout(() => {
      setOrder((prev) => {
        if (prev.length < 2) return prev;
        const [first, ...rest] = prev;
        return [...rest, first];
      });
      setIsTurning(false);
    }, PAGE_TURN_MS);

    return () => window.clearTimeout(id);
  }, [isTurning]);

  if (!startups.length) return null;
  const [focal, ...rest] = order;

  return (
    <section
      aria-label="Rodadas em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="text-primary font-bold text-[11px] tracking-widest uppercase mb-1 block">
            Momento agora
          </span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Rodadas Quentes
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1.5">
            Atualiza automaticamente a cada 5s com transição suave. Passe o
            mouse para pausar.
          </p>
        </div>
      </div>

      <div className="hot-rounds-track flex gap-6 items-center overflow-hidden pb-4">
        <FocalCard startup={focal} isLeaving={isTurning} />
        {rest.map((startup, index) => {
          const isPromoting = isTurning && index === 0;

          return (
            <Fragment key={startup.id}>
              {isPromoting && (
                <div aria-hidden="true" className="hot-rounds-promoting-slot" />
              )}
              {isPromoting ? (
                <PromotedPage startup={startup} />
              ) : (
                <SecondaryCard
                  startup={startup}
                  stackIndex={index}
                  stackSize={rest.length}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}

function FocalCard({
  startup,
  isLeaving = false,
}: {
  startup: StartupFeatured;
  isLeaving?: boolean;
}) {
  return (
    <article
      className={cn(
        "shrink-0 relative rounded-3xl overflow-hidden flex flex-col text-white",
        isLeaving && "hot-rounds-focal-leaving",
      )}
      style={{
        width: 400,
        height: 554,
        background:
          "linear-gradient(135deg, #d500f9 0%, #540063 55%, #1f031d 100%)",
        border: "1px solid rgba(213,0,249,0.5)",
        boxShadow:
          "0 20px 40px rgba(213,0,249,0.35), 0 0 60px rgba(213,0,249,0.18)",
        zIndex: 10,
      }}
    >
      <div className="h-40 shrink-0 overflow-hidden relative">
        <img
          src={startup.image}
          alt={startup.name}
          className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(213,0,249,0) 0%, rgba(84,0,99,0.55) 60%, rgba(31,3,29,1) 100%)",
          }}
        />
      </div>

      <div className="flex-1 p-6 flex flex-col gap-3 relative">
        <div className="-mt-10 relative z-20 flex items-center gap-3">
          <InitialsImage
            name={startup.name}
            src={startup.image}
            alt={startup.name}
            className="h-12 w-12 shrink-0 rounded-xl border border-white/20"
            fallbackClassName="bg-primary/20"
            fallbackTextClassName="text-sm font-black"
          />
          <h3
            className="font-black tracking-tighter leading-tight min-w-0 flex-1"
            style={{ fontSize: 24 }}
          >
            <span className="block truncate">{startup.name}</span>
          </h3>
        </div>

        <p
          className="text-[13px] text-white/80 leading-snug line-clamp-3"
          style={{ minHeight: "3.9em" }}
        >
          {startup.description}
        </p>

        <SealsRow seals={startup.seals} size={32} max={5} />

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1 text-[11px]">
          <Kpi label="Equity" value={startup.equity} />
          <Kpi label="Valuation" value={startup.valuation} />
          <Kpi
            label="Captado"
            value={startup.raised}
            sub={`/ ${startup.goal}`}
          />
          <Kpi label="Progresso" value={`${startup.progress}%`} highlight />
        </div>

        <div className="mt-auto">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-white/70 font-bold">
              Progresso
            </span>
            <span className="text-base font-black text-white">
              {startup.progress}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-black/40">
            <div
              className="h-full rounded-full kinetic-gradient"
              style={{
                width: `${startup.progress}%`,
                boxShadow: "0 0 12px rgba(213,0,249,0.7)",
              }}
            />
          </div>
        </div>

        <Link
          to={`/marketplace/startup/${encodeURIComponent(startup.slug)}`}
          className="w-full text-center py-3 bg-white text-[#1f031d] font-black uppercase tracking-widest text-xs rounded-xl inline-flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.98] transition-colors"
        >
          Investir Agora
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </article>
  );
}

function SecondaryCard({
  startup,
  stackIndex,
  stackSize,
}: {
  startup: StartupFeatured;
  stackIndex: number;
  stackSize: number;
}) {
  return (
    <Link
      to={`/marketplace/startup/${encodeURIComponent(startup.slug)}`}
      className="relative shrink-0 overflow-hidden rounded-2xl flex flex-col p-5 border border-white/5 hover:border-primary/30 transition-colors"
      style={{
        width: 200,
        height: 400,
        marginLeft: stackIndex === 0 ? 0 : -44,
        background: "linear-gradient(180deg, #14141a 0%, #08080c 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        filter: "brightness(0.75)",
        zIndex: stackSize - stackIndex,
      }}
    >
      <SecondaryCardContent startup={startup} />
    </Link>
  );
}

function SecondaryCardContent({ startup }: { startup: StartupFeatured }) {
  return (
    <div className="flex h-full flex-col">
      <InitialsImage
        name={startup.name}
        src={startup.image}
        alt={startup.name}
        className="mb-4 h-12 w-12 shrink-0 rounded-xl border border-white/20"
        fallbackClassName="bg-primary/20"
        fallbackTextClassName="text-sm font-black"
      />

      <h4 className="text-white font-black text-sm mb-1 leading-tight line-clamp-2">
        {startup.name}
      </h4>
      <p className="text-muted-foreground text-[9px] uppercase tracking-widest font-black">
        {startup.category ?? "STARTUP"}
      </p>

      <SealsRow seals={startup.seals} size={24} max={4} className="mt-3" />

      <div className="mt-auto">
        <div className="flex justify-between items-end mb-1.5">
          <span className="text-muted-foreground text-[9px] uppercase tracking-widest font-black">
            Captado
          </span>
          <span className="font-black text-2xl leading-none text-primary">
            {startup.progress}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
          <div
            className="h-full rounded-full kinetic-gradient"
            style={{ width: `${startup.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PromotedPage({ startup }: { startup: StartupFeatured }) {
  return (
    <Link
      to={`/marketplace/startup/${encodeURIComponent(startup.slug)}`}
      aria-label={`Ver detalhes de ${startup.name}`}
      className="hot-rounds-page-promoting"
    >
      <div className="hot-rounds-page-face hot-rounds-page-front">
        <div className="hot-rounds-page-front-card">
          <SecondaryCardContent startup={startup} />
        </div>
      </div>

      <div className="hot-rounds-page-face hot-rounds-page-back">
        <PromotedFocalContent startup={startup} />
      </div>
    </Link>
  );
}

function PromotedFocalContent({ startup }: { startup: StartupFeatured }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-3xl text-white">
      <div className="h-40 shrink-0 overflow-hidden relative">
        <img
          src={startup.image}
          alt=""
          className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(213,0,249,0) 0%, rgba(84,0,99,0.55) 60%, rgba(31,3,29,1) 100%)",
          }}
        />
      </div>

      <div className="flex-1 p-6 flex flex-col gap-3 relative">
        <div className="-mt-10 relative z-20 flex items-center gap-3">
          <InitialsImage
            name={startup.name}
            src={startup.image}
            alt={startup.name}
            className="h-12 w-12 shrink-0 rounded-xl border border-white/20"
            fallbackClassName="bg-primary/20"
            fallbackTextClassName="text-sm font-black"
          />
          <h3 className="font-black tracking-tighter leading-tight min-w-0 flex-1 text-2xl">
            <span className="block truncate">{startup.name}</span>
          </h3>
        </div>

        <p className="text-[13px] text-white/80 leading-snug line-clamp-3 min-h-[3.9em]">
          {startup.description}
        </p>

        <SealsRow seals={startup.seals} size={32} max={5} />

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1 text-[11px]">
          <Kpi label="Equity" value={startup.equity} />
          <Kpi label="Valuation" value={startup.valuation} />
          <Kpi
            label="Captado"
            value={startup.raised}
            sub={`/ ${startup.goal}`}
          />
          <Kpi label="Progresso" value={`${startup.progress}%`} highlight />
        </div>

        <div className="mt-auto">
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-[10px] uppercase tracking-widest text-white/70 font-bold">
              Progresso
            </span>
            <span className="text-base font-black text-white">
              {startup.progress}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-black/40">
            <div
              className="h-full rounded-full kinetic-gradient"
              style={{
                width: `${startup.progress}%`,
                boxShadow: "0 0 12px rgba(213,0,249,0.7)",
              }}
            />
          </div>
        </div>

        <div className="w-full text-center py-3 bg-white text-[#1f031d] font-black uppercase tracking-widest text-xs rounded-xl inline-flex items-center justify-center gap-2">
          Investir Agora
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[9px] text-white/70 uppercase tracking-[0.2em] font-bold mb-0.5">
        {label}
      </p>
      <p
        className={cn(
          "font-black text-base",
          highlight ? "text-[#ffd1ff]" : "text-white",
        )}
      >
        {value}
        {sub && (
          <span className="text-white/50 text-[10px] font-normal ml-1">
            {sub}
          </span>
        )}
      </p>
    </div>
  );
}
