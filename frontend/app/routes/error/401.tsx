import { Link } from "react-router";
import { ErrorContainer } from "~/components/error/error-container";
import type { Route } from "./+types/401";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "401 - Acesso Não Autorizado | iSelfToken" },
  ];
}

export default function Error401() {
  return (
    <ErrorContainer
      code="401"
      title="Acesso Não Autorizado"
      description="Sua sessão expirou ou você não tem permissão para acessar esta página. Por favor, realize o login para continuar."
    >
      <Link
        to="/login"
        className="group relative flex h-14 items-center justify-center overflow-hidden rounded-full bg-linear-to-r from-primary to-primary-container px-10 transition-all hover:scale-[1.02] active:scale-95 flex-1 min-w-[200px]"
      >
        <span className="text-black font-black tracking-widest text-sm relative z-10">FAZER LOGIN</span>
        <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
      </Link>
      <Link
        to="/"
        className="flex h-14 items-center justify-center rounded-full border border-white/20 px-10 transition-all hover:bg-white/5 text-foreground font-bold tracking-widest text-sm flex-1 min-w-[200px]"
      >
        VOLTAR PARA HOME
      </Link>
    </ErrorContainer>
  );
}
