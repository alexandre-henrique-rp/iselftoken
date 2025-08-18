import { NextRequest, NextResponse } from 'next/server';
import { GetA2fVerified, GetSessionServer } from './context/auth';

const publicRoutes = [
  '/',
  '/login',
  '/recuperar-senha',
  '/redefinir-senha',
  '/register',
  '/auth',
  '/termos/privacidade',
  '/termos/uso',
];

const StartupRoutes = ['/dashboard', '/confg'];

const InvestorRoutes = ['/home', '/perfil'];

export async function middleware(req: NextRequest) {
  const session = await GetSessionServer();
  const a2fVerified = await GetA2fVerified();

  const { pathname } = req.nextUrl;
  const isPublicRoute = publicRoutes.includes(pathname);

  // Bypass para qualquer rota de API
  // Evita que chamadas a /api/* sejam redirecionadas pelo middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Regras especiais para A2F devem vir antes de liberar rotas públicas
  if (!a2fVerified && pathname === '/login') {
    return NextResponse.redirect(new URL('/auth', req.url));
  }
  if (pathname === '/auth') {
    if (session && a2fVerified) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // Guarda global: usuário logado sem A2F verificado vai para /auth
  if (session && !a2fVerified && pathname !== '/auth') {
    return NextResponse.redirect(new URL('/auth', req.url));
  }

  if (pathname === '/') {
    if (session) {
      const role = session.user.role;
      if (role === 'startup') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      if (role === 'investidor') {
        return NextResponse.redirect(new URL('/home', req.url));
      }
    }
  }
  
  if (session) {
    const role = session.user.role;
    if (role === 'startup') {
      if (StartupRoutes.includes(pathname)) {
        return NextResponse.next();
      }
    }
    if (role === 'investidor') {
      if (InvestorRoutes.includes(pathname)) {
        return NextResponse.next();
      }
    }
  }
  // Para demais rotas públicas
  if (isPublicRoute) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/', req.url));
}

export const config = {
  matcher: '/((?!_next|favicon.ico|public|.*\\..*).*)',
};
