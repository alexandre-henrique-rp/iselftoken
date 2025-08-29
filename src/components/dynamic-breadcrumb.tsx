"use client"

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Mapeamento de rotas para títulos em português
const routeMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/notification': 'Notificações',
  '/investments': 'Investimentos',
  '/investments/portfolio': 'Portfólio',
  '/investments/opportunities': 'Oportunidades',
  '/investments/history': 'Histórico',
  '/startups': 'Startups',
  '/startups/profile': 'Minha Startup',
  '/startups/fundraising': 'Captação',
  '/startups/reports': 'Relatórios',
  '/analytics': 'Analytics',
  '/analytics/performance': 'Performance',
  '/analytics/reports': 'Relatórios',
  '/documents': 'Documentos',
  '/database': 'Base de Dados',
  '/team': 'Equipe',
  '/help': 'Ajuda',
  '/settings': 'Configurações',
};

/**
 * Componente de breadcrumb dinâmico que identifica automaticamente a página atual
 * baseado na rota e exibe o caminho de navegação apropriado
 */
export function DynamicBreadcrumb() {
  const pathname = usePathname();
  
  // Função para obter o título da página baseado na rota
  const getPageTitle = (path: string): string => {
    return routeMap[path] || 'Página';
  };

  // Função para gerar breadcrumbs baseado no caminho
  const generateBreadcrumbs = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    // Sempre incluir o home
    breadcrumbs.push({
      title: 'iSelfToken',
      href: '/dashboard',
      isLast: false
    });

    // Construir caminho incrementalmente
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      
      breadcrumbs.push({
        title: getPageTitle(currentPath),
        href: currentPath,
        isLast
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
            <BreadcrumbItem className={index === 0 ? "hidden md:block" : ""}>
              {crumb.isLast ? (
                <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.href}>
                  {crumb.title}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && (
              <BreadcrumbSeparator className={index === 0 ? "hidden md:block" : ""} />
            )}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
