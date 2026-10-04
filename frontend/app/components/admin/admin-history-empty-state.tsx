export function AdminHistoryEmptyState({ erro }: { erro?: string | null }) {
  if (erro) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center">
        <p className="text-muted-foreground font-medium">{erro}</p>
      </div>
    );
  }
  return (
    <div className="glass-panel rounded-3xl p-16 text-center">
      <p className="text-lg font-black text-foreground">
        Nenhum evento encontrado.
      </p>
      <p className="text-sm text-muted-foreground mt-2">
        Ajuste os filtros acima.
      </p>
    </div>
  );
}
