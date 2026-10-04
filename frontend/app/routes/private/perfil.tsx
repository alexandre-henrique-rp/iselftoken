import { ProfilePage } from "~/components/profile/profile-page";
import type { Route } from "./+types/perfil";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Meu Perfil | iSelfToken" },
    {
      name: "description",
      content:
        "Gerencie seus dados, sua verificação de identidade e o plano da sua conta iSelfToken.",
    },
  ];
}

export default function PerfilRoute() {
  return <ProfilePage />;
}
