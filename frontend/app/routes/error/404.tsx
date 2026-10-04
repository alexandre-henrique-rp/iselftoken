import { useNavigate } from "react-router";
import { ErrorContainer } from "~/components/error/error-container";
import type { Route } from "./+types/404";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "404 - Página Não Encontrada | iSelfToken" },
  ];
}

export default function Error404() {
  const navigate = useNavigate();

  return (
    <ErrorContainer
      code="404"
      title="Página Não Encontrada"
      description="A página que você está procurando não existe ou foi movida. Verifique o link e tente novamente."
    >
      <button
        onClick={() => navigate(-1)}
        className="flex h-14 items-center justify-center rounded-full border border-white/20 px-10 transition-all hover:bg-white/5 text-foreground font-bold tracking-widest text-sm"
      >
        VOLTAR
      </button>
    </ErrorContainer>
  );
}
