import { Quote } from "lucide-react";
import { cn } from "~/lib/utils";
import { Carousel3D } from "./carousel-3d";
import { TestimonialSocials } from "./testimonial-socials";
import type { Testimonial } from "~/types/testimonial";

function TestimonialCard({ testimonial, isCenter }: { testimonial: Testimonial; isCenter: boolean }) {
  return (
    <div
      className={cn(
        "h-full w-full rounded-[2.5rem] italic leading-relaxed relative border flex flex-col justify-between",
        isCenter
          ? "bg-card p-8 text-base border-primary/30 shadow-[0_0_50px_rgba(213,0,249,0.1)]"
          : "bg-card/80 p-8 text-sm border-white/5"
      )}
    >
      <Quote
        className={cn(
          "absolute opacity-20",
          isCenter ? "top-4 right-4 w-10 h-10 text-primary/40" : "top-6 right-6 w-12 h-12 text-secondary/20"
        )}
      />
      <div className="relative z-10">{testimonial.quote}</div>
      <div className={cn("flex items-center gap-3 not-italic", isCenter ? "mt-8 gap-5" : "mt-6")}>
        <div
          className={cn(
            "rounded-full flex items-center justify-center font-bold text-white",
            testimonial.avatarColor,
            isCenter ? "w-12 h-12 font-black text-base" : "w-10 h-10"
          )}
        >
          {testimonial.initials}
        </div>
        <div>
          <p className={cn("font-bold text-sm", isCenter && "font-black text-base")}>{testimonial.name}</p>
          <p
            className={cn(
              isCenter ? "text-xs text-primary font-bold uppercase tracking-widest" : "text-[10px] text-muted-foreground"
            )}
          >
            {testimonial.role}
          </p>
          <TestimonialSocials socials={testimonial.socials} />
        </div>
      </div>
    </div>
  );
}

export function TestimonialsStartups({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <Carousel3D<Testimonial>
      items={testimonials}
      title="Opinião das Startups"
      subtitle="O impacto da descentralização na visão de quem constrói"
      sectionClassName="bg-card/30"
      height="320px"
      renderItem={(testimonial, isCenter) => (
        <TestimonialCard testimonial={testimonial} isCenter={isCenter} />
      )}
    />
  );
}
