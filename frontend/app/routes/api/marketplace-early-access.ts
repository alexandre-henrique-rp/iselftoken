import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";
import type { EarlyAccessOpportunity } from "~/types/early-access-opportunity";
import type { StartupCardSeal } from "~/types/startup-featured";

interface BackendOpportunity {
  id: number;
  name: string;
  category?: string | null;
  image?: string | null;
  progress: number;
  raised: string;
  goal: string;
  seals?: StartupCardSeal[];
  deadline?: string | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "10";

  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/opportunities?limit=${limit}`);
    const json = (await res.json()) as { data?: BackendOpportunity[] };
    const items = json?.data ?? [];

    const data: EarlyAccessOpportunity[] = items.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category ?? "OTHER",
      image: s.image ?? null,
      progress: s.progress,
      raised: s.raised,
      goal: s.goal,
      seals: s.seals ?? [],
      deadline: s.deadline ?? null,
    }));

    return Response.json({ data });
  } catch {
    return Response.json({ data: [] });
  }
}
