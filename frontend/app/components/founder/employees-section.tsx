import type { EditSectionProps } from "./_section-props";
import { TeamMemberList } from "./team-member-list";

interface StartupTeamData {
  teams?: any[] | null;
}

export function EmployeesSection({ startup, ...props }: EditSectionProps & { startup?: StartupTeamData }) {
  const defaults = startup?.teams ?? [];
  return (
    <TeamMemberList
      sectionId="employees"
      title="Time"
      subtitle="Membros relevantes além de founders e advisors"
      pillLabel={(n) => `${n} pessoa${n === 1 ? "" : "s"}`}
      defaultMembers={defaults}
      withBio={false}
      addLabel="Adicionar membro do time"
      fieldsPerMember={3}
      {...props}
    />
  );
}
