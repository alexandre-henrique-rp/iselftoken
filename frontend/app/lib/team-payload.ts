/**
 * S6-T01 — Helpers para serializar fundadores/equipe para o backend.
 *
 * Movidos de edit-startup-time.tsx para serem reutilizados pelo save
 * consolidado no layout (edit-startup-layout.tsx).
 */

export interface SocioInput {
  nome: string;
  participacao: number;
  cargo?: string;
  linkedin?: string;
  bio?: string;
  dedicacao?: string;
  fotoUrl?: string;
}

export interface TeamMemberInput {
  nome: string;
  cargo: string;
  linkedin?: string;
  dedicacao?: string;
  fotoUrl?: string;
}

export interface MemberFormShape {
  nome?: string;
  cargo?: string;
  linkedin?: string;
  bio?: string;
  dedicacao?: string;
  participacao?: number;
  fotoUrl?: string;
}

export function memberToTeam(input: MemberFormShape): TeamMemberInput | null {
  if (!input?.nome?.trim() || !input?.cargo?.trim()) return null;
  const out: TeamMemberInput = {
    nome: input.nome.trim(),
    cargo: input.cargo.trim(),
  };
  if (input.linkedin?.trim()) out.linkedin = input.linkedin.trim();
  if (input.dedicacao?.trim()) out.dedicacao = input.dedicacao.trim();
  if (input.fotoUrl?.trim()) out.fotoUrl = input.fotoUrl.trim();
  return out;
}

export function memberToSocio(
  input: MemberFormShape,
  defaultParticipacao: number,
): SocioInput | null {
  if (!input?.nome?.trim() || !input?.cargo?.trim()) return null;
  const out: SocioInput = {
    nome: input.nome.trim(),
    participacao:
      typeof input.participacao === "number" &&
      Number.isFinite(input.participacao)
        ? Math.max(0, Math.min(100, Math.round(input.participacao)))
        : defaultParticipacao,
  };
  if (input.cargo?.trim()) out.cargo = input.cargo.trim();
  if (input.linkedin?.trim()) out.linkedin = input.linkedin.trim();
  if (input.bio?.trim()) out.bio = input.bio.trim();
  if (input.dedicacao?.trim()) out.dedicacao = input.dedicacao.trim();
  if (input.fotoUrl?.trim()) out.fotoUrl = input.fotoUrl.trim();
  return out;
}