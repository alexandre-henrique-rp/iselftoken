import { ExternalLink, Linkedin, Youtube } from "lucide-react";
import type { Testimonial } from "~/types/homepage";

interface TestimonialFounderCardProps {
  testimonial: Testimonial;
}

/**
 * @name TestimonialFounderCard
 * @description Card de depoimento de fundadores com redes sociais.
 *
 * @param {Testimonial} testimonial - Dados do depoimento exibido.
 *
 * @returns {JSX.Element} Card com avatar e links sociais.
 */
export function TestimonialFounderCard({
  testimonial,
}: TestimonialFounderCardProps) {
  return (
    <article className="snap-center min-w-86 max-w-86 rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-muted-foreground/40">
      <p className="text-sm italic leading-relaxed text-muted-foreground">
        "{testimonial.text}"
      </p>
      <div className="mt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-fuchsia-600 to-fuchsia-400">
            <span className="text-sm font-semibold text-foreground">
              {testimonial.initials}
            </span>
          </div>
          <div>
            <p className="font-medium text-foreground">{testimonial.name}</p>
            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {testimonial.linkedin && (
            <a
              href={testimonial.linkedin}
              target="_blank"
              rel="noreferrer"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          )}
          {testimonial.youtube && (
            <a
              href={testimonial.youtube}
              target="_blank"
              rel="noreferrer"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="YouTube"
            >
              <Youtube className="h-4 w-4" />
            </a>
          )}
          {testimonial.website && (
            <a
              href={testimonial.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Website"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
