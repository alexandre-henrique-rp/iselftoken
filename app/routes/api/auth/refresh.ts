import type { ActionFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function action({ request }: ActionFunctionArgs) {
  const headers = createSessionHeaders(request);
  const body = await request.json();

  const api = await fetch(`${process.env.API_URL}/auth/refresh`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return api;
}
