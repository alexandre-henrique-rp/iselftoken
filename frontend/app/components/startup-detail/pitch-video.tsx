import React from "react";
import { Play } from "lucide-react";

interface PitchVideoProps {
  thumbnail: string;
}

export function PitchVideo({ thumbnail }: PitchVideoProps) {
  return (
    <section className="relative aspect-video rounded-3xl overflow-hidden group shadow-[0px_24px_48px_rgba(84,0,99,0.25)] border border-white/5">
      <img 
        className="w-full h-full object-cover grayscale brightness-[0.4] group-hover:scale-105 group-hover:brightness-50 transition-all duration-1000" 
        src={thumbnail}
        alt="Futuristic Operations Center"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
        <button className="flex flex-col items-center gap-6 group">
          <div className="w-24 h-24 rounded-full kinetic-gradient flex items-center justify-center text-black shadow-[0_0_40px_rgba(240,132,255,0.6)] group-hover:scale-110 transition-all duration-500 relative">
            <div className="absolute inset-0 rounded-full animate-ping bg-primary/40 opacity-20"></div>
            <Play className="w-10 h-10 fill-current ml-1" />
          </div>
          <span className="text-xs font-black tracking-[0.4em] uppercase text-white drop-shadow-lg">Assistir Pitch</span>
        </button>
      </div>
    </section>
  );
}
