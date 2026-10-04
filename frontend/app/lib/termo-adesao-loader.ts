import { getTermoAdesaoBody } from "~/lib/termo-adesao-text";

interface StartupIdentity {
  nome?: string;
  name?: string;
  cnpj?: string;
  founder?: { nome?: string };
}

interface UserIdentity {
  nome?: string;
  reg_documento?: string | null;
}

function unwrap<T>(payload: unknown): T {
  const value = payload as { data?: T } | T;
  return (value && typeof value === "object" && "data" in value
    ? value.data
    : value) as T;
}

export async function loadTermoAdesaoHtml(request: Request): Promise<string> {
  const requestUrl = new URL(request.url);
  const startupId = requestUrl.searchParams.get("startupId");
  const cookie = request.headers.get("cookie") ?? "";

  let startup: StartupIdentity = {};
  let user: UserIdentity = {};

  if (startupId && /^\d+$/.test(startupId)) {
    const [startupResponse, userResponse] = await Promise.all([
      fetch(`${requestUrl.origin}/api/startups/${startupId}`, {
        headers: { cookie },
      }),
      fetch(`${requestUrl.origin}/api/users/me`, {
        headers: { cookie },
      }),
    ]);

    if (startupResponse.ok) {
      startup = unwrap<StartupIdentity>(
        await startupResponse.json().catch(() => ({})),
      );
    }
    if (userResponse.ok) {
      user = unwrap<UserIdentity>(
        await userResponse.json().catch(() => ({})),
      );
    }
  }

  return getTermoAdesaoBody({
    startupName: startup.nome ?? startup.name ?? "Não informado",
    startupCnpj: startup.cnpj ?? "Não informado",
    founderName: startup.founder?.nome ?? user.nome ?? "Não informado",
    founderCpf: user.reg_documento ?? "Não informado",
  });
}
