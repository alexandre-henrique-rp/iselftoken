interface DashboardHeaderProps {
  total: number;
}

/**
 * @name DashboardHeader
 * @description Renderiza o cabeçalho da página Minhas Startups.
 */
export function DashboardHeader({ total }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight text-stone-100">
        Minhas Startups
      </h1>
      <p className="text-sm text-stone-400">
        {total} startup{total === 1 ? "" : "s"} cadastrada{total === 1 ? "" : "s"}
      </p>
    </header>
  );
}
