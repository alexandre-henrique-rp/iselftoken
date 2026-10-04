/**
 * Watermark de marca no fundo da dashboard.
 * Apenas o logo "iSelfToken" gigante desfocado no canto inferior direito.
 * Posicionado com `fixed -z-10` para não interferir em cliques.
 */
export function DashboardBackgroundWatermark() {
  return (
    <div className="fixed -bottom-10 -right-10 opacity-[0.02] pointer-events-none select-none -z-10 overflow-hidden">
      <h1 className="text-[12vw] font-black italic tracking-tighter uppercase leading-none">
        iSelfToken
      </h1>
    </div>
  );
}
