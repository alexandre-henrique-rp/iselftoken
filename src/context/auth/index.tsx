import * as jose from 'jose';
import { cookies } from 'next/headers';

// opensessiontoken responsável ler o payload do token
export async function openSessionToken<T = jose.JWTPayload>(
  token: string,
): Promise<T> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  const { payload } = await jose.jwtVerify(token, secret);
  return payload as T;
}

type SessionCreatePayload = {
  user: User;
  token: string;
  refreshToken: string;
};

// createSession responsável por criar o session
export async function CreateSessionToken(payload: SessionCreatePayload) {
  const { user, ...rest } = payload;

  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  const token = await new jose.SignJWT({ rest } as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('6h')
    .sign(secret);
  const { exp } = await openSessionToken(token);

  const cookieStore = await cookies();
  const expiresAt = new Date((exp as number) * 1000);

  cookieStore.set('user', JSON.stringify(user), {
    expires: expiresAt,
    path: '/',
    httpOnly: true,
  });

  cookieStore.set('session-token', token, {
    expires: expiresAt,
    path: '/',
    httpOnly: true,
  });
}

export async function GetSessionServer(): Promise<SessionNext.Session | null> {
  try {
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('session-token');
    const userCookie = cookieStore.get('user');

    if (!tokenCookie) {
      return null;
    }
    if (!userCookie) {
      return null;
    }

    const user = JSON.parse(userCookie.value) as SessionNext.Client;
    const apiUser = async () => {
      const user = JSON.parse(userCookie.value) as SessionNext.Client;
      const apiUser = await fetch(
        `${process.env.NEXTAUTH_API_URL}/users/${user.id}`,
      );
      if (!apiUser.ok) {
        return null;
      }
      const apiUserData = await apiUser.json();
      return apiUserData;
    };
    const token = tokenCookie.value;
    const payload = await openSessionToken(token);

    const expires = new Date((payload.exp as number) * 1000).toISOString();

    return {
      user: user,
      apiUser: await apiUser(),
      expires,
      token,
      refreshToken: payload.refreshToken as string,
    };
  } catch (error) {
    // Este log vai mostrar se a verificação/descriptografia do token falhou
    console.log('Erro ao obter sessão:', error);
    return null;
  }
}

//DestroySession responsável por destruir o session
export async function DeleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session-token');
  cookieStore.delete('user');
  cookieStore.delete('user_data');
  cookieStore.delete('user_planos');
  cookieStore.delete('user_pacotes');
}

export async function SetSession2fa(
  value: boolean,
  options?: {
    path?: string;
    expires?: number;
    secure?: boolean;
    sameSite?: 'lax' | 'strict' | 'none';
    domain?: string;
  },
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session_2fa', value.toString(), {
    expires: options?.expires
      ? new Date(Date.now() + options.expires * 1000)
      : undefined,
    httpOnly: true,
    path: options?.path ?? '/',
  });
}

export async function GetSession2fa(): Promise<boolean> {
  const cookieStore = await cookies();
  const c = cookieStore.get('session_2fa');
  if (!c) {
    return false;
  }
  return c.value === 'true';
}

async function GetUserCookieExists(): Promise<boolean> {
  const cookieStore = await cookies();
  const c = cookieStore.get('user_data');
  const p = cookieStore.get('user_planos');
  const pa = cookieStore.get('user_pacotes');
  if (!c || !p || !pa) {
    return false;
  }
  return true;
}
async function GetUserCookie(){
  const cookieStore = await cookies();
  const c = cookieStore.get('user_data');
  const p = cookieStore.get('user_planos');
  const pa = cookieStore.get('user_pacotes');
  if (!c || !p || !pa) {
    return null;
  }
  return {
    ...JSON.parse(c.value),
    planos: JSON.parse(p.value),
    pacotes: JSON.parse(pa.value),
  };
}

async function SetUserCookie(user: UserType.Get) {
  const { planos, pacotes, ...rest } = user;
  const cookieStore = await cookies();
  cookieStore.set('user_data', JSON.stringify(rest), {
    expires: new Date(Date.now() + 60 * 60 * 1000),
    httpOnly: true,
    path: '/',
  });
  cookieStore.set('user_planos', JSON.stringify(planos), {
    expires: new Date(Date.now() + 60 * 60 * 1000),
    httpOnly: true,
    path: '/',
  });
  cookieStore.set('user_pacotes', JSON.stringify(pacotes), {
    expires: new Date(Date.now() + 60 * 60 * 1000),
    httpOnly: true,
    path: '/',
  });
}

export async function UserSessionData() {
  const userCookieExists = await GetUserCookieExists();
  if (!userCookieExists) {
    const api = await UserApi();
    if (!api) {
      return null;
    }
    await SetUserCookie(api);
    return await GetUserCookie();
  } 
  return await GetUserCookie();
}

async function UserApi() {
  const session = await GetSessionServer();
  if (!session) {
    return null;
  }
  const userApi = await fetch(
    `${process.env.NEXTAUTH_API_URL}/users/${session.user.id}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      next: {
        tags: ['perfil'],
        // revalidar em 1hora
        revalidate: 60 * 60,
      },
    },
  );
  if (!userApi.ok) {
    return null;
  }
  const userData = await userApi.json();
  return userData.data;
}