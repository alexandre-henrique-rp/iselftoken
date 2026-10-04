/**
 * Tipos compartilhados do módulo de compliance.
 */

export type SealCategory = "STAGE" | "VERIFICATION" | "PARTNERSHIP" | "ACHIEVEMENT" | "CUSTOM";

export interface SealItem {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  imagePath: string;
  category: SealCategory | string;
  active: boolean;
  /** Quantidade de atribuições (admin view). */
  issuedCount?: number;
}

export interface SealAssignment {
  id: number;
  sealId: number;
  sealSlug: string;
  sealName: string;
  sealImagePath: string;
  issuedAt: string;
  issuedBy?: number | null;
  metadata?: Record<string, unknown> | null;
}
