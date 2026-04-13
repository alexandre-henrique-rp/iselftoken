import { NextRequest, NextResponse } from 'next/server';
<<<<<<< Updated upstream
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
  }
  // Para demais rotas públicas
  if (isPublicRoute) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/', req.url));
=======
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

  const { pathname } = req.nextUrl;

  const IsPublic = publicRoutesList.some((route) => pathname.startsWith(route));
  const NotAf2 = PageNotAf2.includes(pathname)

  // Criar resposta com pathname nos headers
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);

  if (hasTwoFactor && session && NotAf2) {
    const role = session.user.role
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
    return response;
  }

  return response;
>>>>>>> Stashed changes
}

export const config = {
  matcher: '/((?!_next|favicon.ico|public|.*\\..*).*)',
};
