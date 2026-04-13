/**
 * Cria headers para requisições ao backend usando sessão via cookie.
 * Encaminha os cookies do request original para o backend.
 */
export function createSessionHeaders(request: Request): Headers {
  const cookieHeader = request.headers.get("Cookie");
  const headers = new Headers({ "Content-Type": "application/json" });
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }
  return headers;
}
