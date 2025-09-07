'use client';

import { ChevronsUpDown, LogOut, User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { AnimatedThemeToggler } from '@/components/magicui/animated-theme-toggler';
import { useSession } from '@/hooks/useSession';
import { toast } from 'sonner';
import Link from 'next/link';

interface NavUserProps {
  user: SessionNext.Client;
}

export function NavUser({ user }: NavUserProps) {
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <Link href="/perfil" className="flex items-center gap-2">
                <User className="mr-2 h-4 w-4" />
                Perfil
              </Link>
            </DropdownMenuItem>

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
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
