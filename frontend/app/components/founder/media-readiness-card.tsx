import { ImageIcon, FileText, Video, Check } from "lucide-react";
import { cn } from "~/lib/utils";

interface MediaReadinessCardProps {
  hasLogo: boolean;
  hasDeck: boolean;
  hasVideo: boolean;
}

export function MediaReadinessCard({ hasLogo, hasDeck, hasVideo }: MediaReadinessCardProps) {
  const items = [
    { icon: ImageIcon, label: "Logo", ready: hasLogo, required: true },
    { icon: FileText, label: "Pitch Deck", ready: hasDeck, required: false },
    { icon: Video, label: "Vídeo", ready: hasVideo, required: false },
  ];
  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/5 to-transparent border border-white/5 space-y-4">
      <span className="text-[9px] font-black uppercase tracking-widest text-primary">
        Mídias prontas
      </span>
      <div className="flex items-center justify-around gap-3">
        {items.map(({ icon: Icon, label, ready, required }) => (
          <div key={label} className="flex flex-col items-center gap-2 text-center">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center border relative",
              ready ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-white/5 border-white/10 text-muted-foreground"
            )}>
              <Icon className="w-5 h-5" />
              {ready && (
                <Check className="w-3 h-3 absolute -top-1 -right-1 bg-emerald-500 text-black rounded-full p-0.5" />
              )}
            </div>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              ready ? "text-foreground" : "text-muted-foreground/70"
            )}>
              {label}
              {required && !ready && <span className="text-red-400">*</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
