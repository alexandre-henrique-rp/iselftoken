'use client';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { adminRoutes } from '@/rotas/private/admin';
import { complianceRouter } from '@/rotas/private/compliance';
import { financeiroRoutes } from '@/rotas/private/finaceiro';
import { userRoutes } from '@/rotas/private/user';
import { usePathname } from 'next/navigation';

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
    role === 'admin'
      ? adminRoutes
      : role === 'financeiro'
        ? financeiroRoutes
        : role === 'compliance'
          ? complianceRouter
          : userRoutes;

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
          <div key={`${crumb.href}-${index}`} className="flex items-center">
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
