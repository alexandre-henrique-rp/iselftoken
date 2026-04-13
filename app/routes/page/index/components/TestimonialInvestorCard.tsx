import type { Testimonial } from "~/types/homepage";

interface TestimonialInvestorCardProps {
  testimonial: Testimonial;
}

/**
 * @name TestimonialInvestorCard
 * @description Card de depoimento de investidores.
 *
 * @param {Testimonial} testimonial - Dados do depoimento exibido.
 *
 * @returns {JSX.Element} Card com avatar e descricao.
 */
export function TestimonialInvestorCard({
  testimonial,
}: TestimonialInvestorCardProps) {
  return (
    <article className="snap-center min-w-75 max-w-75 rounded-lg border border-border bg-card p-6 transition-all duration-300 hover:border-muted-foreground/40">
      <p className="text-sm italic leading-relaxed text-muted-foreground">
        "{testimonial.text}"
      </p>
      <div className="mt-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-blue-400">
          <span className="text-sm font-semibold text-white">
            {testimonial.initials}
          </span>
        </div>
        <div>
          <p className="font-medium text-foreground">{testimonial.name}</p>
          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
        </div>
      </div>
    </article>
  );
}
