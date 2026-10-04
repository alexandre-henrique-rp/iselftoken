import { BACKEND_URL } from "~/lib/api-config";

const RESEND_ERROR_MESSAGE =
  "Não foi possível reenviar o código de verificação. Tente novamente.";
const AUTH_SERVICE_ERROR_MESSAGE =
  "Serviço de autenticação indisponível no momento. Tente novamente em instantes.";

type ApiResponseBody = {
  error?: unknown;
  message?: unknown;
};

function asApiResponseBody(value: unknown): ApiResponseBody | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as ApiResponseBody;
}

function errorResponse(status: number, message: string) {
  return Response.json(
    {
      error: true,
      message,
      codigo: status,
    },
    { status },
  );
}

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/auth/newcode`, {
      method: "GET",
      headers: {
        ...(cookieHeader && { cookie: cookieHeader }),
      },
    });
  } catch {
    return errorResponse(503, AUTH_SERVICE_ERROR_MESSAGE);
  }

  const body = await res.json().catch(() => null);
  const data = asApiResponseBody(body);

  if (!res.ok) {
    const status = res.status >= 500 ? 503 : res.status;
    const message =
      res.status >= 500
        ? AUTH_SERVICE_ERROR_MESSAGE
        : res.status === 401
          ? "Sua sessão de verificação expirou. Faça login novamente."
          : RESEND_ERROR_MESSAGE;
    return errorResponse(status, message);
  }

  if (!data || data.error === true) {
    return errorResponse(503, AUTH_SERVICE_ERROR_MESSAGE);
  }

  const headers = new Headers();
  const setCookies = res.headers.getSetCookie();
  for (const cookie of setCookies) {
    headers.append("set-cookie", cookie);
  }

  return Response.json(data, { headers });
}
