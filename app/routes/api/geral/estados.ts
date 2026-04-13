import type { LoaderFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function loader({ request }: LoaderFunctionArgs) {
  const headers = createSessionHeaders(request);
  const params = request.url.split("/").pop();

  const api = await fetch(`${process.env.API_URL}/country?country=${params}`, {
    method: "GET",
    headers,
  });

  const data = await api.json();

  if (!api.ok || data.error) {
    return new Response(JSON.stringify(data), {
      status: api.status,
      headers,
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers,
  });
}
