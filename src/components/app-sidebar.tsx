"use client"

import * as React from "react"
import Image from "next/image"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NavProjects } from "./nav-projects"
import { adminRoutes } from "@/rotas/private/admin"
import { Rotas } from "@/types/rotasTypes"
import { financeiroRoutes } from "@/rotas/private/finaceiro"
import { complianceRouter } from "@/rotas/private/compliance"
import { userRoutes } from "@/rotas/private/user"


interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role: string;
  session: SessionNext.Client;
}

export function AppSidebar({ role, session, ...props }: AppSidebarProps) {
 console.log("🚀 ~ AppSidebar ~ session:", session)
 
  const MenuFilter =
    role === 'admin'
      ? adminRoutes
      : role === 'financeiro'
        ? financeiroRoutes
        : role === 'compliance'
          ? complianceRouter
          : userRoutes;

  // Type-safe filtering functions
  const getItemsByMenu = (menuType: 'geral' | 'interno' | 'config' | 'user' | 'private'): Rotas.Types[] => {
    return MenuFilter.filter(item => item.menu === menuType) as Rotas.Types[];
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard" className="flex items-center gap-3">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image 
                    src="/icon600x600.png" 
                    alt="iSelfToken" 
                    width={30} 
                    height={30} 
                    className="object-contain rounded-lg"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-[#303030] dark:text-[#FFFFFF]">iSelfToken</span>
                  <span className="truncate text-xs text-[#d500f9]">
                    {role === "investidor" ? "Investidor" : role === "fundador" ? "Fundador" : "Afiliado"}
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={getItemsByMenu("geral")} />
        <NavProjects internal={getItemsByMenu("interno")} />
        <NavSecondary items={getItemsByMenu("config")} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session} itens={getItemsByMenu('user')} />
      </SidebarFooter>
    </Sidebar>
  )
}
