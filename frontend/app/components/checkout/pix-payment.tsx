import React from "react";
import { CreditCard, QrCode, ShieldCheck, Lock, Verified, ArrowRight, Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import { Link } from "react-router";

interface PixPaymentProps {
  campaignId?: string | number;
  qrCodeBase64?: string | null;
  copyPastePix?: string | null;
}

function toQrCodeSrc(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
}

export function PixPayment({ campaignId, qrCodeBase64, copyPastePix }: PixPaymentProps) {
  const qrSrc = toQrCodeSrc(qrCodeBase64);
  const pixContinueHref =
    campaignId !== undefined ? `/checkout/${campaignId}/pix` : "#";

  return (
    <div className="space-y-10">
      {/* Payment Method Selector */}
      <div className="flex flex-col md:flex-row gap-4">
        <Link to="../" className="flex-1">
          <div className="flex items-center gap-4 p-6 rounded-2xl bg-accent/20 border-2 border-transparent transition-all hover:bg-accent/30 text-muted-foreground group">
            <CreditCard className="w-6 h-6 transition-colors group-hover:text-primary" />
            <span className="font-black uppercase tracking-widest text-[10px] group-hover:text-primary">Cartão de Crédito</span>
          </div>
        </Link>

        <div className="flex-1 cursor-default">
          <div className="flex items-center gap-4 p-6 rounded-2xl bg-primary/5 border-2 border-primary/40 text-primary">
            <QrCode className="w-6 h-6" />
            <span className="font-black uppercase tracking-widest text-[10px]">PIX</span>
          </div>
        </div>
      </div>

      <div className="glass-card p-8 lg:p-10 rounded-[32px] space-y-10 border border-white/5 shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="text-center space-y-3">
          <p className="text-lg font-black text-foreground tracking-tight">
            {qrSrc ? "Escaneie o QR Code abaixo para pagar via PIX" : "Pagamento via PIX"}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {qrSrc ? "Este QR Code expira em 24 horas" : "QR Code expira em 24 horas após gerado"}
            </span>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="relative p-6 bg-white rounded-[2.5rem] w-64 h-64 flex items-center justify-center shadow-[0_0_60px_rgba(213,0,249,0.2)] border-8 border-black/5">
            {qrSrc ? (
              <img
                src={qrSrc}
                alt="QR Code PIX"
                className={cn("w-full h-full object-contain")}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center relative">
                <QrCode className="w-full h-full text-black/10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-3 rounded-2xl shadow-xl border border-black/5">
                    <div className="w-10 h-10 bg-[#32BCAD] rounded-lg flex items-center justify-center text-white font-black text-xs">PIX</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {copyPastePix ? (
          <div className="space-y-4">
            <div className="flex flex-col space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Copia e Cola</label>
              <div className="flex gap-3">
                <input
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl py-4 px-6 text-foreground text-xs font-mono overflow-hidden text-ellipsis whitespace-nowrap focus:outline-none focus:border-primary/40 transition-all"
                  readOnly
                  type="text"
                  value={copyPastePix}
                />
              </div>
            </div>
          </div>
        ) : (
          <Link
            to={pixContinueHref}
            className="w-full inline-flex items-center justify-center gap-2 kinetic-gradient text-black py-4 px-12 rounded-2xl font-black text-sm tracking-widest uppercase hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
          >
            Continuar para gerar PIX
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Security Info */}
      <div className="flex flex-wrap gap-8 items-center pt-10 border-t border-white/5 opacity-60 justify-center md:justify-start">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Verified className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Pagamento Seguro</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Criptografia SSL</span>
        </div>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Dados Protegidos</span>
        </div>
      </div>
    </div>
  );
}