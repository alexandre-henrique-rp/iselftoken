import type { LoaderFunctionArgs } from "react-router";
import { createSessionHeaders } from "~/lib/session-headers";

export async function loader({ request }: LoaderFunctionArgs): Promise<Response> {
  const headers = createSessionHeaders(request);

  const api = await fetch(`${process.env.API_URL}/auth/check-af2`, {
    method: "GET",
    headers,
  });

  return api;
}
