import { NextRequest, NextResponse } from 'next/server';
import { GetSession2fa, GetSessionServer } from './context/auth';
import { publicRoutes } from './rotas/public';
// import { adminRoutes } from './rotas/private/admin';

const publicRoutesList = publicRoutes.map((route) => route.path);

// const AdminRoutesList = adminRoutes.map((route) => route.path);

const PageNotAf2 = [
  '/auth',
]


export async function middleware(req: NextRequest) {
  const session = await GetSessionServer();
  const hasTwoFactor = await GetSession2fa();
  console.log("🚀 ~ middleware ~ hasTwoFactor:", hasTwoFactor)

  const { pathname } = req.nextUrl;

  const IsPublic = publicRoutesList.some((route) => pathname.startsWith(route));
  const NotAf2 = PageNotAf2.includes(pathname)
  console.log("🚀 ~ middleware ~ NotAf2:", NotAf2)



  if (hasTwoFactor && session && NotAf2) {
    const role = session.user.role
    console.log("🚀 ~ middleware ~ role:", role)
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (role === 'financeiro') {
      return NextResponse.redirect(new URL('/financeiro', req.url))
    }
    if (role === 'compliance') {
      return NextResponse.redirect(new URL('/compliance', req.url))
    }
    return NextResponse.redirect(new URL('/home', req.url))
  }

  if (IsPublic) {
    return NextResponse.next();
  }



}

export const config = {
  matcher: '/((?!_next|favicon.ico|public|.*\\..*).*)',
};
