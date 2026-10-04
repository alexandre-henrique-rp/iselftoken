import { BACKEND_URL } from "~/lib/api-config";
import type { CuratedPick } from "~/types/curated-pick";

export async function loader() {
  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/curated-picks`);
    const json = (await res.json()) as { data?: CuratedPick[] };
    return Response.json({ data: json?.data ?? [] });
  } catch {
    return Response.json({ data: [] });
  }
}
