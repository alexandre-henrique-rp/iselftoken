import type { EditSectionProps } from "./_section-props";
import { TeamMemberList } from "./team-member-list";

const defaults: any[] = [];

export function AdvisorsSection(props: EditSectionProps) {
  return (
    <TeamMemberList
      sectionId="advisors"
      title="Advisors"
      subtitle="Conselheiros e mentores estratégicos"
      pillLabel={(n) => `${n} advisor${n === 1 ? "" : "s"}`}
      defaultMembers={defaults}
      withBio={false}
      addLabel="Adicionar advisor"
      fieldsPerMember={3}
      {...props}
    />
  );
}
