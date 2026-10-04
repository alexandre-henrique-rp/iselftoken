import { cn } from "~/lib/utils";

interface AdminHeaderProps {
  /** Classes adicionais (ex: ocultar em mobile). */
  className?: string;
}

/** Header editorial do dashboard administrativo. */
export function AdminHeader({ className }: AdminHeaderProps) {
  return (
    <header
      className={cn(
        "relative mb-4 flex flex-col justify-between gap-2 md:mb-5 md:flex-row md:items-baseline",
        className,
      )}
    >
      <div className="absolute -left-6 top-0 hidden h-full w-px bg-linear-to-b from-primary via-primary/20 to-transparent opacity-40 lg:block" />
      <div>
        <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-primary">
          Executive Overview
        </span>
        <h1 className="text-4xl font-black leading-none tracking-tighter text-foreground sm:text-5xl lg:text-[3.25rem]">
          Financial <span className="text-primary italic">Health</span>
        </h1>
      </div>
    </header>
  );
}
