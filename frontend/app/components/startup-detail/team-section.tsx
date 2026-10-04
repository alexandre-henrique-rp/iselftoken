import React from "react";
import { Users } from "lucide-react";
import { InitialsImage } from "~/components/ui/initials-image";
import type {
  StartupSocio,
  StartupTeamMember,
} from "~/types/startup-opportunity-detail";

interface TeamSectionProps {
  /** Equipe da startup (capital social) — vem do JSON `socios` no banco. */
  socios?: StartupSocio[] | null;
  /** Time fundador — vem do JSON `teams` no banco. */
  teams?: StartupTeamMember[] | null;
}

export function TeamSection({ socios, teams }: TeamSectionProps = {}) {
  const membersByName = new Map<string, StartupTeamMember>();

  for (const member of socios ?? []) {
    membersByName.set(member.nome.trim().toLocaleLowerCase(), {
      nome: member.nome,
      cargo: member.cargo,
      fotoUrl: member.fotoUrl,
    });
  }

  for (const member of teams ?? []) {
    const key = member.nome.trim().toLocaleLowerCase();
    const previous = membersByName.get(key);
    membersByName.set(key, {
      ...previous,
      nome: member.nome,
      cargo: member.cargo || previous?.cargo || "",
      fotoUrl: member.fotoUrl || previous?.fotoUrl,
    });
  }

  const realMembers = membersByName.size
    ? Array.from(membersByName.values())
    : null;

  if (!realMembers) {
    return (
      <section className="space-y-6">
        <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
          Equipe fundadora
        </h2>
        <div className="glass-panel rounded-3xl p-12 text-center space-y-3">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-bold text-foreground">
            Equipe ainda não cadastrada
          </p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            O founder ainda não publicou informações sobre a equipe desta
            startup. Quando disponível, os integrantes aparecem aqui.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">
        Equipe fundadora
      </h2>
      <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:gap-6">
        {realMembers.map((member) => (
          <div key={member.nome} className="group">
            <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-card">
              <InitialsImage
                name={member.nome}
                src={member.fotoUrl ?? null}
                alt={member.nome}
                className="h-full w-full rounded-2xl transition-all duration-700 group-hover:scale-105"
                fallbackClassName="bg-gradient-to-br from-primary/20 via-card to-background"
                fallbackTextClassName="text-3xl font-black text-primary"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60" />
            </div>
            <h4 className="text-base font-black text-foreground">
              {member.nome}
            </h4>
            <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary">
              {member.cargo}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}