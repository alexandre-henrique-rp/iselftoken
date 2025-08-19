import { NextRequest, NextResponse } from 'next/server';
import { DeleteSession, GetA2fVerified, GetSessionServer } from './context/auth';

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

const StartupRoutes = ['/dashboard', '/config'];

const InvestorRoutes = ['/home', '/perfil'];

const AdminRoutes = ['/admin'];

const AfiliadoRoutes = ['/afiliado'];

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

  // i18n: redirecionamento por prefixo de idioma está desativado (sem rotas /[locale])

  // Verificar se a sessão expirou
  if (session && session.expires && new Date(session.expires) < new Date()) {
    // Sessão expirada, excluir cookies
    const response = NextResponse.redirect(new URL('/login', req.url));
    await DeleteSession();
    return response;
  }

  // Regras especiais para A2F devem vir antes de liberar rotas públicas
  if (session && !a2fVerified && pathname === '/login') {
    return NextResponse.redirect(new URL('/auth', req.url));
  }
  if (pathname === '/auth') {
    // Bloquear acesso a /auth sem sessão
    if (!session) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
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
      if (role === 'fundador') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      if (role === 'investidor') {
        return NextResponse.redirect(new URL('/home', req.url));
      }
      if (role === 'admin') {
        return NextResponse.redirect(new URL('/admin', req.url));
      }
      if (role === 'afiliado') {
        return NextResponse.redirect(new URL('/afiliado', req.url));
      }
    }
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
