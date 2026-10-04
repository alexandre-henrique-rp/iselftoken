import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category") ?? "All";
  try {
    const res = await fetch(
      `${BACKEND_URL}/marketplace/opportunities?category=${encodeURIComponent(category)}`,
    );
    const json = await res.json();
    return Response.json({ data: json?.data ?? [] });
  } catch {
    return Response.json({ data: [] });
  }
}
