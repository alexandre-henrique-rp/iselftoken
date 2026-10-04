import { Plus } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { EditSectionProps } from "./_section-props";
import { TeamMemberCard } from "./team-member-card";

export type TeamMemberKind = "founder" | "advisor" | "employee";

interface TeamMember {
  nome: string;
  cargo: string;
  linkedin: string;
  bio?: string;
  dedicacao?: string;
  fotoUrl?: string;
  /** Só usado em founders (withBio=true). 0-100 (% de participação). */
  participacao?: number;
}

interface TeamForm {
  members: TeamMember[];
}

interface TeamMemberListProps extends EditSectionProps {
  sectionId: string;
  title: string;
  subtitle: string;
  pillLabel: (count: number) => string;
  defaultMembers: TeamMember[];
  withBio: boolean;
  addLabel: string;
  fieldsPerMember: number;
  hideHeader?: boolean;
  flat?: boolean;
}

export function TeamMemberList({
  sectionId,
  title,
  subtitle,
  pillLabel,
  defaultMembers,
  withBio,
  addLabel,
  fieldsPerMember,
  reportStatus,
  registerReset,
  registerGetValues,
  hideHeader = false,
  flat = false,
}: TeamMemberListProps) {
  const { register, setValue, control, watch, formState, reset, getValues } = useForm<TeamForm>({
    defaultValues: { members: defaultMembers },
    mode: "onChange",
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });

  const members = watch("members");

  const dirty = (() => {
    const arrayDirty = formState.dirtyFields.members;
    if (!Array.isArray(arrayDirty)) return 0;
    return arrayDirty.reduce<number>((sum, row) => {
      if (!row) return sum;
      return sum + Object.values(row).filter(Boolean).length;
    }, 0);
  })();

  const filled = members.reduce((sum, m) => {
    const fieldList = [m.nome, m.cargo, m.linkedin];
    if (withBio) fieldList.push(m.bio ?? "");
    return sum + fieldList.filter(Boolean).length;
  }, 0);

  const total = members.length * fieldsPerMember;

  useEffect(() => {
    reportStatus({ id: sectionId, dirty, filled, total });
  }, [sectionId, dirty, filled, total, reportStatus]);

  useEffect(() => {
    if (!registerReset) return;
    registerReset(sectionId, () => reset({ members: defaultMembers }));
  }, [sectionId, registerReset, reset, defaultMembers]);

  useEffect(() => {
    if (!registerGetValues) return;
    registerGetValues(sectionId, () => ({
      values: getValues(),
      dirtyFields: formState.dirtyFields,
    }));
  }, [sectionId, registerGetValues, getValues, formState.dirtyFields]);
  const blankMember: TeamMember = {
    nome: "",
    cargo: "",
    linkedin: "",
    bio: withBio ? "" : undefined,
    dedicacao: "",
    participacao: undefined,
  };

  return (
    <section
      className={
        flat ? "space-y-6" : "glass-card rounded-3xl p-8 lg:p-10 space-y-6"
      }
    >
      {!hideHeader && (
        <header className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight italic">
              {title}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          </div>
          <span className="pill">{pillLabel(members.length)}</span>
        </header>
      )}

      <div className="space-y-4">
        {fields.map((field, index) => (
          <TeamMemberCard
            key={field.id}
            index={index}
            fieldPrefix={`members.${index}`}
            register={register}
            setValue={setValue}
            withBio={withBio}
            onRemove={() => remove(index)}
            initialPhoto={index < defaultMembers.length}
            photoUrl={field.fotoUrl}
            memberName={field.nome}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => append(blankMember)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-primary/30 text-primary text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {addLabel}
      </button>
    </section>
  );
}
