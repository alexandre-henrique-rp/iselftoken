import { useNavigate } from "react-router";

import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

export function TeamSwitcher({ plan }: { plan: string }) {
  const navigate = useNavigate();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              onClick={() => {
                navigate("/home");
              }}
            >
              <div className="bg-sidebar-primary flex aspect-square size-8 overflow-hidden rounded-lg">
                <img
                  src="/icon600x600.png"
                  alt="Logo iSelfToken"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">ISelfToken</span>
                <span className="truncate text-xs">{plan}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
