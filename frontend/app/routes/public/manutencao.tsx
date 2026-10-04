import type { Route } from "./+types/manutencao";

export function meta() {
  return [
    { title: "Manutenção — iSelfToken" },
    { name: "description", content: "Sistema em manutenção. Pagamentos temporariamente indisponíveis." },
  ];
}

export default function Manutencao() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full mx-4 text-center">
        {/* Ícone de engrenagem */}
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-amber-400 animate-spin"
            style={{ animationDuration: "3s" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">
          Sistema em Manutenção
        </h1>

        <p className="text-lg text-slate-300 mb-6">
          Our sistema de pagamentos está temporariamente indisponível.
          Estamos trabalhando para resolver o mais rápido possível.
        </p>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-amber-400">Atenção:</span>{" "}
            Novos usuários não conseguirão assinar planos até a normalização
            do sistema de pagamento.
          </p>
        </div>

        <p className="text-sm text-slate-500">
          Se você já possui um plano ativo, continue usando o sistema normalmente.
        </p>

        <div className="mt-8">
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
          >
            Voltar ao Login
          </a>
        </div>
      </div>
    </div>
  );
}
