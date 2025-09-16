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
import { fundadorRoutes } from "@/rotas/private/fundador"
import { consultorRoutes } from "@/rotas/private/consultor"
import { investorRoutes } from "@/rotas/private/investidor"


interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role: string;
  session: SessionNext.Client;
}

export function AppSidebar({ role, session, ...props }: AppSidebarProps) {

  const MenuFilter = role === "fundador" ? fundadorRoutes : role === "admin" ? adminRoutes : role === "afiliado" ? consultorRoutes : investorRoutes;

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
        <NavMain items={MenuFilter.filter(item => item.menu === "geral")} />
        <NavProjects internal={MenuFilter.filter(item => item.menu === "interno")} />
        <NavSecondary items={MenuFilter.filter(item => item.menu === "config")} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session} />
      </SidebarFooter>
    </Sidebar>
  )
}
