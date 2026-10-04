import { BACKEND_URL } from "~/lib/api-config";

interface BackendSectorStat {
  group: string;
  name: string;
  count: number;
}

export async function loader() {
  try {
    const res = await fetch(`${BACKEND_URL}/marketplace/sector-stats`);
    const json = (await res.json()) as { data?: BackendSectorStat[] };
    return Response.json({ data: json?.data ?? [] });
  } catch {
    return Response.json({ data: [] });
  }
}
