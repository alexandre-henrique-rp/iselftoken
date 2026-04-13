import type { ActionFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function action({ request }: ActionFunctionArgs) {
  const headers = createSessionHeaders(request);

  const api = await fetch(`${process.env.API_URL}/auth/logout`, {
    method: "POST",
    headers,
  });

  return api;
}
