import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const country = url.searchParams.get("country");
  const states = url.searchParams.get("states");

  const queryParams = new URLSearchParams();
  if (country) queryParams.append("country", country);
  if (states) queryParams.append("states", states);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/country${queryString}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  return Response.json(data);
}
