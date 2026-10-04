import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({}: LoaderFunctionArgs) {
  try {
    const res = await fetch(`${BACKEND_URL}/seals`);
    const json = await res.json();
    return Response.json({ data: json?.data ?? [] });
  } catch {
    return Response.json({ data: [] });
  }
}
