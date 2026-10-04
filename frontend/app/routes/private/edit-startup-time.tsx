import { useCallback, useEffect, useState } from "react";
import { useRouteLoaderData } from "react-router";
import type { SectionStatus } from "~/components/founder/_section-props";
import type { loader as layoutLoader } from "./edit-startup-layout";
import { AdvisorsSection } from "~/components/founder/advisors-section";
import { TipCard } from "~/components/founder/edit-startup-rail";
import { EmployeesSection } from "~/components/founder/employees-section";
import { FoundersSection } from "~/components/founder/founder-section";
import { TeamQuickStats } from "~/components/founder/team-quick-stats";
import { useEditStartupForm } from "~/lib/edit-startup-form-context";
import type { Route } from "./+types/edit-startup-time";

// S6-T01 — Aba Time apenas REGISTRA valores (founders, advisors, employees).
// O save consolidado vive no layout.

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Time | Editar Startup | iSelfToken" },
    {
      name: "description",
      content: "Founders, advisors e membros do time da sua startup.",
    },
  ];
}

const SECTION_LABELS: Record<string, string> = {
  founders: "Founders",
  advisors: "Advisors",
  employees: "Time",
};

export default function EditStartupTimePage({ params }: Route.ComponentProps) {
  void params;
  const startup = useRouteLoaderData<typeof layoutLoader>(
    "routes/private/edit-startup-layout",
  );
  const {
    setDirtyCount,
    registerSectionReset,
    registerSectionGetValues,
    resetAllSections,
  } = useEditStartupForm();
  const [statuses, setStatuses] = useState<Record<string, SectionStatus>>({});

  const reportStatus = useCallback((next: SectionStatus) => {
    setStatuses((prev) => {
      const cur = prev[next.id];
      if (
        cur &&
        cur.dirty === next.dirty &&
        cur.filled === next.filled &&
        cur.total === next.total
      )
        return prev;
      return { ...prev, [next.id]: next };
    });
  }, []);

  useEffect(() => {
    const total = Object.values(statuses).reduce((s, n) => s + n.dirty, 0);
    setDirtyCount(total);
  }, [statuses, setDirtyCount]);

  useEffect(() => {
    resetAllSections();
  }, [resetAllSections]);

  const completenessSections = Object.keys(SECTION_LABELS).map((id) => {
    const s = statuses[id];
    return {
      label: SECTION_LABELS[id],
      filled: s?.filled ?? 0,
      total: s?.total ?? 0,
    };
  });

  const foundersCount = Math.round((statuses["founders"]?.total ?? 0) / 4);
  const advisorsCount = Math.round((statuses["advisors"]?.total ?? 0) / 3);
  const employeesCount = Math.round((statuses["employees"]?.total ?? 0) / 3);

  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-5 xl:gap-6">
      <div className="min-w-0 space-y-5">
        <FoundersSection
          startup={startup}
          reportStatus={reportStatus}
          registerReset={registerSectionReset}
          registerGetValues={registerSectionGetValues}
        />
        <AdvisorsSection
          reportStatus={reportStatus}
          registerReset={registerSectionReset}
          registerGetValues={registerSectionGetValues}
        />
        <EmployeesSection
          startup={startup}
          reportStatus={reportStatus}
          registerReset={registerSectionReset}
          registerGetValues={registerSectionGetValues}
        />
      </div>

      <aside className="h-fit w-full self-start space-y-4 lg:sticky lg:top-32">
        <TipCard>
          Preencher esta aba com seus founders, advisors e time completo aumenta
          em <strong>47% as chances de conversão</strong> na venda de seus
          tokens.
        </TipCard>
        <TeamQuickStats
          foundersCount={foundersCount}
          advisorsCount={advisorsCount}
          employeesCount={employeesCount}
        />
      </aside>
    </div>
  );
}
