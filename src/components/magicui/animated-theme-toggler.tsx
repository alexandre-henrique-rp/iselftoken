"use client";

import { Moon, SunDim } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

type props = {
  className?: string;
};

export const AnimatedThemeToggler = ({ className }: props) => {
  // Integra com next-themes para persistência e evitar conflito com Provider
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

  const changeTheme = async () => {
    if (!buttonRef.current) return;

    const isDark = resolvedTheme === "dark";
    const next = isDark ? "light" : "dark";

    // Mantém a animação de View Transitions, mas delega a troca ao next-themes
    const startTransition = (cb: () => void) => {
      // Alguns navegadores ainda não suportam startViewTransition
      // Fallback: executa diretamente
      const svt = document.startViewTransition?.(cb);
      if (!svt) {
        cb();
        return Promise.resolve();
      }
      return svt.ready as Promise<void>;
    };

    await startTransition(() => {
      flushSync(() => setTheme(next));
    });

    // Calcula e executa o efeito de revelação
    const { top, left, width, height } =
      buttonRef.current.getBoundingClientRect();
    const y = top + height / 2;
    const x = left + width / 2;

    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRad = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${maxRad}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 700,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  };

  const isDarkMode = resolvedTheme === "dark";

  return (
    <button
      ref={buttonRef}
      onClick={changeTheme}
      className={cn("inline-flex h-10 w-10 items-center justify-center", className)}
      aria-label={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDarkMode ? "Mudar para tema claro" : "Mudar para tema escuro"}
      disabled={!mounted}
    >
      {isDarkMode ? <SunDim className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};
