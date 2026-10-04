/**
 * Tipos compartilhados entre /admin/marketplace BFF e componente.
 * S4-T03.
 */

export type AdminPinnedStartup = {
  startupId: number;
  slug: string;
  nome: string;
  manuallyPinnedAt: string | null;
  manuallyPinnedBy: number | null;
  manuallyPinnedReason: string | null;
};