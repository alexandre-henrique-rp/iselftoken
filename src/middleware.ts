import { NextRequest, NextResponse } from 'next/server';
import { GetSession2fa, GetSessionServer } from './context/auth';
import { publicRoutes } from './rotas/public';
import { adminRoutes } from './rotas/private/admin';

const publicRoutesList = publicRoutes.map((route) => route.path);

const AdminRoutesList = adminRoutes.map((route) => route.path);

const PageNotAf2 = [
  '/auth',
]




interface SessionFromCookies {
  user: SessionNext.Client;
  expires: string;
  token: string;
  refreshToken?: string;
}


export async function middleware(req: NextRequest) {
  const session = await GetSessionServer();
  const hasTwoFactor = await GetSession2fa();

  const { pathname } = req.nextUrl;

  const IsPublic = publicRoutesList.some((route) => pathname.startsWith(route));
  const NotAf2 = PageNotAf2.includes(pathname)
 

  if(IsPublic) {
    return NextResponse.next();
  }

  if (NotAf2) {
    if (session && hasTwoFactor) {
      return NextResponse.redirect(new URL('/home', req.url))
    }
    return NextResponse.next();
  }

  

 
}

export const config = {
  matcher: '/((?!_next|favicon.ico|public|.*\\..*).*)',
};
