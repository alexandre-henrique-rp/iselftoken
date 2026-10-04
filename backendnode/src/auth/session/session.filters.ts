enum SubStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELED = 'CANCELED',
}

type SessionUser = {
  id: number;
  publicId: string;
  email: string;
  nome: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  subscriptions: Record<string, unknown>[];
};

type FilterResult = {
  redirect?: string;
  reason?: string;
} | null;

const ADMIN_ROLES = ['ADMIN', 'FINANCEIRO', 'COMPLIANCE'];

export function applySessionFilters(user: SessionUser): FilterResult {
  if (ADMIN_ROLES.includes(user.role)) {
    return null;
  }

  if (!user.subscriptions || user.subscriptions.length === 0) {
    return { redirect: '/plans', reason: 'Nenhum plano selecionado' };
  }

  const now = new Date();
  const hasValidActiveSubscription = user.subscriptions.some((sub) => {
    if (sub.status !== SubStatus.ACTIVE && sub.status !== 'ACTIVE') {
      return false;
    }

    if (!sub.expiresAt) {
      return true;
    }

    const expiresAt = new Date(sub.expiresAt as string);
    return !Number.isNaN(expiresAt.getTime()) && expiresAt > now;
  });

  if (!hasValidActiveSubscription) {
    return { redirect: '/plans', reason: 'Nenhum plano ativo' };
  }

  return null;
}
