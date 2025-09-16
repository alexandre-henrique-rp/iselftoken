'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { adminRoutes } from '@/rotas/private/admin';
import { fundadorRoutes } from '@/rotas/private/fundador';
import { consultorRoutes } from '@/rotas/private/consultor';
import { investorRoutes } from '@/rotas/private/investidor';

interface dynamicBreadcrumbProps {
  role: string;
}

/**
 * Componente de breadcrumb dinâmico que identifica automaticamente a página atual
 * baseado na rota e exibe o caminho de navegação apropriado
 */
export function DynamicBreadcrumb({ role }: dynamicBreadcrumbProps) {
  const pathname = usePathname();

  const MenuFilter =
    role === 'fundador'
      ? fundadorRoutes
      : role === 'admin'
        ? adminRoutes
        : role === 'afiliado'
          ? consultorRoutes
          : investorRoutes;

  const routes = MenuFilter;

  // Função para obter o título da página baseado na rota
  const getPageTitle = (path: string): string => {
    const route = routes.find((route) => route.path === path);
    return route?.nome || 'Página';
  };

  // Função para gerar breadcrumbs baseado no caminho
  const generateBreadcrumbs = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Sempre incluir o home
    breadcrumbs.push({
      title: 'iSelfToken',
      href: '/dashboard',
      isLast: false,
    });

    // Construir caminho incrementalmente
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      breadcrumbs.push({
        title: getPageTitle(currentPath),
        href: currentPath,
        isLast,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center">
            <BreadcrumbItem className={index === 0 ? 'hidden md:block' : ''}>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>{crumb.title}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && (
              <BreadcrumbSeparator
                className={index === 0 ? 'hidden md:block' : ''}
              />
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
