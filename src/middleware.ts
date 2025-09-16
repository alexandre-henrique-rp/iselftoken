import { NextRequest, NextResponse } from 'next/server';
import { DeleteSession, GetSessionServer } from './context/auth';
import { publicRoutes } from './rotas/public';
import { fundadorRoutes } from './rotas/private/fundador';
import { investorRoutes } from './rotas/private/investidor';
import { adminRoutes } from './rotas/private/admin';
import { consultorRoutes } from './rotas/private/consultor';

const publicRoutesList = publicRoutes.map((route) => route.path);

const StartupRoutesList = fundadorRoutes.map((route) => route.path);

const InvestorRoutesList = investorRoutes.map((route) => route.path);

const AdminRoutesList = adminRoutes.map((route) => route.path);

const ConsultorRoutesList = consultorRoutes.map((route) => route.path);

export async function middleware(req: NextRequest) {
  const session = await GetSessionServer();
  

  const { pathname } = req.nextUrl;
  const isPublicRoute = publicRoutesList.includes(pathname);

  console.log("Sessão no middleware:", session);

  // Bypass para rotas de API e autenticação
  if (pathname.startsWith('/api/') || pathname.startsWith('/auth/') || pathname.startsWith('/startup/')) {
    return NextResponse.next();
  }

  // Se não houver sessão, permitir acesso apenas a rotas públicas
  if (!session) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Verificar se a sessão expirou
  if (session.expires && new Date(session.expires) < new Date()) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    await DeleteSession();
    return response;
  }

  if (session) {
    const role = session.user.role;
    // "investidor" | "startup" | "admin" | "afiliado"
    if (role === 'fundador') {
      const allowed = StartupRoutesList.some((base) => pathname === base || pathname.startsWith(base + '/'));
      if (allowed) {
        return NextResponse.next();
      }
    }
    if (role === 'investidor') {
      const allowed = InvestorRoutesList.some(
        (base) => pathname === base || pathname.startsWith(base + '/'),
      );
      if (allowed) {
        return NextResponse.next();
      }
    }
    if (role === 'admin') {
      const allowed = AdminRoutesList.some((base) => pathname === base || pathname.startsWith(base + '/'));
      if (allowed) {
        return NextResponse.next();
      }
    }
    if (role === 'consultor') {
      const allowed = ConsultorRoutesList.some((base) => pathname === base || pathname.startsWith(base + '/'));
      if (allowed) {
        return NextResponse.next();
      }
    }
  }
  
  // Se chegou até aqui, o usuário não tem permissão para acessar a rota
  // Redirecionar para a rota padrão baseada no role
  if (session) {
    const role = session.user.role;
    
    if (role === 'investidor') {
      return NextResponse.redirect(new URL('/home', req.url));
    }
    if (role === 'fundador') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }
    if (role === 'consultor') {
      return NextResponse.redirect(new URL('/dashboard-consultor', req.url));
    }
  }

  // Fallback para rotas públicas
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Último fallback - redirecionar para home
  return NextResponse.redirect(new URL('/', req.url));
}

export const config = {
  matcher: '/((?!_next|favicon.ico|public|.*\\..*).*)',
};
