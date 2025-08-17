"use client";

/**
 * EmptyState
 * Placeholder simples para indicar ausência de dados.
 */
export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
      {text}
    </div>
  );
}
