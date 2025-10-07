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
    // console.log("Token de sessão encontrado:", !!tokenCookie);

    if (!tokenCookie) {
      return null;
    }

    const token = tokenCookie.value;
    const payload = await openSessionToken(token);

    const expires = new Date((payload.exp as number) * 1000).toISOString();
  
    
    return { 
      user: payload.user as unknown as SessionNext.Client,
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
}


export async function SetSession2fa(
  value: boolean,
  options?: {
    path?: string;
    expires?: number;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    domain?: string;
  }
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("session_2fa", value.toString(), {
    expires: options?.expires ? new Date(Date.now() + options.expires * 1000) : undefined,
    httpOnly: true,
    path: options?.path ?? '/',
  });
}

export async function GetSession2fa(): Promise<boolean> {
  const cookieStore = await cookies()
  const c = cookieStore.get("session_2fa")
  if (!c) {
    return false
  }
  return c.value === "true"
}


