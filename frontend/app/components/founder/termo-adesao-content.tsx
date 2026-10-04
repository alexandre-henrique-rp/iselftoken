interface TermoAdesaoContentProps {
  /**
   * HTML dark-ready gerado por `getTermoAdesaoBody()` (server-side ou
   * client-side). Conteudo ja passou por escape HTML dos placeholders.
   */
  html: string;
}

/**
 * TermoAdesaoContent — renderizador dark do texto integral do Termo de Adesao.
 *
 * Wrapper glass-panel com tipografia editorial consistente (Inter, scale
 * base 15-16px, line-height 1.75). Recebe o HTML ja processado por
 * `getTermoAdesaoBody()` (helper que extrai o `<body>` e reescreve o
 * `<style>` inline para tokens dark do shell).
 *
 * Separacao de responsabilidade:
 * - lib/termo-adesao-text.ts -> fonte da verdade do texto (testada)
 * - termo-adesao-content.tsx (este arquivo) -> shell visual do documento
 *
 * Renderiza apenas o conteudo HTML. O header editorial + banner legal vivem
 * em `termo-adesao-actions.tsx` (CTAs dentro do EditorialWalletShell) e
 * `termo-adesao-legal-banner.tsx`.
 */
export function TermoAdesaoContent({ html }: TermoAdesaoContentProps) {
  return (
    <article
      data-testid="termo-adesao-content"
      className="glass-panel rounded-2xl border border-white/5 px-6 py-8 md:px-12 md:py-14"
    >
      {/* eslint-disable-next-line react/no-danger */}
      <div
        className="termo-adesao-prose text-[15px] md:text-base leading-[1.75] text-on-surface"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
