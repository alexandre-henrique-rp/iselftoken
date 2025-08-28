import { NextRequest, NextResponse } from 'next/server';
import { DeleteSession, GetSessionServer } from './context/auth';

const publicRoutes = [
  '/',
  '/login',
  '/recuperar-senha',
  '/redefinir-senha',
  '/register',
  '/termos/privacidade',
  '/termos/uso',
];

const StartupRoutes = ['/dashboard', '/config', '/perfil'];

const InvestorRoutes = ['/home', '/perfil'];

const AdminRoutes = ['/admin', '/perfil'];

const AfiliadoRoutes = ['/afiliado', '/perfil'];

export async function middleware(req: NextRequest) {
  const session = await GetSessionServer();

  const { pathname } = req.nextUrl;
  const isPublicRoute = publicRoutes.includes(pathname);

  // Bypass para qualquer rota de API
  // Evita que chamadas a /api/* sejam redirecionadas pelo middleware
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next();
  }

  // Verificar se a sessão expirou
  if (session && session.expires && new Date(session.expires) < new Date()) {
    // Sessão expirada, excluir cookies
    const response = NextResponse.redirect(new URL('/login', req.url));
    await DeleteSession();
    return response;
  }

  if (session) {
    const role = session.user.role;
    // "investidor" | "startup" | "admin" | "afiliado"
    if (role === 'fundador') {
      const allowed = StartupRoutes.some((base) => pathname === base || pathname.startsWith(base + '/'));
      if (allowed) {
        return NextResponse.next();
      }
    }
    if (role === 'investidor') {
      const allowed = InvestorRoutes.some((base) => pathname === base || pathname.startsWith(base + '/'));
      if (allowed) {
        return NextResponse.next();
      }
    }
    if (role === 'admin') {
      const allowed = AdminRoutes.some((base) => pathname === base || pathname.startsWith(base + '/'));
      if (allowed) {
        return NextResponse.next();
      }
    }
    if (role === 'afiliado') {
      const allowed = AfiliadoRoutes.some((base) => pathname === base || pathname.startsWith(base + '/'));
      if (allowed) {
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
