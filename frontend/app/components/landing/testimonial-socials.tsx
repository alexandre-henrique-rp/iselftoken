import { Globe } from "lucide-react";
import { cn } from "~/lib/utils";
import type { TestimonialSocials as Socials } from "~/types/testimonial";

const ICON_CONFIG: Array<{
  key: keyof Socials;
  src?: string;
  label: string;
}> = [
  { key: "linkedin", src: "/rede-sociais/linkedin-50.svg", label: "LinkedIn" },
  { key: "instagram", src: "/rede-sociais/instagram-50.svg", label: "Instagram" },
  { key: "youtube", src: "/rede-sociais/youtube-50.svg", label: "YouTube" },
  { key: "facebook", src: "/rede-sociais/facebook-50.svg", label: "Facebook" },
  { key: "site", label: "Site" },
];

export function TestimonialSocials({
  socials,
  className,
}: {
  socials?: Socials;
  className?: string;
}) {
  if (!socials) return null;

  const items = ICON_CONFIG.flatMap((cfg) => {
    const url = socials[cfg.key];
    return url ? [{ ...cfg, url }] : [];
  });

  if (items.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-2 mt-1.5", className)}>
      {items.map((it) => (
        <a
          key={it.key}
          href={it.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={it.label}
          className="w-4 h-4 inline-flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
        >
          {it.src ? (
            <img src={it.src} alt="" className="w-full h-full" />
          ) : (
            <Globe className="w-full h-full" />
          )}
        </a>
      ))}
    </div>
  );
}
