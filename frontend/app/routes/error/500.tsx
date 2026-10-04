import { useNavigate } from "react-router";
import { ErrorContainer } from "~/components/error/error-container";
import type { Route } from "./+types/500";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "500 - Erro Interno do Servidor | iSelfToken" },
  ];
}

export default function Error500() {
  const navigate = useNavigate();
  

  return (
    <ErrorContainer
      code="500"
      title="Erro Interno do Servidor"
      description="Ocorreu um problema inesperado em nossos servidores. Estamos trabalhando para resolver o mais rápido possível."
    >
      <button
        onClick={() => navigate(0)}
        className="group relative px-10 py-4 bg-linear-to-br from-primary to-primary-container rounded-full text-black font-black tracking-widest text-sm transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(213,0,249,0.3)] hover:shadow-[0_0_30px_rgba(213,0,249,0.6)]"
      >
        TENTAR NOVAMENTE
      </button>
      <button
        onClick={() => navigate(-1)}
        className="px-10 py-4 bg-transparent border border-white/20 rounded-full text-foreground font-semibold tracking-widest text-sm transition-all duration-300 hover:bg-white/5 hover:border-white/40 active:scale-95 flex items-center justify-center h-14"
      >
        VOLTAR
      </button>
    </ErrorContainer>
  );
}
