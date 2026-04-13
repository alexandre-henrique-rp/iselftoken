import { Home } from "lucide-react";
import type { MenuData, MenuItem } from "~/types/menuItem";
import type { User } from "~/types/user";

export const filterPlanStartup = (user: User): boolean => {
  const plans = user.subscriptions ?? [];

  if (plans.length === 0) {
    return false;
  }

  const now = new Date();
  // Verifica se tem plano 3 com expiresAt no futuro (ativo)
  const filtro = plans.find(
    (subscription) =>
      (subscription.planId === 3 || subscription.plan?.id === 3) &&
      new Date(subscription.expiresAt) > now,
  );
  if (filtro) {
    return true;
  }

  return false;
};

export const FilterRote = (user: User, routes: MenuData[]): MenuData[] => {
  /**
   * Filtra as subrotas baseado na role do usuário.
   * Regras:
   * - FINANCEIRO e COMPLIANCE: acesso apenas às subrotas da mesma role
   * - Outros usuários: acesso a subrotas ALL, STARTUP (se tiver plano) e da sua role específica
   */
  const filterItems = (
    items: MenuItem[] | undefined,
    hasStartupAccess: boolean,
  ): MenuItem[] => {
    if (!items || items.length === 0) {
      return [];
    }

    return items.filter((item) => {
      const itemRole = item.role || "ALL";

      // FINANCEIRO e COMPLIANCE: acesso apenas às subrotas compatíveis
      if (user.role === "FINANCEIRO" || user.role === "COMPLIANCE") {
        return itemRole === user.role;
      }

      // Demais usuários: acesso a subrotas ALL
      if (itemRole === "ALL") {
        return true;
      }

      // Acesso a subrotas STARTUP apenas se tiver plano 3 ativo
      if (itemRole === "STARTUP") {
        return hasStartupAccess;
      }

      // Outras roles específicas: verifica match exato
      return itemRole === user.role;
    });
  };

  // ADMIN tem acesso a todas as rotas, independente de plano
  if (user.role === "ADMIN") {
    return routes;
  }

  // Verifica se o usuário tem plano ativo (expiresAt no futuro)
  const now = new Date();
  const hasActivePlan = (user.subscriptions ?? []).some(
    (sub) => new Date(sub.expiresAt) > now,
  );

  // Se não tem plano ativo ou plano expirado, retorna apenas rota de compra de planos
  if (!hasActivePlan) {
    return [
      {
        title: "Planos",
        url: "/planos",
        icon: Home,
        isActive: true,
        role: "ALL" as const,
      },
    ];
  }

  // Verifica se o usuário tem acesso a rotas de startups usando a função existente
  const hasStartupAccess = filterPlanStartup(user);

  // Filtra as rotas baseado nas regras de acesso
  return routes
    .map((route) => {
      const routeRole = route.role;

      // Verifica se a rota principal é acessível ao usuário
      let routeAccessible = false;

      // FINANCEIRO e COMPLIANCE: acesso apenas às rotas compatíveis
      if (user.role === "FINANCEIRO" || user.role === "COMPLIANCE") {
        routeAccessible = routeRole === user.role;
      } else if (routeRole === "ALL") {
        // Demais usuários: acesso a rotas ALL
        routeAccessible = true;
      } else if (routeRole === "STARTUP") {
        // Acesso a rotas STARTUP apenas se tiver plano 3 ativo
        routeAccessible = hasStartupAccess;
      } else {
        // Outras roles específicas: verifica match exato
        routeAccessible = routeRole === user.role;
      }

      // Se a rota principal não é acessível, retorna null para remover depois
      if (!routeAccessible) {
        return null;
      }

      // Se a rota tem items (subrotas), filtra elas também
      if (route.items && route.items.length > 0) {
        const filteredItems = filterItems(route.items, hasStartupAccess);

        // Se após filtrar as subrotas não restar nenhuma, retorna null (remove o item pai)
        if (filteredItems.length === 0) {
          return null;
        }

        // Retorna a rota com as subrotas filtradas
        return {
          ...route,
          items: filteredItems,
        };
      }

      // Retorna a rota sem modificações (não tem subrotas)
      return route;
    })
    .filter((route): route is MenuData => route !== null);
};
