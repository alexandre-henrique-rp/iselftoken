<<<<<<< Updated upstream
"use client"

import { IconDotsVertical, IconLogout, IconSettings } from "@tabler/icons-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
=======
'use client';

import { ChevronsUpDown, LogOut } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
>>>>>>> Stashed changes
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
<<<<<<< Updated upstream
} from "@/components/ui/dropdown-menu"
=======
} from '@/components/ui/dropdown-menu';
>>>>>>> Stashed changes
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
<<<<<<< Updated upstream
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()

  async function handleLogout() {
    try {
      await fetch("/api/auth", { method: "DELETE" })
    } catch {
      // noop: mesmo em erro, tentamos seguir com o redirect
    } finally {
      // Garante saída da área protegida
      router.push("/login")
      router.refresh()
    }
  }
=======
} from '@/components/ui/sidebar';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';
import { Rotas } from '@/types/rotasTypes';


interface NavUserProps {
  user: SessionNext.Client;
  itens: Rotas.Types[];
}

export function NavUser({ user, itens }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { logout } = useSession();

  const handleLogout = async () => {
    try {
      await logout();
      toast('Saiu com sucesso');
    } catch (error) {
      console.log('🚀 ~ handleLogout ~ error:', error);
      toast('Erro ao sair', {
        description:
          error instanceof Error ? error.message : 'Erro desconhecido',
      });
    }
  };

  const IniciaisSession = () => {
    // verificar quantas palavras tem no nome
    const words = user.name.split(' ');
    let initials = '';
    for (let i = 0; i < words.length; i++) {
      initials += words[i].charAt(0).toUpperCase();
    }
    // retornar no máximo 2 iniciais
    if (initials.length > 2) {
      initials = initials.slice(0, 2);
    }
    return initials;
  };

  const iniciais = IniciaisSession();

>>>>>>> Stashed changes

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
<<<<<<< Updated upstream
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src="https://ui.shadcn.com/avatars/shadcn.jpg" alt={user.name} />
                <AvatarFallback className="rounded-lg">CN</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
=======
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user.avatar && (
                  <AvatarImage src={user.avatar} alt={user.name} />
                )}
                <AvatarFallback className="rounded-lg">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
            side={isMobile ? 'bottom' : 'right'}
>>>>>>> Stashed changes
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
<<<<<<< Updated upstream
                  <AvatarImage src="https://ui.shadcn.com/avatars/shadcn.jpg" alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
=======
                  <AvatarImage
                    src={user.avatar || '/avatars/user.jpg'}
                    alt={user.name}
                  />
                  <AvatarFallback className="rounded-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
>>>>>>> Stashed changes
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
<<<<<<< Updated upstream
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <IconSettings />
                Perfil
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} aria-label="Fazer logout">
              <IconLogout />
              Log out
=======

            {itens.map((item) => (
              <>
                <DropdownMenuItem>
                  <a href={item.url} className="flex items-center w-full gap-3">
                    {item.icon && <item.icon className="mr-2 h-4 w-4 shrink-0" />}
                    <span>{item.nome}</span>
                  </a>
                </DropdownMenuItem>
              </>
            ))}

            <DropdownMenuItem className="flex items-center justify-between">
              <span className="flex items-center">Tema</span>
              <AnimatedThemeToggler className="h-6 w-6" />
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleLogout}
              className="text-[#ef4444] dark:text-[#ef4444]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
>>>>>>> Stashed changes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
<<<<<<< Updated upstream
  )
=======
  );
>>>>>>> Stashed changes
}
