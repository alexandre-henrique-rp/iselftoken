import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";
import type { Testimonial } from "~/types/testimonial";

const AVATAR_COLORS = ["bg-primary", "bg-secondary", "bg-destructive"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || first.toUpperCase() || "??";
}

interface BackendOpinion {
  id: number;
  mensagem: string;
  autor: string;
  cargos?: string[] | null;
  youtube?: string | null;
  site?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  facebook?: string | null;
}

export async function loader({}: LoaderFunctionArgs) {
  try {
    const res = await fetch(`${BACKEND_URL}/startup-opinion?limit=12`);
    const json = (await res.json()) as { data?: BackendOpinion[] };
    const opinions = json?.data ?? [];

    const data: Testimonial[] = opinions.map((o, i) => ({
      id: o.id,
      quote: o.mensagem,
      initials: getInitials(o.autor),
      name: o.autor,
      role:
        Array.isArray(o.cargos) && o.cargos.length > 0
          ? o.cargos.join(" • ")
          : "Founder",
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      socials: {
        youtube: o.youtube,
        site: o.site,
        linkedin: o.linkedin,
        instagram: o.instagram,
        facebook: o.facebook,
      },
    }));

    return Response.json({ data });
  } catch {
    return Response.json({ data: [] });
  }
}
