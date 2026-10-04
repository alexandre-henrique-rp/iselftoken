import React from "react";
import type { ReactNode } from "react";

interface LoginContainerProps {
  hero: ReactNode;
  form: ReactNode;
}

export function LoginContainer({ hero, form }: LoginContainerProps) {
  return (
    <div className="bg-background text-foreground min-h-screen flex items-center justify-center overflow-hidden relative">
      {/* Background Structural Element */}
      <div className="fixed inset-0 z-0 bg-mesh opacity-60"></div>
      <div className="fixed top-0 left-20 w-px h-full bg-primary/20 z-0 hidden lg:block"></div>
      <div className="fixed top-32 left-0 w-full h-px bg-primary/10 z-0 hidden lg:block"></div>

      {/* Main Container: Split Screen Layout */}
      <main className="relative z-10 w-full grid lg:grid-cols-2 min-h-screen">
        {/* Visual Column */}
        {hero}

        {/* Form Column */}
        <div className="flex items-center justify-center p-6 sm:p-10 md:p-12 lg:p-16 xl:p-20 bg-background/40 backdrop-blur-md border-l border-primary/5">
          {form}
        </div>
      </main>

      {/* Kinetic Decorative Elements */}
      <div className="fixed bottom-12 right-12 flex flex-col gap-2 z-20 pointer-events-none">
        <div className="w-8 h-[2px] bg-primary self-end"></div>
        <div className="w-16 h-[2px] bg-primary/40 self-end"></div>
        <div className="w-12 h-[2px] bg-primary/10 self-end"></div>
      </div>
    </div>
  );
}
