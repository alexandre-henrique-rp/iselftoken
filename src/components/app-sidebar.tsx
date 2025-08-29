"use client"

import * as React from "react"
import {
  Bell,
  ChartBar,
  Home,
  HelpCircle,
  Users,
  Briefcase,
  TrendingUp,
  FileText,
  Database,
} from "lucide-react"
import Image from "next/image"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role?: string;
}

const data = {
  user: {
    name: "Usuário",
    email: "usuario@iselftoken.com",
    avatar: "/avatars/user.jpg",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
      role: "all",
      items: [
        {
          title: "Visão Geral",
          url: "/dashboard",
        },
        {
          title: "Métricas",
          url: "/dashboard/metrics",
        },
      ],
    },
    {
      title: "Investimentos",
      url: "/investments",
      icon: TrendingUp,
      role: "investidor",
      items: [
        {
          title: "Portfólio",
          url: "/investments/portfolio",
        },
        {
          title: "Oportunidades",
          url: "/investments/opportunities",
        },
        {
          title: "Histórico",
          url: "/investments/history",
        },
      ],
    },
    {
      title: "Startups",
      url: "/startups",
      icon: Briefcase,
      role: "startup",
      items: [
        {
          title: "Minha Startup",
          url: "/startups/profile",
        },
        {
          title: "Captação",
          url: "/startups/fundraising",
        },
        {
          title: "Relatórios",
          url: "/startups/reports",
        },
      ],
    },
    {
      title: "Analytics",
      url: "/analytics",
      icon: ChartBar,
      role: "all",
      items: [
        {
          title: "Performance",
          url: "/analytics/performance",
        },
        {
          title: "Relatórios",
          url: "/analytics/reports",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Notificações",
      url: "/notification",
      icon: Bell,
    },
    {
      title: "Ajuda",
      url: "/help",
      icon: HelpCircle,
    },
  ],
  projects: [
    {
      name: "Documentos",
      url: "/documents",
      icon: FileText,
    },
    {
      name: "Base de Dados",
      url: "/database",
      icon: Database,
    },
    {
      name: "Equipe",
      url: "/team",
      icon: Users,
    },
  ],
}

export function AppSidebar({ role = "all", ...props }: AppSidebarProps) {
  // Filtrar itens de navegação baseado no role
  const filteredNavMain = data.navMain.filter(item => 
    item.role === "all" || item.role === role
  );

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard" className="flex items-center gap-3">
                <div className="bg-[#014f86] text-white flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image 
                    src="/logo.png" 
                    alt="iSelfToken" 
                    width={20} 
                    height={20} 
                    className="object-contain"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium text-[#014f86] dark:text-blue-400">iSelfToken</span>
                  <span className="truncate text-xs text-gray-600 dark:text-gray-400">
                    {role === "investidor" ? "Investidor" : role === "startup" ? "Startup" : "Plataforma"}
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        <NavProjects projects={data.projects} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
