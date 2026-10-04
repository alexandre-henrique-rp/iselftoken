import type { EditSectionProps } from "./_section-props";
import { TeamMemberList } from "./team-member-list";

interface StartupTeamData {
  socios?: any[] | null;
}

export function FoundersSection({ startup, ...props }: EditSectionProps & { startup?: StartupTeamData }) {
  const defaults = startup?.socios ?? [];
  return (
    <TeamMemberList
      sectionId="founders"
      title="Founders & Co-founders"
      subtitle="As pessoas que criaram e lideram a startup"
      pillLabel={(n) => `${n} fundador${n === 1 ? "" : "es"}`}
      defaultMembers={defaults}
      withBio
      addLabel="Adicionar fundador"
      fieldsPerMember={5}
      {...props}
    />
  );
}
