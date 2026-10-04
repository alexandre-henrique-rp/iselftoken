import { Link } from "react-router";

export function Hero() {
  return (
    <section className="relative min-h-[640px] lg:min-h-[70vh] flex flex-col justify-center px-6 md:px-12 lg:px-16 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-20 -left-20 w-64 h-64 bg-secondary/10 rounded-full blur-[80px]" />

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="max-w-5xl">
          <span className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-primary mb-4 md:mb-6 block font-bold">
            Equity Crowdfunding
          </span>
          <h1 className="text-[clamp(2.75rem,9vw,5.5rem)] lg:text-[clamp(4rem,10vw,7rem)] font-black text-primary leading-[0.85] tracking-[-0.04em] mb-6 md:mb-8">
            iSelfToken
          </h1>
          <h2 className="text-xl md:text-2xl lg:text-[2.25rem] font-light text-muted-foreground tracking-tight mb-4 md:mb-6 max-w-4xl">
            The Evolution of{" "}
            <span className="text-foreground font-semibold">Equity Crowdfunding</span>.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground/80 mb-8 md:mb-10 max-w-2xl leading-relaxed">
            Invista em startups ou capte recursos para transformar seu negócio.
          </p>
          <div className="flex flex-wrap gap-4 md:gap-5">
            <Link to="/login" className="px-6 md:px-8 py-3.5 md:py-4 bg-primary text-white font-black uppercase tracking-wider text-xs md:text-sm rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(213,0,249,0.3)] inline-block text-center">
              Quero captar investimento
            </Link>
            <Link to="/login" className="px-6 md:px-8 py-3.5 md:py-4 bg-black/40 border border-white/10 hover:bg-white/10 text-white/80 font-black uppercase tracking-wider text-xs md:text-sm rounded-xl hover:scale-105 active:scale-95 transition-all backdrop-blur-sm inline-block text-center">
              Quero investir
            </Link>
          </div>
        </div>
      </div>

      <div className="absolute right-0 bottom-0 pointer-events-none select-none opacity-5 text-[11rem] lg:text-[14rem] font-black leading-none">
        IST
      </div>
    </section>
  );
}
