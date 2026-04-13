import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const api = await fetch(`${process.env.API_URL}/auth`, {
    method: "POST",
    headers,
  });

  return api;
}
