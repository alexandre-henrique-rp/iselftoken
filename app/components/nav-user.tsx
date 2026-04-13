import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
  User2,
} from "lucide-react";
import { useNavigate } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { useAuth } from "~/context";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const hasAvatarUrl = Boolean(user.avatar) && user.avatar.startsWith("http");
  const initials = user.name
    ? user.name
        .split(" ")
        .map((name) => name[0])
        .join("")
    : "";
  const { isMobile } = useSidebar();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };
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
                {hasAvatarUrl ? (
                  <AvatarImage src={user.avatar} alt={user.name || ""} />
                ) : null}
                <AvatarFallback className="rounded-lg">
                  {initials || "CN"}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name || ""}</span>
                <span className="truncate text-xs">{user.email || ""}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {hasAvatarUrl ? (
                    <AvatarImage src={user.avatar} alt={user.name || ""} />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {initials || "CN"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.name || ""}
                  </span>
                  <span className="truncate text-xs">{user.email || ""}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/plans")}>
                <Sparkles />
                Upgrade de plano
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate("/perfil")}>
                <User2 />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/financeiro")}>
                <CreditCard />
                Financeiro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/notificacoes")}>
                <Bell />
                Notificações
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
