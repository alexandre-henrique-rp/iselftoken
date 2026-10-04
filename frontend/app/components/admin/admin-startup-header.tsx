export function AdminStartupHeader() {
  return (
    <header className="mb-6 md:mb-8 space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-8 h-px bg-primary" aria-hidden="true" />
        <span className="text-primary font-semibold uppercase tracking-[0.24em] text-[10px]">
          Gestão do ecossistema
        </span>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
        Gestão de Startups
      </h1>
      <p className="max-w-2xl text-sm md:text-base text-muted-foreground">
        Acompanhe cadastros, revise a curadoria e mantenha a vitrine do
        ecossistema organizada.
      </p>
    </header>
  );
}
