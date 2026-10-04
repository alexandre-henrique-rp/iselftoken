import { Link } from "react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

export function AdminHistoryPagination({
  qs,
  page,
  totalPages,
}: {
  qs: string;
  page: number;
  totalPages: number;
}) {
  const build = (p: number) => {
    const params = new URLSearchParams(qs);
    params.set("page", String(p));
    return `/admin/history?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link
          to={build(page - 1)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-foreground text-[10px] font-black uppercase tracking-widest"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="text-[11px] font-black text-muted-foreground tabular-nums">
        {page} / {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          to={build(page + 1)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-foreground text-[10px] font-black uppercase tracking-widest"
        >
          Próxima <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}
