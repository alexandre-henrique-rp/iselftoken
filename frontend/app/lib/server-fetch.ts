export async function serverFetch(
  request: Request,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(request.url);
  const cookie = request.headers.get("cookie") ?? "";

  const headers = new Headers(init?.headers);
  if (cookie) headers.set("cookie", cookie);

  return fetch(`${url.origin}${path}`, {
    ...init,
    headers,
  });
}
