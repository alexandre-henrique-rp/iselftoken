// import { GetSessionServer } from "@/context/auth"
// import { redirect } from "next/navigation"
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { WhatsappHelpButton } from '@/components/WhatsappHelpButton';

interface Props {
  children: React.ReactNode;
}
// Layout protegido: valida a sessão no servidor para evitar loading no client
export default async function ProtectedLayout({ children }: Props) {
  // const session = (await GetSessionServer()) as SessionNext.Session | null

  // // Sem sessão ou sem usuário -> manda pro login imediatamente (SSR)
  // const hasUser = !!session?.user
  // if (!session || !hasUser) {
  //   redirect("/login")
  // }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {children}
        {/* Botão flutuante de ajuda/WhatsApp */}
        <WhatsappHelpButton />
      </SidebarInset>
    </SidebarProvider>
  );
}
