import { Users, GraduationCap, Briefcase } from "lucide-react";

interface TeamQuickStatsProps {
  foundersCount: number;
  advisorsCount: number;
  employeesCount: number;
}

export function TeamQuickStats({ foundersCount, advisorsCount, employeesCount }: TeamQuickStatsProps) {
  const items = [
    { icon: Users, label: "Founders", value: foundersCount },
    { icon: GraduationCap, label: "Advisors", value: advisorsCount },
    { icon: Briefcase, label: "Time", value: employeesCount },
  ];

  return (
    <div className="glass-card rounded-3xl p-6">
      <h3 className="text-sm font-black italic tracking-tight mb-4">Composição da Startup</h3>
      <div className="space-y-3">
        {items.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
              {label}
            </p>
            <p className="ml-auto text-2xl font-black italic text-foreground">
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
