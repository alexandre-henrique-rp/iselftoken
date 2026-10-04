import { formatCurrencyBRL } from "~/lib/currency-format";

interface FinalSummaryCardProps {
  reservationFee: number;
  fastTrackFee: number;
  wantsFastTrack: boolean;
}

export function FinalSummaryCard({ reservationFee, fastTrackFee, wantsFastTrack }: FinalSummaryCardProps) {
  const total = reservationFee + (wantsFastTrack ? fastTrackFee : 0);
  return (
    <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 space-y-4">
      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">
        Total do checkout
      </span>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Reserva de tokens (2%)</dt>
          <dd className="font-black italic text-foreground">{formatCurrencyBRL(reservationFee)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Fast-track</dt>
          <dd className="font-black italic text-foreground">
            {wantsFastTrack ? formatCurrencyBRL(fastTrackFee) : "—"}
          </dd>
        </div>
      </dl>
      <div className="border-t border-white/10 pt-3 flex items-center justify-between">
        <span className="text-sm font-black uppercase tracking-widest text-foreground">Total</span>
        <span className="text-lg font-black italic text-emerald-300">{formatCurrencyBRL(total)}</span>
      </div>
    </div>
  );
}
