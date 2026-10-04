import type { ReactNode } from "react";

interface RegisterContainerProps {
  children: ReactNode;
}

export function RegisterContainer({ children }: RegisterContainerProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-20 font-sans text-foreground">
      <div className="pointer-events-none absolute -right-[10%] -top-[20%] h-[600px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-xl">{children}</div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 rotate-90 select-none text-8xl font-black tracking-tighter text-primary/[0.025] lg:block"
      >
        iSelfToken
      </span>
    </main>
  );
}
