import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  // Encaminhar cookie da requisição para o backend
  const cookieHeader = request.headers.get("Cookie");
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const api = await fetch(`${process.env.API_URL}/users/me`, {
    method: "GET",
    headers,
  });

  const data = await api.json();

  if (!api.ok || data.error) {
    return new Response(JSON.stringify(data), {
      status: api.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
