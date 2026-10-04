import type { UserData } from "~/types/auth";

import { BACKEND_URL } from "~/lib/api-config";

type BackendEnvelope = Record<string, unknown> & {
  codigo?: unknown;
  error?: unknown;
  message?: unknown;
};

function getErrorStatus(data: BackendEnvelope, fallback = 502) {
  const codigo = data.codigo;
  return typeof codigo === "number" &&
    Number.isInteger(codigo) &&
    codigo >= 400 &&
    codigo <= 599
    ? codigo
    : fallback;
}

function getErrorMessage(data: BackendEnvelope, fallback: string) {
  return typeof data.message === "string" && data.message.trim()
    ? data.message
    : fallback;
}

export async function loader({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  const res = await fetch(`${BACKEND_URL}/users/me`, {
    method: "GET",
    headers: {
      ...(cookieHeader && { cookie: cookieHeader }),
    },
  });

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    return Response.json(
      { error: true, message: "Resposta inválida do servidor", codigo: 502 },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }

  if (data.error === true || !data.data) {
    const status = getErrorStatus(data);
    return Response.json(
      {
        error: true,
        message: getErrorMessage(data, "Não foi possível carregar o perfil"),
        codigo: status,
      },
      { status },
    );
  }

  return Response.json(
    {
      error: false,
      message: "Dados do usuário retornados com sucesso",
      codigo: 200,
      data: data.data as UserData,
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

export async function action({ request }: { request: Request }) {
  const cookieHeader = request.headers.get("cookie");

  if (request.method !== "PATCH" && request.method !== "PUT") {
    return Response.json(
      { error: true, message: "Método não permitido", codigo: 405 },
      { status: 405 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: true, message: "Corpo da requisição inválido", codigo: 400 },
      { status: 400 },
    );
  }

  const res = await fetch(`${BACKEND_URL}/users/me`, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      ...(cookieHeader && { cookie: cookieHeader }),
    },
    body: JSON.stringify(body),
  });

  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    return Response.json(
      { error: true, message: "Resposta inválida do servidor", codigo: 502 },
      { status: 502 },
    );
  }

  const headers: Record<string, string> = {};
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    headers["set-cookie"] = setCookie;
  }

  if (data.error === true) {
    const status = getErrorStatus(data);
    return Response.json(
      {
        error: true,
        message: getErrorMessage(data, "Não foi possível atualizar o perfil"),
        codigo: status,
      },
      { status, headers },
    );
  }

  return Response.json(data, {
    status: res.status,
    headers: {
      ...headers,
      "Cache-Control": "private, no-store",
    },
  });
}
