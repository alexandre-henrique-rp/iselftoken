import * as React from "react";

import type { User } from "~/types/user";

import { NavMain } from "~/components/nav-main";
import { NavProjects } from "~/components/nav-projects";
import { NavUser } from "~/components/nav-user";
import { TeamSwitcher } from "~/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/components/ui/sidebar";
import { PrimaryMenu, SecondaryMenu } from "~/data/menu/rotas";
import { FilterRote } from "~/filter/filterPlanStartup";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: User | null;
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  // TODO: implementar o plano corretamente
  const iniciais = user?.nome
    ? user.nome
        .split(" ")
        .map((name: string) => name[0])
        .join("")
    : undefined;
  const avatar = user?.avatar?.url || iniciais || "";

  const profile = {
    name: user?.nome || "",
    email: user?.email || "",
    avatar: avatar,
  };

  const filteredRoutesMain = user ? FilterRote(user, PrimaryMenu) : [];
  const filteredRoutesExtra = user ? FilterRote(user, SecondaryMenu) : [];



  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher plan={user?.role || "USER"} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredRoutesMain} />
        <NavProjects projects={filteredRoutesExtra} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={profile} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
