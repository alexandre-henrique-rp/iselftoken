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
    .setExpirationTime("1d")
    .sign(secret)
  const { exp } = await openSessionToken(token);

  (await cookies()).set("session-token", token, {
    expires: (exp as number) * 1000,
    path: "/",
    httpOnly: true,
  });
}

//GetSessionServer responsável por pegar o session  em server components
export async function GetSessionServer(): Promise<SessionNext.Session | null> {
  try {
    const token = (await cookies()).get("session-token");
    if (!token) {
      return null;
    }
    const data = await openSessionToken<SessionNext.Session>(token.value);
    return data;
  } catch (error) {
    console.log(error)
    return null;
  }
}

//DestroySession responsável por destruir o session
export async function DeleteSession() {
  (await cookies()).delete("session-token");
}