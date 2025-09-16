import * as jose from "jose";
import { cookies } from "next/headers";

// opensessiontoken responsável ler o payload do token
export async function openSessionToken<T = jose.JWTPayload>(token: string): Promise<T> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
  const {payload} = await jose.jwtVerify(token, secret)
  return payload as T
}

// createSession responsável por criar o session
export async function CreateSessionToken(payload: SessionNext.Session) {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
  const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("6h")
    .sign(secret)
  const { exp } = await openSessionToken(token);

  (await cookies()).set("session-token", token, {
    expires: (exp as number) * 1000,
    path: "/",
    httpOnly: true,
  });
}

export async function GetSessionServer(): Promise<SessionNext.Session | null> {
  try {
    const tokenCookie = (await cookies()).get("session-token");

    // Adicione este log para ver se o token está sendo encontrado
    console.log("Token de sessão encontrado:", !!tokenCookie);

    if (!tokenCookie) {
      return null;
    }

    const token = tokenCookie.value;
    const payload = await openSessionToken(token);
    const expires = payload.exp as unknown as string;
    
    return { 
      user: payload as unknown as SessionNext.Client,
      expires,
      token,
      refreshToken: payload.refreshToken as string
    };

  } catch (error) {
    // Este log vai mostrar se a verificação/descriptografia do token falhou
    console.log("Erro ao obter sessão:", error);
    return null;
  }
}

//DestroySession responsável por destruir o session
export async function DeleteSession() {
  (await cookies()).delete("session-token");
  (await cookies()).delete("a2f-verified");
}

// A2F Verified Cookie Utilities
// Funções utilitárias para salvar, ler e remover o estado de verificação de e-mail (A2F) nos cookies.

/**
 * Define/atualiza o cookie "a2f-verified" indicando se o código de e-mail foi verificado.
 * Por padrão, não usa httpOnly (permite leitura no client) e dura 60 minutos.
 */
export async function SetA2fVerified(
  value: boolean,
  options?: { maxAgeMinutes?: number; httpOnly?: boolean; path?: string }
): Promise<void> {
  const maxAgeMinutes = options?.maxAgeMinutes ?? 60
  const httpOnly = options?.httpOnly ?? false
  const path = options?.path ?? "/"

  ;(await cookies()).set("a2f-verified", value ? "true" : "false", {
    maxAge: maxAgeMinutes * 60,
    httpOnly,
    path,
  })
}

/**
 * Lê o cookie "a2f-verified" e retorna true/false. Ausente => false.
 */
export async function GetA2fVerified(): Promise<boolean> {
  const cookieStore = await cookies()
  const c = cookieStore.get("a2f-verified")
  return c?.value === "true"
}

/**
 * Remove o cookie "a2f-verified".
 */
export async function DeleteA2fVerified(): Promise<void> {
  (await cookies()).delete("a2f-verified")
}