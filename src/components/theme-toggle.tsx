"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

/**
 * ThemeToggle: alterna entre light/dark respeitando next-themes
 * - Usa mounted guard para evitar mismatch de hidratação
 * - Integra com shadcn Button
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Toggle theme" title="Toggle theme" disabled>
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = (theme ?? resolvedTheme) === "dark";
  const nextTheme = isDark ? "light" : "dark";
  const Icon = isDark ? Sun : Moon;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
}
