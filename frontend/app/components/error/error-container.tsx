import React, { type ReactNode } from "react";

interface ErrorContainerProps {
  code: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function ErrorContainer({ code, title, description, children }: ErrorContainerProps) {
  return (
    <div className="bg-black font-sans text-on-surface overflow-hidden min-h-screen flex items-center justify-center relative">
      {/* Kinetic Signature: Background Watermark */}
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden select-none">
        <span className="text-[20vw] font-black uppercase tracking-tighter leading-none">iSelfToken</span>
      </div>

      {/* Radial Gradient Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_80%)] z-10 pointer-events-none"></div>

      {/* Main Content Canvas */}
      <main className="relative z-20 flex flex-col items-center justify-center text-center px-6 max-w-2xl animate-in fade-in zoom-in-95 duration-1000">
        {/* Large Architectural Number */}
        <div className="mb-2 relative">
          <span className="text-[12rem] md:text-[18rem] font-black leading-none tracking-tight text-primary neon-glow font-sans drop-shadow-[0_0_30px_rgba(213,0,249,0.5)]">
            {code}
          </span>
          {/* Ghost Shadow behind the code */}
          <span className="absolute inset-0 blur-3xl opacity-20 bg-primary rounded-full scale-50"></span>
        </div>

        {/* Semantic Text Block */}
        <div className="space-y-6 mb-12">
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-[0.2em] text-white uppercase font-sans">
            {title}
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl font-light leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>

        {/* Action Grid */}
        <div className="flex flex-col md:flex-row items-center gap-6 mt-4">
          {children}
        </div>
      </main>

      {/* Structural Overlays: Grid Texture */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-5" style={{ backgroundImage: "linear-gradient(rgba(213, 0, 249, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(213, 0, 249, 0.1) 1px, transparent 1px)", backgroundSize: "50px 50px" }}>
      </div>

      {/* Visual Texture Layer - Fixed CSS Noise */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC42NSIgbnVtT2N0YXZlcz0iMyIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIvPjwvc3ZnPg==')]"></div>    </div>
  );
}
