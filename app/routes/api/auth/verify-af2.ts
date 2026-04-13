import type { ActionFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function action({ request }: ActionFunctionArgs): Promise<Response> {
  const headers = createSessionHeaders(request);

  const formData = await request.formData();
  const codigo = formData.get("codigo");

  const api = await fetch(`${process.env.API_URL}/auth/verify-af2`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ codigo }),
  });

  return api;
}