"use client"

<<<<<<< Updated upstream
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconReport,
  IconUsers,
  IconHome2,
  IconBell,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
=======
import * as React from "react"
import Image from "next/image"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
import Link from "next/link"
import Image from "next/image"
import { NavSecondary } from "./nav-secondary"
 

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: IconDashboard,
      role: "startup"
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: IconHome2,
      role: "investidor"
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
      role: "startup"
    },
    {
      title: "Projects",
      url: "#",
      icon: IconFolder,
      role: "investidor"
    },
    {
      title: "Team",
      url: "#",
      icon: IconUsers,
      role: "investidor"
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
      role: "startup"
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
      role: "investidor"
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
      role: "investidor"
    },
  ],
  navSecondary: [
    {
      title: "Notificações",
      url: "#",
      icon: IconBell,
    },
    {
      title: "Ajuda",
      url: "#",
      icon: IconHelp,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
      role: "startup"
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
      role: "startup"
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
      role: "investidor"
    },
  ],
}

interface Props extends React.ComponentProps<typeof Sidebar> {
  role: string;
}

export function AppSidebar({ role, ...props }: Props) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/home" className="w-full flex justify-center gap-2 bg-black">
               <Image src="/logo.png" alt="Logo" width={100} height={100} />
              </Link>
=======
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
>>>>>>> Stashed changes
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
<<<<<<< Updated upstream
        <NavMain items={data.navMain} role={role} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
=======
        <NavMain items={getItemsByMenu("geral")} />
        <NavProjects internal={getItemsByMenu("interno")} />
        <NavSecondary items={getItemsByMenu("config")} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={session} itens={getItemsByMenu('user')} />
>>>>>>> Stashed changes
      </SidebarFooter>
    </Sidebar>
  )
}
