import type { ReactNode } from "react";
import { Outlet } from "react-router";
import { AuthHero } from "./components/AuthHero";

type LayoutPublicProps = {
  children?: ReactNode;
};

export default function LayoutPublic({ children }: LayoutPublicProps) {
  return (
    <div className="min-h-screen w-full bg-background font-sans text-foreground lg:grid lg:grid-cols-2">
      {children ?? <Outlet />}
      <AuthHero />
    </div>
  );
}
