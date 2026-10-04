import type { LoaderFunctionArgs } from "react-router";
import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const splat = params["*"] ?? "";
  if (!splat) {
    return new Response("Not Found", { status: 404 });
  }

  const upstream = `${BACKEND_URL}/files/${splat}`;
  const res = await fetch(upstream, {
    headers: { Accept: request.headers.get("accept") ?? "*/*" },
  });
  if (!res.ok || !res.body) {
    return new Response("Not Found", { status: 404 });
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
      "Content-Length": res.headers.get("content-length") ?? "",
    },
  });
}
