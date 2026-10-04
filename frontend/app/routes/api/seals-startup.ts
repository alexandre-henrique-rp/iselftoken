import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id) return Response.json({ data: [] });
  try {
    const res = await fetch(`${BACKEND_URL}/seals/startup/${encodeURIComponent(id)}`);
    const json = await res.json();
    return Response.json({ data: json?.data ?? [] });
  } catch {
    return Response.json({ data: [] });
  }
}
