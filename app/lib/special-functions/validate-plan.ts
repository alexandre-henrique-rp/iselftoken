/**
 * Tipos de plano disponíveis
 */
export type PlanType = "BASIC" | "PREMIUM" | "FOUNDER" | "ENTERPRISE";

/**
 * Status de assinatura
 */
export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING";

/**
 * Estrutura de assinatura do usuário
 */
export interface UserSubscription {
  id: number;
  planType?: PlanType;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
}

/**
 * Dados do usuário para validação de plano
 */
export interface UserWithSubscriptions {
  id: number;
  role: "USER" | "ADMIN" | "FOUNDER";
  subscriptions?: UserSubscription[];
}

/**
 * @name validateExistePlan
 * @description Verifica se o usuário possui alguma assinatura com plano ativo.
 *
 * @param user - Dados do usuário com assinaturas
 * @returns true se existe plano ativo, false caso contrário
 *
 * @example
 * const hasplan = validateExistePlan(user);
 * if (!hasPlan) {
 *   redirect("/plans");
 * }
 */
export function validateExistePlan(user: UserWithSubscriptions): boolean {
  // Se não tem assinaturas, não tem plano
  if (!user.subscriptions || user.subscriptions.length === 0) {
    return false;
  }

  // Verifica se existe alguma assinatura ativa
  const hasActivePlan = user.subscriptions.some(
    (subscription) => subscription.status === "ACTIVE"
  );

  return hasActivePlan;
}

/**
 * @name validateFundadorPlan
 * @description Verifica se o usuário possui plano fundador ativo e não expirado.
 *
 * @param user - Dados do usuário com assinaturas
 * @returns true se tem plano fundador válido, false caso contrário
 *
 * @example
 * const isFounder = validateFundadorPlan(user);
 * if (isFounder) {
 *   // Libera funcionalidades exclusivas de fundador
 * }
 */
export function validateFundadorPlan(user: UserWithSubscriptions): boolean {
  // Se não tem assinaturas, não tem plano fundador
  if (!user.subscriptions || user.subscriptions.length === 0) {
    return false;
  }

  const now = new Date();

  // Verifica se existe assinatura de fundador ativa e não expirada
  const hasFounderPlan = user.subscriptions.some((subscription) => {
    // Deve ser plano FOUNDER
    if (subscription.planType !== "FOUNDER") {
      return false;
    }

    // Deve estar ativo
    if (subscription.status !== "ACTIVE") {
      return false;
    }

    // Não pode estar expirado
    const expiresAt = new Date(subscription.expiresAt);
    if (expiresAt < now) {
      return false;
    }

    return true;
  });

  return hasFounderPlan;
}

/**
 * @name validatePlanType
 * @description Verifica se o usuário possui um tipo específico de plano ativo.
 *
 * @param user - Dados do usuário com assinaturas
 * @param planType - Tipo de plano a verificar
 * @returns true se tem o plano especificado ativo, false caso contrário
 *
 * @example
 * const hasPremium = validatePlanType(user, "PREMIUM");
 */
export function validatePlanType(
  user: UserWithSubscriptions,
  planType: PlanType
): boolean {
  if (!user.subscriptions || user.subscriptions.length === 0) {
    return false;
  }

  const now = new Date();

  return user.subscriptions.some((subscription) => {
    return (
      subscription.planType === planType &&
      subscription.status === "ACTIVE" &&
      new Date(subscription.expiresAt) >= now
    );
  });
}

/**
 * @name getActivePlan
 * @description Retorna o plano ativo do usuário (o mais recente se houver múltiplos).
 *
 * @param user - Dados do usuário com assinaturas
 * @returns Assinatura ativa ou null
 *
 * @example
 * const activePlan = getActivePlan(user);
 * if (activePlan) {
 *   console.log(`Plano: ${activePlan.planType}`);
 * }
 */
export function getActivePlan(
  user: UserWithSubscriptions
): UserSubscription | null {
  if (!user.subscriptions || user.subscriptions.length === 0) {
    return null;
  }

  const now = new Date();

  // Filtra apenas assinaturas ativas e não expiradas
  const activePlans = user.subscriptions.filter((subscription) => {
    return (
      subscription.status === "ACTIVE" &&
      new Date(subscription.expiresAt) >= now
    );
  });

  if (activePlans.length === 0) {
    return null;
  }

  // Retorna o plano que expira por último (mais recente)
  return activePlans.sort(
    (a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()
  )[0];
}

/**
 * @name getDaysUntilExpiration
 * @description Calcula quantos dias faltam para o plano expirar.
 *
 * @param user - Dados do usuário com assinaturas
 * @returns Número de dias até expiração ou -1 se não tem plano ativo
 *
 * @example
 * const days = getDaysUntilExpiration(user);
 * if (days <= 7) {
 *   // Mostrar aviso de renovação
 * }
 */
export function getDaysUntilExpiration(user: UserWithSubscriptions): number {
  const activePlan = getActivePlan(user);

  if (!activePlan) {
    return -1;
  }

  const now = new Date();
  const expiresAt = new Date(activePlan.expiresAt);
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
