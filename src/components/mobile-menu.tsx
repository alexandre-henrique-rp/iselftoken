"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelect } from "@/components/language-select";
import { TrText } from "@/components/tr-text";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

/**
 * MobileMenu
 * Menu hamburger para mobile com as opções:
 * - Entrar (link para /login)
 * - Mudança de tema (ThemeToggle)
 * - Seleção de linguagem (LanguageSelect)
 */
export function MobileMenu() {

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle>iSelfToken</SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-4">
          <SheetClose asChild>
            <Link href="/login">
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-600/90">
                <TrText k="home.header.login" />
              </Button>
            </Link>
          </SheetClose>

          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm text-muted-foreground">Tema</span>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm text-muted-foreground">Idioma</span>
            <LanguageSelect defaultLocale="pt-BR" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
