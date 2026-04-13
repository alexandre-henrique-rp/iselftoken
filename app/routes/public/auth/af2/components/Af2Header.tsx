import { Globe } from "lucide-react";
import type { JSX } from "react";

export type Af2HeaderProps = {
  onLocaleClick?: () => void;
};

/**
 * @name Af2Header
 * @description Cabeçalho reutilizável da tela AF2.
 *
 * @param {Af2HeaderProps} props - Ações do cabeçalho.
 * @returns {JSX.Element} Cabeçalho com logo e seletor de idioma.
 */
export function Af2Header({ onLocaleClick }: Af2HeaderProps): JSX.Element {
  return (
    <div className="flex justify-between items-center lg:justify-start mb-12">
      <a href="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center group-hover:border-[#d500f9]/30 transition-colors">
          <span className="text-lg font-bold" style={{ color: "#d500f9" }}>
            i
          </span>
        </div>
        <span
          className="text-xl font-bold tracking-tight"
          style={{ color: "#d500f9" }}
        >
          iSelfToken
        </span>
      </a>
      <button
        type="button"
        onClick={onLocaleClick}
        className="lg:hidden p-2 text-stone-500 hover:text-stone-300 transition-colors"
      >
        <Globe className="w-5 h-5" />
      </button>
    </div>
  );
}
