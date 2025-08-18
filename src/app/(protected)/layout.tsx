// import { GetSessionServer } from "@/context/auth"
// import { redirect } from "next/navigation"
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { WhatsappHelpButton } from '@/components/WhatsappHelpButton';
import { GetSessionServer } from '@/context/auth';

interface Props {
  children: React.ReactNode;
}
// Layout protegido: valida a sessão no servidor para evitar loading no client
export default async function ProtectedLayout({ children }: Props) {
 const session = await GetSessionServer()
 const role = session?.user?.role

  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset>
        {children}
        {/* Botão flutuante de ajuda/WhatsApp */}
        <WhatsappHelpButton />
      </SidebarInset>
    </SidebarProvider>
  );
}
