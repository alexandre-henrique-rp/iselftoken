import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers({ "Content-Type": "application/json" });
  const { cep } = params;

  const api = await fetch(
    `${process.env.API_BRASIL}/api/cep/v2/${cep}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
  
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
