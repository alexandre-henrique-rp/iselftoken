import { BACKEND_URL } from "~/lib/api-config";

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie") || "";

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/check-af2`, {
      method: "GET",
      headers: { cookie: cookieHeader },
    });
  } catch {
    return Response.json({ isAuthenticated: false, isAuthorized: false });
  }

  if (!res.ok) {
    let errorBody:
      | {
          message?: string;
          redirect?: string;
          detalhe?: { message?: string; redirect?: string };
        }
      | null = null;
    try {
      errorBody = await res.json();
    } catch {
      // ignore parse failure
    }

    // The backend signals "session present, but 2FA pending" via either
    // `redirect: "/2fa"` (often dropped by GlobalExceptionFilter) or a
    // 401 whose message mentions "2FA". Treat both as authenticated-but-not-authorized.
    const redirect = errorBody?.redirect ?? errorBody?.detalhe?.redirect;
    const message = errorBody?.message ?? errorBody?.detalhe?.message ?? "";
    const isPending2FA =
      res.status === 401 && (redirect === "/2fa" || /2FA/i.test(message));

    if (isPending2FA) {
      return Response.json({ isAuthenticated: true, isAuthorized: false });
    }

    // Backend 5xx: service indisponível — NÃO deslogar o usuário.
    // Retorna 200 com isAuthenticated:false para que o login loader e o
    // client query concordem (evita redirect loop /login → /home → /login).
    if (res.status >= 500) {
      return Response.json(
        { isAuthenticated: false, isAuthorized: false },
      );
    }

    return Response.json({ isAuthenticated: false, isAuthorized: false });
  }

  const body = (await res.json()) as { data?: { af2Verified?: boolean } };
  const af2Verified = body?.data?.af2Verified === true;

  return Response.json({
    isAuthenticated: true,
    isAuthorized: af2Verified,
  });
}
