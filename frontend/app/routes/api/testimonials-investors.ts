import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";
import type { Testimonial } from "~/types/testimonial";

const AVATAR_COLORS = ["bg-primary", "bg-destructive", "bg-secondary"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || first.toUpperCase() || "??";
}

interface BackendDepoimento {
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
    const res = await fetch(`${BACKEND_URL}/depoimento?limit=12`);
    const json = (await res.json()) as { data?: BackendDepoimento[] };
    const items = json?.data ?? [];

    const data: Testimonial[] = items.map((d, i) => ({
      id: d.id,
      quote: d.mensagem,
      initials: getInitials(d.autor),
      name: d.autor,
      role:
        Array.isArray(d.cargos) && d.cargos.length > 0
          ? d.cargos.join(" • ")
          : "Investidor",
      avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
      socials: {
        youtube: d.youtube,
        site: d.site,
        linkedin: d.linkedin,
        instagram: d.instagram,
        facebook: d.facebook,
      },
    }));

    return Response.json({ data });
  } catch {
    return Response.json({ data: [] });
  }
}
