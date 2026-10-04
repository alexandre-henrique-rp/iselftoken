export interface TestimonialSocials {
  youtube?: string | null;
  site?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
}

export interface Testimonial {
  id: number;
  quote: string;
  initials: string;
  name: string;
  role: string;
  avatarColor: string;
  socials?: TestimonialSocials;
}
