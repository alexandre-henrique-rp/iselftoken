import type { JSX } from "react";

/**
 * @name Af2Footer
 * @description Rodapé da tela AF2 exibido em telas maiores.
 *
 * @returns {JSX.Element} Links e copyright.
 */
export function Af2Footer(): JSX.Element {
  return (
    <div className="mt-auto hidden lg:flex items-center gap-6 text-sm text-stone-500 pt-12">
      <span>© 2026 iSelfToken</span>
      <a href="#" className="hover:text-stone-300 transition-colors">
        Ajuda
      </a>
      <a href="#" className="hover:text-stone-300 transition-colors">
        Privacidade
      </a>
    </div>
  );
}
